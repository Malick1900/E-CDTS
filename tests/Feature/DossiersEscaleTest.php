<?php

namespace Tests\Feature;

use App\Enums\EtapeDossier;
use App\Enums\ModeExploitation;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Enums\SensTrafic;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\Navire;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * L'écran d'accueil des dossiers d'escale (ADR-0008, ADR-0009, ADR-0041).
 *
 * Ce que ces tests protègent, dans l'ordre de ce qui coûterait le plus cher :
 *
 * 1. le périmètre — un consignataire qui verrait les dossiers d'un concurrent
 *    serait une fuite commerciale, pas un défaut d'affichage ;
 * 2. l'unicité du passage — deux dossiers pour un même voyage et un même sens
 *    donneraient deux liquidations pour une seule cargaison ;
 * 3. la normalisation du voyage — la clé de rapprochement d'ADR-0009 ; laissée
 *    à la main de l'appelant, elle finirait par diverger et les dossiers
 *    resteraient orphelins en silence ;
 * 4. les deux identités d'ADR-0008 — la référence stable ne bouge pas, le
 *    numéro affiché reste provisoire tant qu'aucun manifeste n'est rattaché.
 */
class DossiersEscaleTest extends TestCase
{
    use RefreshDatabase;

    private Port $port;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->port = Port::factory()->create([
            'code' => 'GAOWE',
            'name' => 'Owendo',
            'prefixe_numerotation' => 'OWD',
        ]);
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    private function agentDe(Consignataire $consignataire): User
    {
        $agent = User::factory()->create(['consignataire_id' => $consignataire->id]);
        $agent->syncRoles([RoleClient::Agent->value]);

        return $agent;
    }

    /**
     * Une ouverture valide, dont on ne surcharge que ce qu'on veut éprouver.
     *
     * @param  array<string, mixed>  $attributs
     * @return array<string, mixed>
     */
    private function ouverture(array $attributs = []): array
    {
        return [
            'sens' => SensTrafic::Import->value,
            'navire_id' => Navire::factory()->create()->id,
            'voyage' => '26-114S',
            'port_id' => $this->port->id,
            ...$attributs,
        ];
    }

    /** @param  array<string, mixed>  $attributs */
    private function dossier(Consignataire $consignataire, array $attributs = []): Escale
    {
        return Escale::factory()->create([
            'consignataire_id' => $consignataire->id,
            'navire_id' => Navire::factory(),
            'port_id' => $this->port->id,
            ...$attributs,
        ]);
    }

    // ── Accès ────────────────────────────────────────────────────────────

    public function test_l_ecran_est_ferme_a_qui_n_a_pas_la_permission_de_consulter(): void
    {
        // Le Conférencier ne fait que la situation portuaire (ADR-0015).
        $this->actingAs($this->interne(Profil::Conferencier))
            ->get('/dossiers')
            ->assertForbidden();
    }

