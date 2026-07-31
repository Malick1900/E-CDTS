<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\Consignataire;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Les deux rôles clients (ADR-0031).
 *
 * Ce que ces tests protègent : un compte client porte toujours exactement le
 * rôle de sa position, et ce rôle ne se négocie ni depuis l'écran des rôles
 * (figé) ni depuis celui des comptes internes (non attribuable). Sans cela, un
 * titulaire se retrouverait sans permission — donc sans navigation.
 */
class RolesClientsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        NotificationFacade::fake();
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole(Profil::Administrateur->value);

        return $admin;
    }

    /**
     * Ouvre une société avec son compte maître, par le geste réel du CGC.
     */
    private function societeAvecTitulaire(): Consignataire
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.consignataires.store'), [
                'name' => 'SAGA Gabon',
                'titulaire_first_name' => 'Nadia',
                'titulaire_last_name' => 'Bongo',
                'titulaire_email' => 'n.bongo@saga-gabon.ga',
                'titulaire_phone' => '+241 06 11 22 33',
                'titulaire_job_title' => 'Responsable escale',
            ])
            ->assertRedirect(route('admin.utilisateurs.index'));

        return Consignataire::firstWhere('name', 'SAGA Gabon');
    }

    // ── Le catalogue ──────────────────────────────────────────────

    public function test_le_seed_pose_les_deux_roles_et_leur_composition(): void
    {
        $titulaire = Role::findByName(RoleClient::Titulaire->value);
        $agent = Role::findByName(RoleClient::Agent->value);

        foreach ([Permission::SituationPortuaireConsulter, Permission::DossiersConsulter] as $lecture) {
            $this->assertTrue($titulaire->hasPermissionTo($lecture->value));
            $this->assertTrue($agent->hasPermissionTo($lecture->value));
        }

        // Ce qui sépare les deux : l'argent et les comptes (ADR-0030, ADR-0031).
        $this->assertTrue($titulaire->hasPermissionTo(Permission::DevisConsulter->value));
        $this->assertFalse($agent->hasPermissionTo(Permission::DevisConsulter->value));
        $this->assertTrue($titulaire->hasPermissionTo(Permission::MesAgentsGerer->value));
        $this->assertFalse($agent->hasPermissionTo(Permission::MesAgentsGerer->value));
    }

    // ── Le rôle suit la position ──────────────────────────────────

    public function test_ouvrir_une_societe_donne_son_role_au_titulaire(): void
    {
        $titulaire = $this->societeAvecTitulaire()->titulaire;

        $this->assertSame([RoleClient::Titulaire->value], $titulaire->getRoleNames()->all());
        $this->assertTrue($titulaire->can(Permission::MesAgentsGerer->value));
    }

    public function test_le_transfert_de_la_fonction_deplace_le_role(): void
    {
        $consignataire = $this->societeAvecTitulaire();
        $sortant = $consignataire->titulaire;

        $entrant = User::factory()
            ->agentDe($consignataire)
            ->valide($this->admin())
            ->create();
        $entrant->syncRoles([RoleClient::Agent->value]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), ['agent_id' => $entrant->id])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertSame([RoleClient::Titulaire->value], $entrant->fresh()->getRoleNames()->all());
        // Le sortant garde son accès, il perd la gestion des comptes (ADR-0027).
        $this->assertSame([RoleClient::Agent->value], $sortant->fresh()->getRoleNames()->all());
        $this->assertFalse($sortant->fresh()->can(Permission::MesAgentsGerer->value));
    }

    public function test_redesigner_le_titulaire_en_place_ne_le_retrograde_pas(): void
    {
        $consignataire = $this->societeAvecTitulaire();
        $titulaire = $consignataire->titulaire;

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), ['agent_id' => $titulaire->id])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertSame([RoleClient::Titulaire->value], $titulaire->fresh()->getRoleNames()->all());
    }

    // ── Rattrapage des comptes déjà en base ───────────────────────

    public function test_la_commande_aligne_les_comptes_sans_role(): void
    {
        $consignataire = $this->societeAvecTitulaire();
        $titulaire = $consignataire->titulaire;
        $agent = User::factory()->agentDe($consignataire)->create();

        // L'état d'avant les rôles clients : des comptes clients sans rôle.
        $titulaire->syncRoles([]);

        $this->artisan('clients:synchroniser-roles')->assertSuccessful();

        $this->assertSame([RoleClient::Titulaire->value], $titulaire->fresh()->getRoleNames()->all());
        $this->assertSame([RoleClient::Agent->value], $agent->fresh()->getRoleNames()->all());
    }

    public function test_la_commande_est_idempotente(): void
    {
        $titulaire = $this->societeAvecTitulaire()->titulaire;

        $this->artisan('clients:synchroniser-roles')->assertSuccessful();

        $this->assertSame([RoleClient::Titulaire->value], $titulaire->fresh()->getRoleNames()->all());
    }

    // ── Rôles figés ───────────────────────────────────────────────

    public function test_un_role_client_ne_se_recompose_pas(): void
    {
        $role = Role::findByName(RoleClient::Agent->value);

        $this->actingAs($this->admin())
            ->patch("/admin/utilisateurs/roles/{$role->id}", ['permissions' => [Permission::MesAgentsGerer->value]])
            ->assertForbidden();

        $this->assertFalse($role->fresh()->hasPermissionTo(Permission::MesAgentsGerer->value));
    }

    public function test_la_matrice_montre_les_roles_clients_sans_les_rendre_editables(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->has('matriceRoles', count(Profil::cases()) - 1 + count(RoleClient::cases()))
                ->where('matriceRoles', fn ($roles): bool => collect($roles)
                    ->whereIn('name', RoleClient::values())
                    ->every(fn (array $role): bool => $role['recomposable'] === false))
                // Les rôles clients ne sont pas proposés pour un compte interne.
                ->where('assignableRoles', fn ($roles): bool => collect($roles)
                    ->intersect(RoleClient::values())
                    ->isEmpty())
            );
    }

    public function test_un_role_client_ne_s_attribue_pas_a_un_compte_interne(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.store'), [
                'first_name' => 'Jean',
                'last_name' => 'Obame',
                'email' => 'j.obame@cgc.ga',
                'phone' => '+241 06 44 55 66',
                'job_title' => 'Conférencier',
                'password' => 'Password!2345',
                'password_confirmation' => 'Password!2345',
                'roles' => [RoleClient::Titulaire->value],
            ])
            ->assertSessionHasErrors('roles.0');

        $this->assertNull(User::firstWhere('email', 'j.obame@cgc.ga'));
    }
}
