<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole(Profil::Administrateur->value);

        return $admin;
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Awa',
            'last_name' => 'Moussavou',
            'phone' => '+241 06 00 00 00',
            'job_title' => 'Agent liquidateur',
            'email' => 'awa.moussavou@cgc.ga',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
            'roles' => [Profil::AgentDepouilleur->value],
        ], $overrides);
    }

    public function test_index_requires_the_manage_users_permission(): void
    {
        $consultant = User::factory()->create();
        $consultant->assignRole(Profil::Consultant->value);

        $this->actingAs($consultant)
            ->get(route('admin.utilisateurs.index'))
            ->assertForbidden();
    }

    public function test_admin_can_see_the_users_list(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertOk();
    }

    public function test_admin_can_create_a_user_with_roles(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.store'), $this->validPayload())
            ->assertRedirect(route('admin.utilisateurs.index'));

        $user = User::where('email', 'awa.moussavou@cgc.ga')->firstOrFail();

        $this->assertSame('Awa Moussavou', $user->name);
        $this->assertSame('Agent liquidateur', $user->job_title);
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->hasRole(Profil::AgentDepouilleur->value));
    }

    public function test_creation_requires_the_mandatory_fields(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.store'), $this->validPayload([
                'first_name' => '',
                'phone' => '',
                'job_title' => '',
            ]))
            ->assertSessionHasErrors(['first_name', 'phone', 'job_title']);
    }

    public function test_super_admin_role_cannot_be_assigned_from_the_module(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.store'), $this->validPayload([
                'roles' => [Profil::SuperAdmin->value],
            ]))
            ->assertSessionHasErrors('roles.0');
    }

    public function test_admin_can_update_a_user(): void
    {
        $target = User::factory()->create();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.update', $target), $this->validPayload([
                'first_name' => 'Bruno',
                'last_name' => 'Ndong',
                'email' => 'bruno.ndong@cgc.ga',
                'password' => '',
                'password_confirmation' => '',
                'roles' => [Profil::Superviseur->value],
            ]))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $target->refresh();

        $this->assertSame('Bruno Ndong', $target->name);
        $this->assertSame('bruno.ndong@cgc.ga', $target->email);
        $this->assertTrue($target->hasRole(Profil::Superviseur->value));
    }

    public function test_regular_admin_cannot_update_a_super_admin(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole(Profil::SuperAdmin->value);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.update', $superAdmin), $this->validPayload())
            ->assertForbidden();
    }

    public function test_admin_can_deactivate_and_reactivate_another_user(): void
    {
        $admin = $this->admin();
        $target = User::factory()->create();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.activation', $target))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertFalse($target->refresh()->is_active);

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.activation', $target));

        $this->assertTrue($target->refresh()->is_active);
    }

    public function test_admin_cannot_deactivate_their_own_account(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.activation', $admin))
            ->assertSessionHasErrors('is_active');

        $this->assertTrue($admin->refresh()->is_active);
    }

    public function test_admin_cannot_strip_their_own_management_capability(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.update', $admin), $this->validPayload([
                'email' => $admin->email,
                'roles' => [Profil::Consultant->value],
            ]))
            ->assertSessionHasErrors('roles');

        $this->assertTrue($admin->refresh()->hasRole(Profil::Administrateur->value));
    }

    public function test_a_deactivated_user_cannot_authenticate(): void
    {
        $user = User::factory()->inactive()->create([
            'email' => 'inactive@cgc.ga',
        ]);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }
}
