<?php

namespace Tests\Feature;

use App\Enums\Profil;
use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * La situation portuaire (ADR-0009, ADR-0011, ADR-0013).
 *
 * Ce que ces tests protègent, dans l'ordre de ce qui coûterait le plus cher :
 *
 * 1. la séparation saisir / publier — le conférencier note, un supérieur
 *    valide ; les confondre ferait sortir une conférence non relue ;
 * 2. le verrou de transmission — il ne s'ouvre que sur du publié, avec sa
 *    date ; relâché, il laisserait partir des dossiers sur une prévision ;
 * 3. l'unicité de l'escale et l'unicité du poste — deux lignes pour un même
 *    passage, ou deux navires au même poste, fausseraient le document ;
 * 4. la vue publique — elle ne doit jamais laisser voir un brouillon.
 */
class SituationPortuaireTest extends TestCase
{
    use RefreshDatabase;

    private Port $port;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->port = Port::factory()->create(['code' => 'GAOWE', 'name' => 'Owendo']);
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    private function ligne(array $attributs = []): MouvementNavire
    {
        return MouvementNavire::factory()->create([
            'port_id' => $this->port->id,
            'navire_id' => Navire::factory(),
            ...$attributs,
        ]);
    }

    // ── Accès ────────────────────────────────────────────────────────────

    public function test_l_ecran_est_ferme_a_qui_n_a_pas_la_permission_de_consulter(): void
    {
        // Le Consultant n'a que les statistiques (ADR-0015).
        $this->actingAs($this->interne(Profil::Consultant))
            ->get('/situation-portuaire')
            ->assertForbidden();
    }

