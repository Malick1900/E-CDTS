<?php

namespace Tests\Feature;

use App\Enums\EtapeDossier;
use App\Enums\EtatManifeste;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Models\BaremeLigne;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;
use App\Models\Navire;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\BaremeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * L'écran du manifeste : ce qu'il montre, et le seul geste qui en part.
 *
 * Ce que ces tests protègent :
 *
 * 1. **qui qualifie** — le consignataire déclare, le CGC instruit (ADR-0007).
 *    Laisser un interne CGC écrire ici lui ferait porter une déclaration qu'il
 *    doit contrôler ;
 * 2. **le verrou de la transmission** — après transmission, plus rien ne bouge
 *    côté consignataire (WF4). Sans ce verrou, un dossier pourrait changer sous
 *    les yeux de l'agent qui le dépouille ;
 * 3. **le périmètre** — une ligne d'un autre manifeste n'est pas interdite,
 *    elle n'existe pas ;
 * 4. **la nomenclature bornée au sens** — proposer « bois » à l'import mènerait
 *    à une qualification sans tarif.
 */
class ManifesteEcranTest extends TestCase
{
    use RefreshDatabase;

    private Port $port;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(BaremeSeeder::class);

        $this->port = Port::factory()->create([
            'code' => 'GAOWE',
            'name' => 'Owendo',
            'prefixe_numerotation' => 'OWD',
        ]);
    }

    private function agentDe(Consignataire $consignataire): User
    {
        $agent = User::factory()->create(['consignataire_id' => $consignataire->id]);
        $agent->syncRoles([RoleClient::Agent->value]);

        return $agent;
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    private function escale(Consignataire $consignataire, SensTrafic $sens = SensTrafic::Import): Escale
    {
        return Escale::factory()->create([
            'consignataire_id' => $consignataire->id,
            'navire_id' => Navire::factory(),
            'port_id' => $this->port->id,
            'sens' => $sens,
            'etape' => EtapeDossier::Manifeste,
        ]);
    }

    /** Un manifeste à deux boîtes qualifiées et une part vrac qui ne l'est pas. */
    private function manifeste(Escale $escale): Manifeste
    {
        $manifeste = Manifeste::factory()->create(['escale_id' => $escale->id]);

        $conteneurise = ManifesteBl::factory()->create([
            'manifeste_id' => $manifeste->id,
            'reference' => 'GABX-260001',
            'ligne_numero' => 1,
            'description' => 'Riz blanc en sacs de 25 kg',
            'poids_brut_kg' => 48_000,
        ]);

        ManifesteConteneur::factory()->count(2)->create([
            'manifeste_bl_id' => $conteneurise->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::Conteneur40S,
        ]);

        ManifesteBl::factory()->create([
            'manifeste_id' => $manifeste->id,
            'reference' => 'GABX-260002',
            'ligne_numero' => 2,
            'description' => 'Clinker en vrac',
            'poids_brut_kg' => 300_000,
            'volume_m3' => 400,
            'hors_conteneur' => true,
            'type_marchandise' => null,
        ]);

        return $manifeste;
    }

    private function url(Escale $escale): string
    {
        return "/dossiers/{$escale->id}/manifeste";
    }

    // ── Ce que l'écran montre ────────────────────────────────────────────

    public function test_sans_manifeste_l_ecran_propose_les_deux_voies(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('activite/dossier-manifeste')
                ->where('manifeste', null));
    }

    public function test_avec_manifeste_l_ecran_deroule_le_tableau_et_ses_totaux(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('manifeste.totaux.lignes', 3)
                ->where('manifeste.totaux.bls', 2)
                ->where('manifeste.totaux.conteneurs', 2)
                ->where('manifeste.totaux.qualifiees', 2)
                ->where('manifeste.totaux.aQualifier', 1)
                ->where('manifeste.totaux.transmissible', false)
                // Deux forfaits 40′ import à 30 016,59.
                ->where('manifeste.totaux.montant', 60_034)
                ->has('manifeste.lignes', 3));
    }

    public function test_la_nomenclature_proposee_se_borne_au_sens_du_dossier(): void
    {
        $societe = Consignataire::factory()->create();

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($this->escale($societe, SensTrafic::Import)))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('types', count(BaremeLigne::typesFacturables(SensTrafic::Import)))
                ->where('types', fn ($types) => collect($types)
                    ->pluck('value')
                    // Le bois ne se facture qu'à l'export ; les hydrocarbures
                    // ne se facturent pas du tout pour l'instant.
                    ->doesntContain('bois_conventionnel')
                    && collect($types)
                        ->pluck('value')
                        ->doesntContain('derives_hydrocarbures')));

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($this->escale($societe, SensTrafic::Export)))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('types', fn ($types) => collect($types)
                    ->pluck('value')
                    ->doesntContain('autres_emballages')));
    }

    public function test_le_filtre_a_qualifier_ne_garde_que_les_lignes_en_l_air(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale).'?type=a-qualifier')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('manifeste.total', 1)
                ->where('manifeste.totalLignes', 3)
                // Les totaux, eux, portent sur tout le manifeste.
                ->where('manifeste.totaux.lignes', 3));
    }

    public function test_la_recherche_porte_sur_le_bl_la_boite_et_la_marchandise(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale).'?q=clinker')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('manifeste.total', 1));

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale).'?q=GABX-260001')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('manifeste.total', 2));
    }

    public function test_un_filtre_inconnu_ne_filtre_rien_plutot_que_de_casser_l_ecran(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale).'?type=nawak&parPage=7&page=99')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('manifeste.total', 3)
                ->where('manifeste.filtres.type', 'all')
                ->where('manifeste.parPage', 25)
                ->where('manifeste.page', 1));
    }

    // ── Le geste de qualification ────────────────────────────────────────

    public function test_le_consignataire_qualifie_une_ligne_et_le_montant_suit(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $manifeste = $this->manifeste($escale);
        $vrac = $manifeste->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$vrac->id}",
                'type' => TypeMarchandise::VracSolide->value,
            ])
            ->assertRedirect();

        $this->assertSame(TypeMarchandise::VracSolide, $vrac->fresh()?->type_marchandise);

        // 400 m³ à 984 F l'emportent sur 300 t à 1 312 F : l'unité payante.
        $this->actingAs($this->agentDe($societe))
            ->get($this->url($escale))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('manifeste.totaux.aQualifier', 0)
                ->where('manifeste.totaux.transmissible', true)
                ->where('manifeste.totaux.montant', 60_034 + 393_600));
    }

    public function test_une_ligne_se_remet_a_qualifier(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $manifeste = $this->manifeste($escale);
        $boite = ManifesteConteneur::query()
            ->whereHas('bl', fn ($q) => $q->where('manifeste_id', $manifeste->id))
            ->firstOrFail();

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "c:{$boite->id}",
                'type' => null,
            ])
            ->assertRedirect();

        $this->assertNull($boite->fresh()?->type_marchandise);
    }

    public function test_un_interne_cgc_ne_qualifie_pas_a_la_place_du_consignataire(): void
    {
        // ADR-0007 : le consignataire déclare, le CGC contrôle. Sa
        // requalification appartient au dépouillement, avec sa propre trace.
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $manifeste = $this->manifeste($escale);
        $vrac = $manifeste->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$vrac->id}",
                'type' => TypeMarchandise::VracSolide->value,
            ])
            ->assertForbidden();

        $this->assertNull($vrac->fresh()?->type_marchandise);
    }

    public function test_un_manifeste_transmis_ne_se_qualifie_plus(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $manifeste = $this->manifeste($escale);
        $manifeste->update(['etat' => EtatManifeste::Transmis]);
        $vrac = $manifeste->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$vrac->id}",
                'type' => TypeMarchandise::VracSolide->value,
            ])
            ->assertForbidden();

        $this->assertNull($vrac->fresh()?->type_marchandise);
    }

    public function test_une_ligne_d_un_autre_manifeste_n_existe_pas(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        // Le BL d'un dossier voisin, visé depuis celui-ci.
        $ailleurs = $this->escale($societe);
        $voisin = $this->manifeste($ailleurs);
        $cible = $voisin->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$cible->id}",
                'type' => TypeMarchandise::VracSolide->value,
            ])
            ->assertNotFound();

        $this->assertNull($cible->fresh()?->type_marchandise);
    }

    public function test_une_cle_malformee_est_refusee(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $this->manifeste($escale);

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => 'x:1',
                'type' => null,
            ])
            ->assertSessionHasErrors('cle');
    }

    public function test_un_type_hors_nomenclature_est_refuse(): void
    {
        $societe = Consignataire::factory()->create();
        $escale = $this->escale($societe);
        $manifeste = $this->manifeste($escale);
        $vrac = $manifeste->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->agentDe($societe))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$vrac->id}",
                'type' => 'contrebande',
            ])
            ->assertSessionHasErrors('type');
    }

    public function test_la_qualification_ne_touche_pas_le_dossier_d_une_autre_societe(): void
    {
        $sienne = Consignataire::factory()->create();
        $autre = Consignataire::factory()->create();
        $escale = $this->escale($autre);
        $manifeste = $this->manifeste($escale);
        $vrac = $manifeste->bls()->where('reference', 'GABX-260002')->firstOrFail();

        $this->actingAs($this->agentDe($sienne))
            ->patch($this->url($escale).'/qualification', [
                'cle' => "v:{$vrac->id}",
                'type' => TypeMarchandise::VracSolide->value,
            ])
            ->assertNotFound();
    }
}
