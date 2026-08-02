<?php

namespace Tests\Feature;

use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Navire;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * L'espace d'administration d'une société consignataire (lot 2).
 *
 * Ce que ces tests protègent : le cloisonnement. Deux sociétés concurrentes
 * cohabitent dans les mêmes tables, et un titulaire qui verrait les agents ou
 * les armements de l'autre lirait son portefeuille commercial. Le périmètre se
 * déduit du compte connecté — jamais de l'URL —, et c'est cette déduction que
 * l'on vérifie ici.
 */
class MonEspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    /** Une société et son compte maître, validé. */
    private function societe(): Consignataire
    {
        $consignataire = Consignataire::factory()->create();

        $titulaire = User::factory()
            ->agentDe($consignataire)
            ->valide($this->interne(Profil::Administrateur))
            ->create();
        $titulaire->syncRoles([RoleClient::Titulaire->value]);
        $consignataire->titulaire()->associate($titulaire)->save();

        return $consignataire;
    }

    private function agentDe(Consignataire $consignataire): User
    {
        $agent = User::factory()
            ->agentDe($consignataire)
            ->valide($this->interne(Profil::Administrateur))
            ->create();
        $agent->syncRoles([RoleClient::Agent->value]);

        return $agent;
    }

    /** @return array<string, string> */
    private function fiche(string $email = 'lea.ndong@societe.ga'): array
    {
        return [
            'first_name' => 'Léa',
            'last_name' => 'Ndong',
            'phone' => '+241 01 02 03 04',
            'job_title' => 'Agent de transit',
            'email' => $email,
        ];
    }

    public function test_le_titulaire_ne_compte_que_les_agents_et_armements_de_sa_societe(): void
    {
        $mienne = $this->societe();
        $this->agentDe($mienne);
        $mienne->armements()->attach(Armement::factory()->count(2)->create());

        // La concurrente, plus fournie : ses effectifs ne doivent apparaître
        // nulle part dans la réponse.
        $autre = $this->societe();
        $this->agentDe($autre);
        $this->agentDe($autre);
        $autre->armements()->attach(Armement::factory()->count(5)->create());

        $this->actingAs($mienne->titulaire)
            ->get(route('mon-espace'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('activite/mon-espace')
                // Le titulaire est lui-même rattaché à sa société : deux comptes.
                ->where('compteurs.agents', 2)
                ->where('compteurs.armements', 2)
                // Les colonnes de la matrice d'affectation : celles de la
                // concurrente y apparaîtraient comme des armements affectables.
                ->has('armements', 2, fn (AssertableInertia $armement) => $armement
                    // La fiche que lit l'onglet « Mes armements » : le pavillon
                    // et l'état du référentiel s'y ajoutent à la pastille.
                    ->hasAll([
                        'id', 'name', 'sigle', 'navires', 'pays_origine',
                        'pays_immatriculation', 'gerant', 'rccm_nif',
                        'adresse', 'actif',
                    ])
                )
            );
    }

    /**
     * L'onglet « Navires » donne la flotte des armements représentés, en
     * entier — mais elle seule : le navire d'un armement qu'une concurrente
     * représente n'a rien à faire dans cet écran.
     */
    public function test_la_flotte_visible_est_celle_des_armements_representes(): void
    {
        $mienne = $this->societe();
        $mien = Armement::factory()->create();
        $mienne->armements()->attach($mien);
        Navire::factory()->count(2)->create(['armement_id' => $mien->id]);

        $autre = $this->societe();
        $sien = Armement::factory()->create();
        $autre->armements()->attach($sien);
        Navire::factory()->count(3)->create(['armement_id' => $sien->id]);

        // Un navire sans armement n'appartient à personne : il ne remonte nulle part.
        Navire::factory()->create(['armement_id' => null]);

        $this->actingAs($mienne->titulaire)
            ->get(route('mon-espace'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('compteurs.navires', 2)
                ->has('navires', 2, fn (AssertableInertia $navire) => $navire
                    // La fiche entière : c'est sur ces mentions que le manifeste
                    // sera rapproché (ADR-0009).
                    ->hasAll([
                        'id', 'name', 'imo', 'pavillon', 'type', 'armement',
                        'armement_sigle', 'mode_exploitation', 'actif',
                    ])
                )
            );
    }

    /**
     * L'onglet « Ma société » lit le dossier du compte connecté et lui seul,
     * ports desservis compris — ceux d'une concurrente diraient où elle opère.
     */
    public function test_la_fiche_societe_est_celle_du_compte_connecte(): void
    {
        $mienne = $this->societe();
        $mienne->ports()->attach(Port::factory()->count(2)->create());

        $autre = $this->societe();
        $autre->ports()->attach(Port::factory()->count(3)->create());

        $this->actingAs($mienne->titulaire)
            ->get(route('mon-espace'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('societe.name', $mienne->name)
                ->has('societe', fn (AssertableInertia $societe) => $societe
                    ->hasAll([
                        'name', 'sigle', 'rccm_nif', 'pays_immatriculation',
                        'adresse', 'telephone', 'email', 'ports',
                    ])
                    ->has('ports', 2, fn (AssertableInertia $port) => $port
                        ->hasAll(['id', 'name', 'code', 'pays'])
                    )
                )
            );
    }

    /**
     * Le cas qui justifie la garde du controller : après un transfert de
     * titularité (ADR-0027), un compte peut porter encore la permission sans
     * avoir de société. On refuse, on ne s'effondre pas sur une valeur nulle.
     */
    public function test_un_titulaire_sans_societe_est_refuse_plutot_que_de_faire_planter_l_ecran(): void
    {
        $consignataire = $this->societe();
        $ancien = $consignataire->titulaire;

        $consignataire->titulaire()->dissociate()->save();

        $this->actingAs($ancien)->get(route('mon-espace'))->assertForbidden();
    }

    // ── Mes agents ────────────────────────────────────────────────

    /**
     * L'acte fondateur du lot : la société propose, le CGC dispose (ADR-0013).
     * Le compte naît donc en attente et inactif — et sans secret choisi par le
     * titulaire, qui n'a pas à connaître celui de son agent.
     */
    public function test_le_titulaire_cree_une_demande_de_compte_et_rien_de_plus(): void
    {
        $societe = $this->societe();

        $this->actingAs($societe->titulaire)
            ->post(route('mon-espace.agents.store'), [
                ...$this->fiche(),
                // Un mot de passe glissé dans la requête ne doit pas être retenu.
                'password' => 'MotDePasseImpose1!',
            ])
            ->assertRedirect(route('mon-espace'));

        $agent = User::query()->where('email', 'lea.ndong@societe.ga')->sole();

        $this->assertSame($societe->id, $agent->consignataire_id);
        $this->assertSame(StatutValidation::EnAttente, $agent->statut_validation);
        $this->assertFalse($agent->is_active);
        $this->assertSame('Léa Ndong', $agent->name);
        $this->assertTrue($agent->hasRole(RoleClient::Agent->value));
        $this->assertFalse(Hash::check('MotDePasseImpose1!', $agent->password));
    }

    /**
     * Le cœur du cloisonnement, côté écriture. Introuvable et non interdit :
     * un « interdit » confirmerait que l'identifiant existe.
     */
    public function test_le_titulaire_ne_touche_pas_aux_agents_d_une_autre_societe(): void
    {
        $mienne = $this->societe();
        $etranger = $this->agentDe($this->societe());

        $this->actingAs($mienne->titulaire)
            ->patch(route('mon-espace.agents.update', $etranger), $this->fiche())
            ->assertNotFound();

        $this->actingAs($mienne->titulaire)
            ->patch(route('mon-espace.agents.activation', $etranger))
            ->assertNotFound();

        $this->actingAs($mienne->titulaire)
            ->delete(route('mon-espace.agents.destroy', $etranger))
            ->assertNotFound();

        $this->assertTrue($etranger->refresh()->is_active);
    }

    public function test_l_adresse_ne_se_change_plus_une_fois_le_compte_valide(): void
    {
        $societe = $this->societe();
        $agent = $this->agentDe($societe);
        $adresse = $agent->email;

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.update', $agent), $this->fiche('ailleurs@autre.ga'))
            ->assertRedirect(route('mon-espace'));

        $agent->refresh();

        // Le reste de la fiche est bien corrigé : seule l'adresse est figée.
        $this->assertSame($adresse, $agent->email);
        $this->assertSame('Léa Ndong', $agent->name);
    }

    public function test_l_adresse_se_corrige_tant_que_le_cgc_n_a_pas_statue(): void
    {
        $societe = $this->societe();
        $agent = User::factory()->agentDe($societe)->create();

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.update', $agent), $this->fiche('corrige@societe.ga'))
            ->assertRedirect(route('mon-espace'));

        $this->assertSame('corrige@societe.ga', $agent->refresh()->email);
    }

    public function test_une_demande_refusee_se_soumet_a_nouveau_sans_effacer_le_motif(): void
    {
        $societe = $this->societe();
        $agent = User::factory()
            ->agentDe($societe)
            ->refuse($this->interne(Profil::Administrateur))
            ->create();

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.soumission', $agent))
            ->assertRedirect(route('mon-espace'));

        $agent->refresh();

        $this->assertSame(StatutValidation::EnAttente, $agent->statut_validation);
        // Le motif reste lisible jusqu'à la décision suivante (ADR-0024).
        $this->assertNotNull($agent->motif_refus);
    }

    public function test_seule_une_demande_jamais_examinee_se_supprime(): void
    {
        $societe = $this->societe();
        $jamaisExaminee = User::factory()->agentDe($societe)->create();
        $valide = $this->agentDe($societe);

        // Un compte validé a pu déclarer : il se suspend, il ne s'efface pas.
        $this->actingAs($societe->titulaire)
            ->delete(route('mon-espace.agents.destroy', $valide))
            ->assertSessionHasErrors('statut_validation');
        $this->assertModelExists($valide);

        $this->actingAs($societe->titulaire)
            ->delete(route('mon-espace.agents.destroy', $jamaisExaminee))
            ->assertRedirect(route('mon-espace'));
        $this->assertModelMissing($jamaisExaminee);
    }

    public function test_la_suspension_ne_vise_que_les_comptes_valides(): void
    {
        $societe = $this->societe();
        $valide = $this->agentDe($societe);
        $enAttente = User::factory()->agentDe($societe)->create();

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.activation', $valide))
            ->assertRedirect(route('mon-espace'));
        $this->assertFalse($valide->refresh()->is_active);

        // Rien à suspendre sur un accès qui n'a pas encore été accordé.
        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.activation', $enAttente))
            ->assertSessionHasErrors('statut_validation');
    }

    /** Anti-auto-blocage (ADR-0012) : il se retirerait l'accès qui sert à le rendre. */
    public function test_le_titulaire_n_a_pas_prise_sur_son_propre_compte(): void
    {
        $societe = $this->societe();

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.agents.activation', $societe->titulaire))
            ->assertForbidden();

        $this->assertTrue($societe->titulaire->refresh()->is_active);
    }

    /** Un agent ordinaire n'administre rien, même sur sa propre société. */
    public function test_un_agent_ne_cree_pas_de_compte(): void
    {
        $societe = $this->societe();

        $this->actingAs($this->agentDe($societe))
            ->post(route('mon-espace.agents.store'), $this->fiche())
            ->assertForbidden();
    }

    // ── Affectations ──────────────────────────────────────────────

    /** La case de la matrice : un clic pose la portée, un second la retire. */
    public function test_l_affectation_d_un_armement_se_coche_et_se_decoche(): void
    {
        $societe = $this->societe();
        $agent = $this->agentDe($societe);
        $armement = Armement::factory()->create();
        $societe->armements()->attach($armement);

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$agent, $armement]))
            ->assertRedirect(route('mon-espace'));
        $this->assertTrue($agent->armements()->whereKey($armement->id)->exists());

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$agent, $armement]))
            ->assertRedirect(route('mon-espace'));
        $this->assertFalse($agent->armements()->whereKey($armement->id)->exists());
    }

    /**
     * La seconde borne du lot, aussi sensible que la première : sans elle, un
     * titulaire ouvrirait à son agent un armement qu'il ne représente pas — et
     * lui donnerait vue sur les escales d'un concurrent (ADR-0009).
     */
    public function test_on_n_affecte_que_les_armements_que_la_societe_represente(): void
    {
        $societe = $this->societe();
        $agent = $this->agentDe($societe);

        $autre = $this->societe();
        $armement = Armement::factory()->create();
        $autre->armements()->attach($armement);

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$agent, $armement]))
            ->assertNotFound();

        $this->assertFalse($agent->armements()->whereKey($armement->id)->exists());
    }

    public function test_on_n_affecte_pas_l_agent_d_une_autre_societe(): void
    {
        $mienne = $this->societe();
        $armement = Armement::factory()->create();
        $mienne->armements()->attach($armement);

        $etranger = $this->agentDe($this->societe());

        $this->actingAs($mienne->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$etranger, $armement]))
            ->assertNotFound();

        $this->assertFalse($etranger->armements()->whereKey($armement->id)->exists());
    }

    /** Une portée sur un compte sans accès ne s'exerce nulle part. */
    public function test_l_affectation_suppose_un_acces_ouvert(): void
    {
        $societe = $this->societe();
        $armement = Armement::factory()->create();
        $societe->armements()->attach($armement);

        $enAttente = User::factory()->agentDe($societe)->create();

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$enAttente, $armement]))
            ->assertSessionHasErrors('agent');

        $suspendu = $this->agentDe($societe);
        $suspendu->update(['is_active' => false]);

        $this->actingAs($societe->titulaire)
            ->patch(route('mon-espace.affectations.toggle', [$suspendu, $armement]))
            ->assertSessionHasErrors('agent');
    }
}
