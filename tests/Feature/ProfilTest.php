<?php

namespace Tests\Feature;

use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Sa propre fiche.
 *
 * Deux choses sont protégées ici. D'abord le périmètre : l'écran n'a pas
 * d'identifiant dans l'URL, il lit et écrit le compte connecté — ces tests
 * vérifient qu'aucun champ envoyé en trop ne déborde sur ce que le compte n'a
 * pas le droit de changer. Ensuite la lisibilité : rôle, identifiant, portée,
 * date du dernier changement de mot de passe s'affichent, même là où ils ne
 * s'écrivent pas.
 */
class ProfilTest extends TestCase
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

    public function test_un_visiteur_est_renvoye_a_la_connexion(): void
    {
        $this->get('/profil')->assertRedirect('/login');
    }

    public function test_un_interne_cgc_lit_sa_fiche_et_releve_du_conseil(): void
    {
        $user = $this->interne(Profil::Superviseur);

        $this->actingAs($user)
            ->get('/profil')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('activite/profil')
                ->where('profil.email', $user->email)
                ->where('profil.role', Profil::Superviseur->value)
                ->where('profil.client', false)
                ->where('profil.organisation', 'Conseil Gabonais des Chargeurs')
                // Un interne n'opère pour aucun armement : la carte de portée
                // n'a pas lieu d'être, et le nul le dit.
                ->where('profil.armements', null)
                ->where('profil.mot_de_passe_modifie_le', null)
                ->has('criteres.longueur'),
            );
    }

    public function test_un_compte_client_lit_sa_societe_et_sa_portee(): void
    {
        $societe = Consignataire::factory()->create(['name' => 'SAGA Gabon']);
        $armement = Armement::factory()->create(['name' => 'Grimaldi Lines']);

        $agent = User::factory()
            ->agentDe($societe)
            ->valide($this->interne(Profil::Administrateur))
            ->create();
        $agent->syncRoles([RoleClient::Agent->value]);
        $agent->armements()->attach($armement);

        $this->actingAs($agent)
            ->get('/profil')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('profil.client', true)
                ->where('profil.organisation', 'SAGA Gabon')
                ->where('profil.role', RoleClient::Agent->value)
                ->has('profil.armements', 1, fn (AssertableInertia $ligne) => $ligne
                    ->where('name', 'Grimaldi Lines')
                    ->hasAll(['id', 'sigle']),
                ),
            );
    }

    public function test_l_etat_civil_se_corrige_et_recompose_le_nom_affiche(): void
    {
        $user = $this->interne(Profil::Consultant);

        $this->actingAs($user)
            ->patch('/profil', [
                'first_name' => 'Nadia',
                'last_name' => 'Bongo',
                'phone' => '+241 06 24 18 90',
            ])
            ->assertRedirect('/profil');

        $user->refresh();

        $this->assertSame('Nadia', $user->first_name);
        $this->assertSame('+241 06 24 18 90', $user->phone);
        // Le nom affiché n'a pas de saisie propre : il se recompose, sinon la
        // signature d'une déclaration finirait par désigner quelqu'un d'autre.
        $this->assertSame('Nadia Bongo', $user->name);
    }

    public function test_l_identifiant_de_connexion_ne_se_change_pas_depuis_le_profil(): void
    {
        $user = $this->interne(Profil::Consultant);
        $adresse = $user->email;

        $this->actingAs($user)
            ->patch('/profil', [
                'first_name' => 'Nadia',
                'last_name' => 'Bongo',
                'phone' => '+241 06 24 18 90',
                // Envoyés en trop : l'écran ne les propose pas, le serveur ne
                // les lit pas davantage.
                'email' => 'usurpation@ailleurs.ga',
                'job_title' => 'Directeur général',
            ])
            ->assertRedirect('/profil');

        $user->refresh();

        $this->assertSame($adresse, $user->email);
        $this->assertNotSame('Directeur général', $user->job_title);
    }

    public function test_l_etat_civil_ne_s_efface_pas(): void
    {
        $user = $this->interne(Profil::Consultant);

        $this->actingAs($user)
            ->patch('/profil', [
                'first_name' => '',
                'last_name' => 'Bongo',
                'phone' => '',
            ])
            ->assertSessionHasErrors(['first_name', 'phone']);
    }

    public function test_le_changement_de_mot_de_passe_exige_l_ancien(): void
    {
        $user = $this->interne(Profil::Consultant);

        $this->actingAs($user)
            ->put('/profil/mot-de-passe', [
                'current_password' => 'ce-n-est-pas-le-bon',
                'password' => 'nouveau-secret-2026',
                'password_confirmation' => 'nouveau-secret-2026',
            ])
            ->assertSessionHasErrors('current_password');

        // Une session ouverte ne suffit pas : le mot de passe est intact.
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_le_changement_de_mot_de_passe_est_horodate(): void
    {
        $user = $this->interne(Profil::Consultant);

        // Un compte qui vient d'être ouvert n'a jamais changé son mot de passe :
        // il l'a reçu. L'écran affiche « jamais modifié », et c'est exact.
        $this->assertNull($user->password_changed_at);

        $this->actingAs($user)
            ->put('/profil/mot-de-passe', [
                'current_password' => 'password',
                'password' => 'nouveau-secret-2026',
                'password_confirmation' => 'nouveau-secret-2026',
            ])
            ->assertRedirect('/profil');

        $user->refresh();

        $this->assertTrue(Hash::check('nouveau-secret-2026', $user->password));
        $this->assertNotNull($user->password_changed_at);
    }

    public function test_la_confirmation_doit_correspondre(): void
    {
        $user = $this->interne(Profil::Consultant);

        $this->actingAs($user)
            ->put('/profil/mot-de-passe', [
                'current_password' => 'password',
                'password' => 'nouveau-secret-2026',
                'password_confirmation' => 'autre-chose-2026',
            ])
            ->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_le_lien_de_reinitialisation_horodate_aussi_le_changement(): void
    {
        $user = $this->interne(Profil::Consultant);

        // Le modèle horodate, pas le contrôleur du profil : un agent qui définit
        // son mot de passe par le lien d'ADR-0035 n'a pas visité cet écran, et
        // sa fiche doit tout de même le dire.
        $user->update(['password' => 'defini-par-le-lien-2026']);

        $this->assertNotNull($user->refresh()->password_changed_at);
    }
}
