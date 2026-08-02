<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * « On ne donne pas ce qu'on n'a pas » (ADR-0033).
 *
 * Ce que ces tests protègent : la séparation posée par ADR-0025 entre gérer les
 * utilisateurs et gérer les rôles. Sans eux, un Superviseur — qui a la première
 * permission mais pas la seconde — reprenait tout ce qu'elle lui refusait, soit
 * en se créant un compte Administrateur, soit en s'emparant d'un compte existant.
 */
class EscaladePrivilegesTest extends TestCase
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

    /**
     * La charge utile d'un compte interne, rôles mis à part.
     *
     * @param  list<string>  $roles
     * @return array<string, mixed>
     */
    private function fiche(array $roles, string $email = 'n.mba@cgc.ga'): array
    {
        return [
            'first_name' => 'Nadia',
            'last_name' => 'Mba',
            'phone' => '+241 06 77 88 99',
            'job_title' => 'Chargée de suivi',
            'email' => $email,
            'password' => 'Password!2345',
            'password_confirmation' => 'Password!2345',
            'roles' => $roles,
        ];
    }

    // ── Attribuer ─────────────────────────────────────────────────

    public function test_un_superviseur_ne_peut_pas_creer_un_administrateur(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->post(route('admin.utilisateurs.store'), $this->fiche([Profil::Administrateur->value]))
            ->assertSessionHasErrors('roles.0');

        $this->assertNull(User::firstWhere('email', 'n.mba@cgc.ga'));
    }

    public function test_un_superviseur_cree_les_roles_qu_il_couvre(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->post(route('admin.utilisateurs.store'), $this->fiche([
                Profil::Conferencier->value,
                Profil::AgentDepouilleur->value,
            ]))
            ->assertSessionHasNoErrors();

        $cree = User::firstWhere('email', 'n.mba@cgc.ga');

        $this->assertNotNull($cree);
        $this->assertEqualsCanonicalizing(
            [Profil::Conferencier->value, Profil::AgentDepouilleur->value],
            $cree->getRoleNames()->all(),
        );
    }

    public function test_un_administrateur_cree_un_administrateur(): void
    {
        $this->actingAs($this->interne(Profil::Administrateur))
            ->post(route('admin.utilisateurs.store'), $this->fiche([Profil::Administrateur->value]))
            ->assertSessionHasNoErrors();

        $this->assertTrue(
            User::firstWhere('email', 'n.mba@cgc.ga')->hasRole(Profil::Administrateur->value),
        );
    }

    public function test_un_superviseur_ne_se_promeut_pas_lui_meme(): void
    {
        $superviseur = $this->interne(Profil::Superviseur);

        $this->actingAs($superviseur)
            ->patch(route('admin.utilisateurs.update', $superviseur), $this->fiche(
                [Profil::Superviseur->value, Profil::Administrateur->value],
                $superviseur->email,
            ))
            ->assertSessionHasErrors('roles.1');

        $this->assertFalse($superviseur->fresh()->hasRole(Profil::Administrateur->value));
    }

    // ── Retirer ───────────────────────────────────────────────────

    public function test_un_superviseur_ne_peut_pas_retrograder_un_administrateur(): void
    {
        $administrateur = $this->interne(Profil::Administrateur);

        $this->actingAs($this->interne(Profil::Superviseur))
            ->patch(route('admin.utilisateurs.update', $administrateur), $this->fiche(
                [Profil::Conferencier->value],
                $administrateur->email,
            ))
            ->assertForbidden();

        $this->assertTrue($administrateur->fresh()->hasRole(Profil::Administrateur->value));
    }

    /**
     * L'autre chemin, plus direct que le retrait : changer le mot de passe d'un
     * Administrateur revient à prendre sa place. La même porte les ferme tous les
     * deux, puisqu'elle porte sur le compte et non sur la charge utile.
     */
    public function test_un_superviseur_ne_peut_pas_s_emparer_du_compte_d_un_administrateur(): void
    {
        $administrateur = $this->interne(Profil::Administrateur);
        $empreinte = $administrateur->password;

        $this->actingAs($this->interne(Profil::Superviseur))
            ->patch(route('admin.utilisateurs.update', $administrateur), $this->fiche(
                [Profil::Administrateur->value],
                $administrateur->email,
            ))
            ->assertForbidden();

        $this->assertSame($empreinte, $administrateur->fresh()->password);
    }

    public function test_un_superviseur_ne_peut_pas_desactiver_un_administrateur(): void
    {
        $administrateur = $this->interne(Profil::Administrateur);

        $this->actingAs($this->interne(Profil::Superviseur))
            ->patch(route('admin.utilisateurs.activation', $administrateur))
            ->assertForbidden();

        $this->assertTrue($administrateur->fresh()->is_active);
    }

    public function test_un_superviseur_edite_un_conferencier(): void
    {
        $conferencier = $this->interne(Profil::Conferencier);

        $this->actingAs($this->interne(Profil::Superviseur))
            ->patch(route('admin.utilisateurs.update', $conferencier), $this->fiche(
                [Profil::Conferencier->value],
                $conferencier->email,
            ))
            ->assertSessionHasNoErrors();

        $this->assertSame('Nadia Mba', $conferencier->fresh()->name);
    }

    // ── L'écran ne propose pas ce que le serveur refuse ───────────

    public function test_l_ecran_ne_propose_au_superviseur_que_ce_qu_il_peut_conferer(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->where('assignableRoles', fn ($roles): bool => ! collect($roles)->contains(Profil::Administrateur->value))
                ->where('assignableRoles', fn ($roles): bool => collect($roles)->contains(Profil::Conferencier->value))
            );
    }

    public function test_l_ecran_propose_tout_a_l_administrateur(): void
    {
        $this->actingAs($this->interne(Profil::Administrateur))
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->where('assignableRoles', fn ($roles): bool => collect($roles)->contains(Profil::Administrateur->value))
            );
    }

    public function test_la_liste_dit_au_superviseur_quels_comptes_lui_echappent(): void
    {
        $administrateur = $this->interne(Profil::Administrateur);
        $conferencier = $this->interne(Profil::Conferencier);

        $this->actingAs($this->interne(Profil::Superviseur))
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->where('users', fn ($users): bool => collect($users)
                    ->firstWhere('id', $administrateur->id)['peut_modifier'] === false)
                ->where('users', fn ($users): bool => collect($users)
                    ->firstWhere('id', $conferencier->id)['peut_modifier'] === true)
            );
    }

    // ── La règle suit le contenu des rôles, pas leur nom ──────────

    public function test_recomposer_un_role_deplace_aussitot_qui_peut_l_attribuer(): void
    {
        $superviseur = $this->interne(Profil::Superviseur);
        $conferencier = Role::findByName(Profil::Conferencier->value);

        $this->assertTrue($superviseur->peutConferer($conferencier));

        // Un Administrateur confie la gestion des rôles au Conférencier : le
        // Superviseur, qui ne l'a pas, cesse aussitôt de pouvoir le conférer.
        $conferencier->givePermissionTo(Permission::RolesGerer->value);

        $this->assertFalse($superviseur->fresh()->peutConferer($conferencier->fresh()));
    }
}