    public function test_le_conferencier_ouvre_l_ecran_et_peut_saisir_sans_pouvoir_publier(): void
    {
        $this->actingAs($this->interne(Profil::Conferencier))
            ->get('/situation-portuaire')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('activite/situation-portuaire')
                ->where('droits.renseigner', true)
                ->where('droits.valider', false)
            );
    }

    public function test_le_superviseur_peut_publier(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get('/situation-portuaire')
            ->assertInertia(fn ($page) => $page->where('droits.valider', true));
    }

    public function test_le_conferencier_ne_peut_pas_publier(): void
    {
        $this->ligne();

        $this->actingAs($this->interne(Profil::Conferencier))
            ->post("/situation-portuaire/{$this->port->id}/publication")
            ->assertForbidden();
    }

    public function test_l_agent_depouilleur_consulte_mais_n_ecrit_pas(): void
    {
        $ligne = $this->ligne();

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->patch("/situation-portuaire/{$ligne->id}", [
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Rade->value,
            ])
            ->assertForbidden();
    }

    // ── Inscription d'un navire ──────────────────────────────────────────

    public function test_un_navire_du_referentiel_s_inscrit_a_la_situation(): void
    {
        $navire = Navire::factory()->create();

        $this->actingAs($this->interne(Profil::Conferencier))
            ->post('/situation-portuaire', [
                'port_id' => $this->port->id,
                'navire_id' => $navire->id,
                'voyage' => '26-114S',
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Attendu->value,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('mouvements_navire', [
            'port_id' => $this->port->id,
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            // Née en brouillon : rien ne sort sans validation (ADR-0013).
            'publiee_at' => null,
        ]);
    }

    public function test_la_meme_escale_ne_s_inscrit_pas_deux_fois(): void
    {
        $ligne = $this->ligne(['voyage' => '26-114S']);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->post('/situation-portuaire', [
                'port_id' => $this->port->id,
                'navire_id' => $ligne->navire_id,
                'voyage' => '26-114S',
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Attendu->value,
            ])
            ->assertSessionHasErrors('voyage');

        $this->assertSame(1, MouvementNavire::count());
    }

    public function test_un_poste_deja_occupe_est_refuse(): void
    {
        $poste = PosteQuai::factory()->create(['port_id' => $this->port->id, 'code' => 'M3']);
        $this->ligne([
            'poste_quai_id' => $poste->id,
            'statut' => StatutNavire::Quai,
            'eta' => now()->subDay(),
        ]);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->post('/situation-portuaire', [
                'port_id' => $this->port->id,
                'navire_id' => Navire::factory()->create()->id,
                'voyage' => '26-999',
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Quai->value,
                'poste_quai_id' => $poste->id,
                'eta' => now()->toDateTimeString(),
            ])
            ->assertSessionHasErrors('poste_quai_id');
    }

    public function test_un_poste_d_un_autre_port_est_refuse(): void
    {
        $autrePort = Port::factory()->create(['code' => 'GAPOG']);
        $poste = PosteQuai::factory()->create(['port_id' => $autrePort->id]);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->post('/situation-portuaire', [
                'port_id' => $this->port->id,
                'navire_id' => Navire::factory()->create()->id,
                'voyage' => '26-777',
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Attendu->value,
                'poste_quai_id' => $poste->id,
            ])
            ->assertSessionHasErrors('poste_quai_id');
    }

    public function test_une_escale_incoherente_est_acceptee_a_la_saisie(): void
    {
        // En conférence, on note ce qu'on entend : un navire à quai dont la
        // date d'accostage manque encore s'inscrit — c'est la publication qui
        // la réclamera.
        $this->actingAs($this->interne(Profil::Conferencier))
            ->post('/situation-portuaire', [
                'port_id' => $this->port->id,
                'navire_id' => Navire::factory()->create()->id,
                'voyage' => '26-500',
                'sens' => SensTrafic::Import->value,
                'statut' => StatutNavire::Quai->value,
            ])
            ->assertSessionHasNoErrors();

        $this->assertFalse(MouvementNavire::first()->estCoherente());
    }

    // ── Édition ──────────────────────────────────────────────────────────

    public function test_une_modification_ramene_la_ligne_au_brouillon(): void
    {
        $ligne = $this->ligne(['publiee_at' => now(), 'publiee_par' => null]);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->patch("/situation-portuaire/{$ligne->id}", [
                'sens' => $ligne->sens->value,
                'statut' => StatutNavire::Rade->value,
            ])
            ->assertRedirect();

        $ligne->refresh();

        $this->assertSame(StatutNavire::Rade, $ligne->statut);
        $this->assertNull($ligne->publiee_at);
    }

    public function test_un_depart_anterieur_a_l_arrivee_est_refuse(): void
    {
        $ligne = $this->ligne();

        $this->actingAs($this->interne(Profil::Conferencier))
            ->patch("/situation-portuaire/{$ligne->id}", [
                'sens' => $ligne->sens->value,
                'statut' => StatutNavire::Sorti->value,
                'eta' => '2026-07-09T10:00',
                'etd' => '2026-07-08T10:00',
            ])
            ->assertSessionHasErrors('etd');
    }

    // ── Publication ──────────────────────────────────────────────────────

    public function test_la_publication_est_bloquee_par_une_ligne_incoherente(): void
    {
        // À quai sans date d'accostage : publier laisserait ses dossiers
        // import bloqués sans explication.
        $this->ligne(['statut' => StatutNavire::Quai, 'eta' => null]);

        $this->actingAs($this->interne(Profil::Superviseur))
            ->post("/situation-portuaire/{$this->port->id}/publication")
            ->assertRedirect();

        $this->assertDatabaseCount('mouvements_navire', 1);
        $this->assertNull(MouvementNavire::first()->publiee_at);
    }

    public function test_la_publication_date_les_brouillons_et_nomme_son_auteur(): void
    {
        $superviseur = $this->interne(Profil::Superviseur);
        $this->ligne(['statut' => StatutNavire::Attendu]);
        $this->ligne(['statut' => StatutNavire::Rade]);

        $this->actingAs($superviseur)
            ->post("/situation-portuaire/{$this->port->id}/publication")
            ->assertRedirect();

        $this->assertSame(0, MouvementNavire::query()->brouillon()->count());
        $this->assertSame(2, MouvementNavire::query()->publiee()->count());
        $this->assertSame($superviseur->id, MouvementNavire::first()->publiee_par);
    }

    // ── Verrou de transmission (ADR-0009) ────────────────────────────────

    public function test_le_verrou_import_s_ouvre_a_quai_avec_sa_date_une_fois_publiee(): void
    {
        $ligne = $this->ligne([
            'statut' => StatutNavire::Quai,
            'eta' => now()->subDay(),
            'publiee_at' => now(),
        ]);

        $this->assertTrue($ligne->ouvreLaTransmission(SensTrafic::Import));
        // L'export attend la sortie : même ligne, autre verrou.
        $this->assertFalse($ligne->ouvreLaTransmission(SensTrafic::Export));
    }

    public function test_le_verrou_reste_ferme_tant_que_la_ligne_n_est_pas_publiee(): void
    {
        $ligne = $this->ligne([
            'statut' => StatutNavire::Quai,
            'eta' => now()->subDay(),
            'publiee_at' => null,
        ]);

        $this->assertFalse($ligne->ouvreLaTransmission(SensTrafic::Import));
    }

    public function test_le_verrou_reste_ferme_sans_la_date_du_jalon(): void
    {
        $ligne = $this->ligne([
            'statut' => StatutNavire::Sorti,
            'eta' => now()->subDays(3),
            'etd' => null,
            'publiee_at' => now(),
        ]);

        $this->assertFalse($ligne->ouvreLaTransmission(SensTrafic::Export));
    }

    public function test_le_verrou_import_reste_ouvert_apres_le_jalon(): void
    {
        // Franchi une fois, le jalon ne se referme pas : un navire passé en
        // zone d'exploitation a bien accosté.
        $ligne = $this->ligne([
            'statut' => StatutNavire::ZoneExploitation,
            'eta' => now()->subDays(2),
            'publiee_at' => now(),
        ]);

        $this->assertTrue($ligne->ouvreLaTransmission(SensTrafic::Import));
    }

    // ── Ordre du tableau ─────────────────────────────────────────────────

    public function test_les_lignes_suivent_l_ordre_de_la_frise_et_non_l_alphabet(): void
    {
        // Rangés alphabétiquement, ces statuts sortiraient dans l'ordre
        // attendu → hors_zone → quai → rade → sorti, ce qui n'est l'ordre
        // d'aucune escale.
        $this->ligne(['voyage' => 'V-SORTI', 'statut' => StatutNavire::Sorti, 'etd' => now()]);
        $this->ligne(['voyage' => 'V-RADE', 'statut' => StatutNavire::Rade]);
        $this->ligne(['voyage' => 'V-ATTENDU', 'statut' => StatutNavire::Attendu]);
        $this->ligne(['voyage' => 'V-QUAI', 'statut' => StatutNavire::Quai, 'eta' => now()]);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->get('/situation-portuaire')
            ->assertInertia(fn ($page) => $page
                ->where('mouvements.0.voyage', 'V-ATTENDU')
                ->where('mouvements.1.voyage', 'V-RADE')
                ->where('mouvements.2.voyage', 'V-QUAI')
                ->where('mouvements.3.voyage', 'V-SORTI')
            );
    }

    // ── Export PDF sur période ───────────────────────────────────────────

    public function test_l_export_produit_un_pdf(): void
    {
        $this->ligne(['statut' => StatutNavire::Quai, 'eta' => now()]);

        $reponse = $this->actingAs($this->interne(Profil::Conferencier))
            ->get("/situation-portuaire/{$this->port->id}/export?du=".now()->subMonth()->toDateString().'&au='.now()->addMonth()->toDateString());

        $reponse->assertOk();
        $this->assertSame('application/pdf', $reponse->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $reponse->getContent());
    }

    public function test_l_export_exige_une_periode(): void
    {
        $this->actingAs($this->interne(Profil::Conferencier))
            ->get("/situation-portuaire/{$this->port->id}/export")
            ->assertSessionHasErrors(['du', 'au']);
    }

    public function test_l_export_refuse_une_periode_inversee(): void
    {
        $this->actingAs($this->interne(Profil::Conferencier))
            ->get("/situation-portuaire/{$this->port->id}/export?du=2026-08-31&au=2026-08-01")
            ->assertSessionHasErrors('au');
    }

    public function test_le_nom_du_fichier_porte_le_port_et_la_periode(): void
    {
        $this->ligne(['statut' => StatutNavire::Quai, 'eta' => '2026-08-10 08:00']);

        $this->actingAs($this->interne(Profil::Conferencier))
            ->get("/situation-portuaire/{$this->port->id}/export?du=2026-08-01&au=2026-08-31")
            ->assertDownload('situation-portuaire-owendo-2026-08-01-2026-08-31.pdf');
    }

    /**
     * Le contenu retenu se vérifie sur la requête, pas sur le binaire : un PDF
     * compresse ses chaînes, et y chercher un nom de navire testerait dompdf
     * plutôt que notre règle de période.
     */
    public function test_la_periode_retient_les_escales_qui_la_touchent(): void
    {
        // Encadre la période de part et d'autre : le navire était là.
        $encadre = $this->ligne([
            'voyage' => 'V-ENCADRE',
            'statut' => StatutNavire::Sorti,
            'eta' => '2026-07-25 08:00',
            'etd' => '2026-08-20 08:00',
        ]);
        // Escale ouverte, commencée avant : le navire n'est jamais reparti.
        $ouverte = $this->ligne([
            'voyage' => 'V-OUVERTE',
            'statut' => StatutNavire::Quai,
            'eta' => '2026-07-10 08:00',
            'etd' => null,
        ]);
        // Commence dans la fenêtre, se termine après.
        $chevauche = $this->ligne([
            'voyage' => 'V-CHEVAUCHE',
            'statut' => StatutNavire::Sorti,
            'eta' => '2026-08-28 08:00',
            'etd' => '2026-09-04 08:00',
        ]);
        // Entièrement après la fenêtre.
        $this->ligne([
            'voyage' => 'V-APRES',
            'statut' => StatutNavire::Attendu,
            'eta' => '2026-09-15 08:00',
        ]);
        // Entièrement avant.
        $this->ligne([
            'voyage' => 'V-AVANT',
            'statut' => StatutNavire::Sorti,
            'eta' => '2026-06-01 08:00',
            'etd' => '2026-06-10 08:00',
        ]);
        // Sans aucune date : elle n'appartient à aucune période.
        $this->ligne(['voyage' => 'V-SANS-DATE', 'statut' => StatutNavire::Attendu]);

        $retenues = MouvementNavire::query()
            ->dansLaPeriode(Carbon::parse('2026-08-01')->startOfDay(), Carbon::parse('2026-08-31')->endOfDay())
            ->pluck('id');

        $this->assertEqualsCanonicalizing(
            [$encadre->id, $ouverte->id, $chevauche->id],
            $retenues->all(),
        );
    }

    // ── Vue publique (ADR-0011) ──────────────────────────────────────────

    public function test_la_situation_publique_s_ouvre_sans_connexion(): void
    {
        $this->get('/situation-portuaire-publique')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('situation-portuaire-publique'));
    }

    public function test_la_situation_publique_ne_montre_que_les_lignes_publiees(): void
    {
        $publiee = $this->ligne(['voyage' => '26-PUB', 'publiee_at' => now()]);
        $this->ligne(['voyage' => '26-BROUILLON', 'publiee_at' => null]);

        $this->get('/situation-portuaire-publique?port=GAOWE')
            ->assertInertia(fn ($page) => $page
                ->has('mouvements', 1)
                ->where('mouvements.0.id', $publiee->id)
            );
    }
}
