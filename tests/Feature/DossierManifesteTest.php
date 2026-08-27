<?php

namespace Tests\Feature;

use App\Enums\EtapeDossier;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Enums\SensTrafic;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * L'aiguillage d'un dossier vers son étape, et l'écran du manifeste (WF4/WF5).
 *
 * Ce que ces tests protègent :
 *
 * 1. le périmètre — un dossier d'une autre société n'est pas « interdit », il
 *    n'existe pas ; l'aiguillage comme l'écran doivent rendre 404, sans quoi
 *    l'URL devient un annuaire des concurrents ;
 * 2. l'aiguillage lui-même — cliquer un dossier mène à l'étape où il en est,
 *    et une étape sans écran ramène à la liste plutôt que de casser ;
 * 3. la frontière de l'écran — le manifeste n'ouvre pas un dossier déjà
 *    facturé sous couvert d'URL ;
 * 4. la provenance des dates (ADR-0009) — la bannière lit l'ETA réelle à la
 *    situation portuaire quand le dossier est rapproché, et l'ETA annoncée à
 *    l'ouverture sinon. Les confondre reviendrait à opposer au consignataire
 *    une date qu'il a lui-même déclarée.
 */
class DossierManifesteTest extends TestCase
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

    /**
     * @param  array<string, mixed>  $attributs
     */
    private function dossier(Consignataire $consignataire, array $attributs = []): Escale
    {
        return Escale::factory()->create([
            'consignataire_id' => $consignataire->id,
            'navire_id' => Navire::factory(),
            'port_id' => $this->port->id,
            ...$attributs,
        ]);
    }

    // ── L'aiguillage ─────────────────────────────────────────────────────

    public function test_les_trois_premieres_etapes_menent_a_l_ecran_du_manifeste(): void
    {
        $societe = Consignataire::factory()->create();
        $agent = $this->agentDe($societe);

        foreach ([EtapeDossier::Ouvert, EtapeDossier::Manifeste, EtapeDossier::Depouillement] as $etape) {
            $dossier = $this->dossier($societe, ['etape' => $etape]);

            $this->actingAs($agent)
                ->get("/dossiers/{$dossier->id}")
                ->assertRedirect("/dossiers/{$dossier->id}/manifeste");
        }
    }

    public function test_une_etape_sans_ecran_ramene_a_la_liste_en_disant_ou_en_est_le_dossier(): void
    {
        $societe = Consignataire::factory()->create();
        $dossier = $this->dossier($societe, ['etape' => EtapeDossier::Facture]);

        // Le message nomme le dossier ET l'étape : sans quoi le retour à la
        // liste passerait pour un clic manqué. Il est porté par le flash
        // Inertia, qu'on lit ici en session — le pilote de session des tests
        // ne survit pas d'une requête à l'autre.
        $this->actingAs($this->agentDe($societe))
            ->get("/dossiers/{$dossier->id}")
            ->assertRedirect('/dossiers')
            ->assertSessionHas('inertia.flash_data.toast.type', 'info')
            ->assertSessionHas(
                'inertia.flash_data.toast.message',
                "Dossier {$dossier->libelle()} — l'écran de l'étape « Facturé » n'est pas encore ouvert.",
            );
    }

    public function test_l_aiguillage_ne_reconnait_pas_le_dossier_d_une_autre_societe(): void
    {
        $sienne = Consignataire::factory()->create();
        $autre = Consignataire::factory()->create();
        $dossier = $this->dossier($autre);

        $this->actingAs($this->agentDe($sienne))
            ->get("/dossiers/{$dossier->id}")
            ->assertNotFound();
    }

    public function test_un_interne_cgc_aiguille_le_dossier_de_n_importe_quel_consignataire(): void
    {
        $dossier = $this->dossier(Consignataire::factory()->create());

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->get("/dossiers/{$dossier->id}")
            ->assertRedirect("/dossiers/{$dossier->id}/manifeste");
    }

    public function test_la_liste_n_ouvre_que_les_lignes_dont_l_etape_a_un_ecran(): void
    {
        $societe = Consignataire::factory()->create();
        $this->dossier($societe, ['etape' => EtapeDossier::Manifeste, 'voyage' => '26-114S']);
        $this->dossier($societe, ['etape' => EtapeDossier::Cloture, 'voyage' => '26-118N']);

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?q=26-114S')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('dossiers.0.ouvrable', true));

        $this->actingAs($this->agentDe($societe))
            ->get('/dossiers?q=26-118N')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('dossiers.0.ouvrable', false));
    }

    // ── L'écran du manifeste ─────────────────────────────────────────────

    public function test_l_ecran_est_ferme_a_qui_n_a_pas_la_permission_de_consulter(): void
    {
        $dossier = $this->dossier(Consignataire::factory()->create());

        // Le Conférencier ne fait que la situation portuaire (ADR-0015).
        $this->actingAs($this->interne(Profil::Conferencier))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertForbidden();
    }

    public function test_l_ecran_ne_montre_pas_le_dossier_d_une_autre_societe(): void
    {
        $sienne = Consignataire::factory()->create();
        $dossier = $this->dossier(Consignataire::factory()->create());

        $this->actingAs($this->agentDe($sienne))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertNotFound();
    }

    public function test_l_ecran_refuse_une_etape_qui_n_est_pas_la_sienne(): void
    {
        $societe = Consignataire::factory()->create();
        $dossier = $this->dossier($societe, ['etape' => EtapeDossier::Cloture]);

        $this->actingAs($this->agentDe($societe))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertNotFound();
    }

    public function test_l_ecran_montre_l_identite_du_passage(): void
    {
        $societe = Consignataire::factory()->create(['name' => 'SAGA Gabon']);
        $navire = Navire::factory()->create(['name' => 'OKOUMÉ TRADER']);
        $dossier = $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-071',
            'sens' => SensTrafic::Export,
            'etape' => EtapeDossier::Manifeste,
        ]);

        $this->actingAs($this->agentDe($societe))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('activite/dossier-manifeste')
                ->where('dossier.navire', 'OKOUMÉ TRADER')
                ->where('dossier.voyage', '26-071')
                ->where('dossier.consignataire', 'SAGA Gabon')
                ->where('dossier.sens', 'export')
                ->where('dossier.port', 'Owendo')
                // Sans manifeste, le numéro affiché reste la référence
                // interne, marquée provisoire (ADR-0008).
                ->where('dossier.numero', $dossier->reference)
                ->where('dossier.provisoire', true)
                ->where('dossier.reference', $dossier->reference)
                ->has('circuit', 6));
    }

    public function test_les_dates_reelles_et_le_poste_viennent_de_la_situation_portuaire(): void
    {
        $societe = Consignataire::factory()->create();
        $navire = Navire::factory()->create();
        $poste = PosteQuai::factory()->create(['port_id' => $this->port->id, 'code' => 'M3']);

        // La ligne est inscrite AVANT le dossier : le rapprochement d'ADR-0009
        // se fait tout seul à l'enregistrement.
        MouvementNavire::factory()->aQuai()->create([
            'port_id' => $this->port->id,
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            'poste_quai_id' => $poste->id,
        ]);

        $dossier = $this->dossier($societe, [
            'navire_id' => $navire->id,
            'voyage' => '26-114S',
            // Le dossier avait annoncé autre chose : c'est la situation
            // portuaire qui fait foi une fois le navire arrivé.
            'eta_prevue' => now()->subDays(4),
        ]);

        $this->assertNotNull($dossier->fresh()?->mouvement_navire_id);

        $this->actingAs($this->agentDe($societe))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dossier.rapproche', true)
                ->whereNot('dossier.eta', null)
                ->where('dossier.poste', 'M3')
                ->where('dossier.posteStatut', 'À quai'));
    }

    public function test_un_dossier_non_rapproche_le_dit_plutot_que_d_opposer_une_date_qu_il_n_a_pas(): void
    {
        $societe = Consignataire::factory()->create();
        $dossier = $this->dossier($societe, ['eta_prevue' => now()->addDays(2)]);

        $this->actingAs($this->agentDe($societe))
            ->get("/dossiers/{$dossier->id}/manifeste")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dossier.rapproche', false)
                ->where('dossier.eta', null)
                ->where('dossier.etd', null)
                ->where('dossier.poste', null)
                ->whereNot('dossier.etaAnnoncee', null));
    }
}
