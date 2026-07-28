<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\TypeNavire;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TypeNavireManagementTest extends TestCase
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

    public function test_index_requires_the_manage_referentiels_permission(): void
    {
        $consultant = User::factory()->create();
        $consultant->assignRole(Profil::Consultant->value);

        $this->actingAs($consultant)
            ->get(route('admin.referentiels'))
            ->assertForbidden();
    }

    public function test_supervisor_can_open_the_referentiels_page(): void
    {
        $superviseur = User::factory()->create();
        $superviseur->assignRole(Profil::Superviseur->value);

        $this->actingAs($superviseur)
            ->get(route('admin.referentiels'))
            ->assertOk();
    }

    public function test_admin_can_create_a_type(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.types-navire.store'), ['code' => 'pc', 'name' => 'Porte-conteneurs'])
            ->assertRedirect(route('admin.referentiels'));

        // Le code est normalisé en majuscules.
        $this->assertDatabaseHas('types_navire', ['code' => 'PC', 'name' => 'Porte-conteneurs', 'actif' => true]);
    }

    public function test_creation_requires_code_and_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.types-navire.store'), ['code' => '', 'name' => ''])
            ->assertSessionHasErrors(['code', 'name']);
    }

    public function test_code_must_be_unique(): void
    {
        TypeNavire::factory()->create(['code' => 'PC']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.types-navire.store'), ['code' => 'pc', 'name' => 'Autre'])
            ->assertSessionHasErrors('code');
    }

    public function test_admin_can_update_a_type(): void
    {
        $type = TypeNavire::factory()->create(['code' => 'VR', 'name' => 'Vraquier']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.types-navire.update', $type), ['code' => 'VRAC', 'name' => 'Vraquier sec'])
            ->assertRedirect(route('admin.referentiels'));

        $type->refresh();

        $this->assertSame('VRAC', $type->code);
        $this->assertSame('Vraquier sec', $type->name);
    }

    public function test_update_keeps_its_own_code_available(): void
    {
        $type = TypeNavire::factory()->create(['code' => 'RORO']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.types-navire.update', $type), ['code' => 'RORO', 'name' => 'Roulier'])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertSame('Roulier', $type->refresh()->name);
    }

    public function test_admin_can_deactivate_then_reactivate_a_type(): void
    {
        $admin = $this->admin();
        $type = TypeNavire::factory()->create(['actif' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.types-navire.activation', $type))
            ->assertRedirect(route('admin.referentiels'));

        $this->assertFalse($type->refresh()->actif);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.types-navire.activation', $type));

        $this->assertTrue($type->refresh()->actif);
    }
}
