<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Écran « Rôles & permissions » (ADR-0025).
 *
 * Ce que ces tests protègent, c'est l'impossibilité d'une escalade : sans la
 * permission dédiée `roles.gerer`, un Superviseur détenteur de
 * `utilisateurs.gerer` pouvait s'octroyer n'importe quel droit en deux clics. Et
 * ce qu'ils verrouillent ensuite, c'est le couple de rôles intouchables —
 * `Administrateur` (figé) et `super-admin` (absent) — dont l'immutabilité rend
 * l'auto-blocage impossible par construction, sans garde à écrire.
 */
class RoleMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function utilisateur(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    private function role(Profil $profil): Role
    {
        return Role::findByName($profil->value);
    }

    // ── Recomposition nominale ────────────────────────────────────

    public function test_un_administrateur_recompose_un_role(): void
    {
        $superviseur = $this->role(Profil::Superviseur);

        $this->assertTrue($superviseur->hasPermissionTo(Permission::ReferentielsGerer->value));

        $restantes = collect($superviseur->permissions->pluck('name'))
            ->reject(fn (string $nom): bool => $nom === Permission::ReferentielsGerer->value)
            ->values()
            ->all();

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->patch("/admin/utilisateurs/roles/{$superviseur->id}", ['permissions' => $restantes])
            ->assertRedirect(route('admin.utilisateurs.index'));

        // Vérifié sur un compte, et pas seulement sur le rôle : c'est le cache du
        // registrar de permissions qui pourrait mentir ici, pas la table pivot.
        $porteur = $this->utilisateur(Profil::Superviseur);

        $this->assertFalse($porteur->can(Permission::ReferentielsGerer->value));
        $this->assertTrue($porteur->can(Permission::UtilisateursGerer->value));
    }

    public function test_un_role_peut_etre_entierement_vide(): void
    {
        $consultant = $this->role(Profil::Consultant);

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->patch("/admin/utilisateurs/roles/{$consultant->id}", ['permissions' => []])
            ->assertRedirect();

        $this->assertCount(0, $consultant->fresh()->permissions);
    }

    // ── Rôles intouchables ────────────────────────────────────────

    public function test_le_role_administrateur_est_fige(): void
    {
        $administrateur = $this->role(Profil::Administrateur);
        $avant = $administrateur->permissions->pluck('name')->sort()->values()->all();

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->patch("/admin/utilisateurs/roles/{$administrateur->id}", ['permissions' => [Permission::StatistiquesConsulter->value]])
            ->assertForbidden();

        $this->assertSame($avant, $administrateur->fresh()->permissions->pluck('name')->sort()->values()->all());
    }

    public function test_le_role_super_admin_est_intouchable_et_absent_de_la_matrice(): void
    {
        $superAdmin = $this->role(Profil::SuperAdmin);

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->patch("/admin/utilisateurs/roles/{$superAdmin->id}", ['permissions' => [Permission::BaremeModifier->value]])
            ->assertForbidden();

        $this->assertCount(0, $superAdmin->fresh()->permissions);

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->get('/admin/utilisateurs')
            ->assertInertia(fn ($page) => $page->where(
                'matriceRoles',
                fn ($roles): bool => collect($roles)->pluck('name')->doesntContain(Profil::SuperAdmin->value)
            ));
    }

    // ── Accès à l'écran ───────────────────────────────────────────

    public function test_un_superviseur_ne_voit_pas_la_matrice_et_ne_peut_pas_recomposer(): void
    {
        $superviseur = $this->utilisateur(Profil::Superviseur);

        $this->actingAs($superviseur)
            ->get('/admin/utilisateurs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('matriceRoles', null)->where('peutGererClients', false));

        $this->actingAs($superviseur)
            ->patch('/admin/utilisateurs/roles/'.$this->role(Profil::Consultant)->id, ['permissions' => []])
            ->assertForbidden();

        // L'escalade que ferme ADR-0025 : le Superviseur n'a pas la clé.
        $this->assertFalse($superviseur->can(Permission::RolesGerer->value));
        $this->assertTrue($superviseur->can(Permission::UtilisateursGerer->value));
    }

    public function test_l_administrateur_recoit_la_matrice_et_le_catalogue_groupe(): void
    {
        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->get('/admin/utilisateurs')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('peutGererClients', true)
                // Les 5 profils du catalogue moins super-admin, qui n'y figure
                // pas, plus les deux rôles clients figés (ADR-0031).
                ->has('matriceRoles', count(Profil::cases()) - 1 + count(RoleClient::cases()))
                ->where('matriceRoles', fn ($roles): bool => collect($roles)
                    ->firstWhere('name', Profil::Administrateur->value)['recomposable'] === false)
                // Le catalogue est projeté en entier : aucune permission ne doit
                // rester invisible faute de domaine.
                ->where('cataloguePermissions', fn ($groupes): bool => collect($groupes)
                    ->pluck('permissions')
                    ->flatten(1)
                    ->count() === count(Permission::cases()))
            );
    }

    // ── Catalogue fermé ───────────────────────────────────────────

    public function test_une_permission_hors_catalogue_est_rejetee(): void
    {
        $consultant = $this->role(Profil::Consultant);

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->patch("/admin/utilisateurs/roles/{$consultant->id}", ['permissions' => ['tout.faire']])
            ->assertSessionHasErrors('permissions.0');

        $this->assertTrue($consultant->fresh()->hasPermissionTo(Permission::StatistiquesConsulter->value));
    }
}