    public function test_l_ecran_s_ouvre_a_un_agent_consignataire(): void
    {
        $societe = Consignataire::factory()->create();

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('activite/dossiers'));
    }

    // ── Périmètre ────────────────────────────────────────────────────────

    public function test_un_consignataire_ne_voit_que_les_dossiers_de_sa_societe(): void
    {
        $sienne = Consignataire::factory()->create(['name' => 'SAGA Gabon']);
        $autre = Consignataire::factory()->create(['name' => 'SDV Gabon']);

        $this->dossier($sienne, ['voyage' => '26-114S']);
        $this->dossier($autre, ['voyage' => '26-118N']);

        $this->actingAs($this->agentDe($sienne))
            ->get('/dossiers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('total', 1)
                ->where('dossiers.0.voyage', '26-114S')
                ->where('resume.tous', 1)
                ->where('perimetre', 'SAGA Gabon'));
    }

    public function test_le_perimetre_est_la_societe_et_non_la_personne_qui_a_ouvert(): void
    {
        $societe = Consignataire::factory()->create();
        $collegue = $this->agentDe($societe);

        $this->dossier($societe, ['ouvert_par' => $collegue->id]);

        // Un autre agent de la même société voit le dossier de son collègue :
        // le dossier appartient à la société (ADR-0014).
        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('total', 1));
    }

    public function test_un_interne_cgc_voit_les_dossiers_de_tous_les_consignataires(): void
    {
        $this->dossier(Consignataire::factory()->create());
        $this->dossier(Consignataire::factory()->create());

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->get('/dossiers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('total', 2)
                ->where('perimetre', 'tous consignataires'));
    }

    // ── Ouverture ────────────────────────────────────────────────────────

    public function test_seul_un_compte_client_se_voit_offrir_l_ouverture_d_un_dossier(): void
    {
        $societe = Consignataire::factory()->create();

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers')
            ->assertInertia(fn ($page) => $page->where('peutOuvrir', true));

        // Le CGC instruit les dossiers, il ne les ouvre pas (WF3).
        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->get('/dossiers')
            ->assertInertia(fn ($page) => $page->where('peutOuvrir', false));
    }

    public function test_l_ecran_d_ouverture_est_ferme_a_un_interne_cgc(): void
    {
        // Il n'a aucune société au nom de laquelle déclarer (WF3).
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get('/dossiers/nouveau')
            ->assertForbidden();

        $this->actingAs($this->interne(Profil::Superviseur))
            ->post('/dossiers', $this->ouverture())
            ->assertForbidden();
    }

    public function test_un_consignataire_ouvre_un_dossier(): void
    {
        $societe = Consignataire::factory()->create();
        $agent = $this->agentDe($societe);
        $navire = Navire::factory()->create();

        $this->actingAs($agent)
            ->post('/dossiers', $this->ouverture([
                'navire_id' => $navire->id,
                'voyage' => '26-114S',
                'sens' => SensTrafic::Import->value,
            ]))
            ->assertRedirect();

        $escale = Escale::sole();

        // Le dossier appartient à la société, la personne n'en est que l'auteur.
        $this->assertSame($societe->id, $escale->consignataire_id);
        $this->assertSame($agent->id, $escale->ouvert_par);
        $this->assertSame(EtapeDossier::Ouvert, $escale->etape);
        // La référence naît tout de suite, le numéro affiché non (ADR-0008).
        $this->assertSame('ESC-OWD-'.now()->format('y').'-0001', $escale->reference);
        $this->assertNull($escale->numero_affiche);
        $this->assertNull($escale->montant_liquide);
    }

    public function test_le_mode_d_exploitation_decoule_du_navire_quelle_que_soit_la_porte(): void
    {
        // La recopie est un crochet de modèle, pas un geste de contrôleur : le
        // seeder, les factories et les imports à venir n'ont pas à s'en
        // souvenir. Deux dossiers du jeu de démonstration étaient nés sans mode
        // alors que leur navire en portait un.
        $navire = Navire::factory()->create([
            'mode_exploitation_defaut' => ModeExploitation::Tramping,
        ]);

        $escale = Escale::factory()->create([
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
        ]);

        $this->assertSame(ModeExploitation::Tramping, $escale->mode_exploitation);
    }

    public function test_un_navire_sans_mode_ouvre_un_dossier_en_ligne_reguliere(): void
    {
        // Le référentiel peut taire le mode d'un navire ; le dossier, lui, ne
        // le peut pas : à défaut, c'est la ligne régulière (CGC, 2026-08-27).
        // Le tramping est l'exception qu'on déclare, pas le doute qu'on laisse.
        $navire = Navire::factory()->create([
            'mode_exploitation_defaut' => null,
        ]);

        $escale = Escale::factory()->create([
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
        ]);

        $this->assertSame(ModeExploitation::LigneReguliere, $escale->mode_exploitation);
    }

    public function test_un_mode_pose_explicitement_n_est_pas_ecrase_par_celui_du_navire(): void
    {
        // La valeur effective d'une escale appartient au CGC : elle autorise
        // l'exception ponctuelle sans altérer les autres escales du navire.
        $navire = Navire::factory()->create([
            'mode_exploitation_defaut' => ModeExploitation::LigneReguliere,
        ]);

        $escale = Escale::factory()->create([
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
            'mode_exploitation' => ModeExploitation::Tramping,
        ]);

        $this->assertSame(ModeExploitation::Tramping, $escale->mode_exploitation);
    }

    public function test_le_mode_d_exploitation_et_l_armement_sont_recopies_du_navire(): void
    {
        $societe = Consignataire::factory()->create();
        $armement = Armement::factory()->create();
        $navire = Navire::factory()->create([
            'armement_id' => $armement->id,
            'mode_exploitation_defaut' => ModeExploitation::Tramping,
        ]);

        $this->actingAs($this->agentDe($societe))
            ->post('/dossiers', $this->ouverture(['navire_id' => $navire->id]))
            ->assertRedirect();

        $escale = Escale::sole();

        // Recopié, pas lu chez le navire : c'est l'escale qui fait foi pour la
        // facturation (ENTITES §2).
        $this->assertSame(ModeExploitation::Tramping, $escale->mode_exploitation);
        $this->assertSame($armement->id, $escale->armement_id);
    }

    public function test_le_meme_voyage_ne_se_rouvre_pas_et_l_erreur_nomme_le_dossier_existant(): void
    {
        $societe = Consignataire::factory()->create();
        $navire = Navire::factory()->create();

        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'sens' => SensTrafic::Import,
            'reference' => 'ESC-OWD-26-0342',
        ]);

        $this->actingAs($this->agentDe($societe))
            ->post('/dossiers', $this->ouverture([
                'navire_id' => $navire->id,
                // Même voyage, autrement écrit : la clé normalisée les réunit.
                'voyage' => '26-114 s',
                'sens' => SensTrafic::Import->value,
            ]))
            ->assertSessionHasErrors('voyage');

        $this->assertStringContainsString(
            'ESC-OWD-26-0342',
            session('errors')->first('voyage'),
        );
        $this->assertSame(1, Escale::count());
    }

    public function test_un_poste_d_un_autre_port_est_refuse(): void
    {
        $societe = Consignataire::factory()->create();
        $autrePort = Port::factory()->create(['code' => 'GAPOG']);
        $poste = PosteQuai::factory()->create(['port_id' => $autrePort->id]);

        $this->actingAs($this->agentDe($societe))
            ->post('/dossiers', $this->ouverture(['poste_quai_id' => $poste->id]))
            ->assertSessionHasErrors('poste_quai_id');
    }

    public function test_la_confirmation_ne_montre_pas_le_dossier_d_une_autre_societe(): void
    {
        $sienne = Consignataire::factory()->create();
        $autre = Consignataire::factory()->create();
        $dossier = $this->dossier($autre);

        $this->actingAs($this->agentDe($sienne))
            ->get('/dossiers/nouveau?ouvert='.$dossier->id)
            ->assertOk()
            // Pas de 404 qui révélerait l'existence du dossier : l'écran
            // retombe simplement sur le formulaire.
            ->assertInertia(fn ($page) => $page->where('ouvert', null));
    }

    // ── Filtres ──────────────────────────────────────────────────────────

    public function test_le_filtre_en_cours_regroupe_les_trois_etapes_de_circulation(): void
    {
        $societe = Consignataire::factory()->create();

        $this->dossier($societe, ['etape' => EtapeDossier::Ouvert]);
        $this->dossier($societe, ['etape' => EtapeDossier::Manifeste]);
        $this->dossier($societe, ['etape' => EtapeDossier::Depouillement]);
        $this->dossier($societe, ['etape' => EtapeDossier::Devis]);
        $this->dossier($societe, ['etape' => EtapeDossier::Cloture]);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?etape=en-cours')
            ->assertInertia(fn ($page) => $page
                ->where('total', 3)
                ->where('filtres.etape', 'en-cours')
                ->where('resume.enCours', 3)
                ->where('resume.tous', 5));
    }

    public function test_un_filtre_d_etape_inconnu_ne_filtre_rien_plutot_que_de_casser_l_ecran(): void
    {
        $societe = Consignataire::factory()->create();
        $this->dossier($societe);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?etape=n-importe-quoi')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('total', 1)
                ->where('filtres.etape', 'all'));
    }

    public function test_la_recherche_trouve_par_navire_par_voyage_et_par_reference(): void
    {
        $societe = Consignataire::factory()->create();
        $navire = Navire::factory()->create(['name' => 'Maersk Cadiz']);

        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'reference' => 'ESC-OWD-26-0342',
        ]);
        $this->dossier($societe, ['voyage' => '99-999X']);

        $agent = $this->agentDe($societe);

        foreach (['maersk', '26-114s', 'esc-owd-26-0342'] as $terme) {
            $this->actingAs($agent)
                ->get('/dossiers?q='.urlencode($terme))
                ->assertInertia(fn ($page) => $page
                    ->where('total', 1)
                    ->where('dossiers.0.voyage', '26-114S'));
        }
    }

    public function test_la_recherche_par_voyage_ignore_la_casse_et_les_espaces(): void
    {
        $societe = Consignataire::factory()->create();
        $this->dossier($societe, ['voyage' => '26-114S']);

        // La clé normalisée d'ADR-0009 : le consignataire retrouve son dossier
        // qu'il tape « 26-114 s » ou « 26-114S ».
        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?q='.urlencode('26-114 s'))
            ->assertInertia(fn ($page) => $page->where('total', 1));
    }

    // ── Montants ─────────────────────────────────────────────────────────

    public function test_le_total_liquide_ne_compte_que_les_dossiers_factures_et_clotures(): void
    {
        $societe = Consignataire::factory()->create();

        $this->dossier($societe, ['etape' => EtapeDossier::Facture, 'montant_liquide' => 4_320_000]);
        $this->dossier($societe, ['etape' => EtapeDossier::Cloture, 'montant_liquide' => 3_875_200]);
        // Un devis peut encore bouger : son montant n'est pas opposable.
        $this->dossier($societe, ['etape' => EtapeDossier::Devis, 'montant_liquide' => 9_999_999]);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers')
            ->assertInertia(fn ($page) => $page->where('liquide', 8_195_200));
    }

    public function test_le_total_liquide_suit_le_filtrage_et_non_la_page_affichee(): void
    {
        $societe = Consignataire::factory()->create();

        $this->dossier($societe, [
            'sens' => SensTrafic::Import,
            'etape' => EtapeDossier::Cloture,
            'montant_liquide' => 1_000_000,
        ]);
        $this->dossier($societe, [
            'sens' => SensTrafic::Export,
            'etape' => EtapeDossier::Cloture,
            'montant_liquide' => 500_000,
        ]);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?sens=import')
            ->assertInertia(fn ($page) => $page
                ->where('total', 1)
                ->where('liquide', 1_000_000));
    }

    // ── Pagination ───────────────────────────────────────────────────────

    public function test_la_liste_est_paginee_et_le_total_reste_celui_du_perimetre(): void
    {
        $societe = Consignataire::factory()->create();
        Escale::factory()->count(18)->create([
            'consignataire_id' => $societe->id,
            'port_id' => $this->port->id,
        ]);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers')
            ->assertInertia(fn ($page) => $page
                ->has('dossiers', 15)
                ->where('total', 18));

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?page=2')
            ->assertInertia(fn ($page) => $page
                ->has('dossiers', 3)
                ->where('page', 2));
    }

    // ── Modèle ───────────────────────────────────────────────────────────

    public function test_le_voyage_se_normalise_seul_a_l_enregistrement(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->dossier($societe, ['voyage' => ' 26-114 s ']);

        // MAJUSCULES, espaces supprimés, tiret conservé (ADR-0009).
        $this->assertSame('26-114S', $escale->fresh()->voyage_normalise);
    }

    public function test_le_meme_passage_ne_s_ouvre_pas_deux_fois_pour_le_meme_sens(): void
    {
        $societe = Consignataire::factory()->create();
        $navire = Navire::factory()->create();

        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'sens' => SensTrafic::Import,
        ]);

        $this->expectException(QueryException::class);

        // Même forme normalisée : c'est bien le même voyage, autrement écrit.
        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114 s',
            'sens' => SensTrafic::Import,
        ]);
    }

    public function test_import_et_export_du_meme_passage_font_deux_dossiers(): void
    {
        $societe = Consignataire::factory()->create();
        $navire = Navire::factory()->create();

        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'sens' => SensTrafic::Import,
        ]);
        $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'sens' => SensTrafic::Export,
        ]);

        // Un dossier par sens, chacun avec son verrou (WF3).
        $this->assertSame(2, Escale::count());
    }

    public function test_le_numero_affiche_reste_provisoire_tant_qu_aucun_manifeste_n_est_rattache(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->dossier($societe, ['reference' => 'ESC-OWD-26-0342']);

        $this->assertTrue($escale->numeroProvisoire());
        $this->assertSame('ESC-OWD-26-0342', $escale->libelle());

        // Au rattachement, le libellé devient le n° de manifeste — la référence
        // interne, elle, ne bouge pas (ADR-0008).
        $escale->numero_affiche = '2026 M 12429';
        $escale->save();

        $this->assertFalse($escale->numeroProvisoire());
        $this->assertSame('2026 M 12429', $escale->libelle());
        $this->assertSame('ESC-OWD-26-0342', $escale->fresh()->reference);
    }

    public function test_la_reference_suit_une_sequence_par_port_et_par_annee(): void
    {
        $autre = Port::factory()->create(['code' => 'GAPOG', 'prefixe_numerotation' => 'POG']);
        $annee = now()->format('y');

        $this->assertSame("ESC-OWD-{$annee}-0001", Escale::referenceSuivante($this->port));

        Escale::factory()->create([
            'reference' => "ESC-OWD-{$annee}-0001",
            'port_id' => $this->port->id,
        ]);

        $this->assertSame("ESC-OWD-{$annee}-0002", Escale::referenceSuivante($this->port));
        // Chaque port compte pour lui-même.
        $this->assertSame("ESC-POG-{$annee}-0001", Escale::referenceSuivante($autre));
    }
}
