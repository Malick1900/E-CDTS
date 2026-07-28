<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\Pays;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaysManagementTest extends TestCase
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

    public function test_creation_requires_the_manage_referentiels_permission(): void
    {
        $consultant = User::factory()->create();
        $consultant->assignRole(Profil::Consultant->value);

        $this->actingAs($consultant)
            ->post(route('admin.referentiels.pays.store'), ['code' => 'GA', 'name' => 'Gabon'])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_country(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.pays.store'), ['code' => 'ga', 'name' => 'Gabon'])
            ->assertRedirect(route('admin.referentiels'));

        // Le code ISO est normalisé en majuscules.
        $this->assertDatabaseHas('pays', ['code' => 'GA', 'name' => 'Gabon', 'actif' => true]);
    }

    public function test_creation_requires_code_and_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.pays.store'), ['code' => '', 'name' => ''])
            ->assertSessionHasErrors(['code', 'name']);
    }

    public function test_code_must_be_exactly_two_letters(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.pays.store'), ['code' => 'GAB', 'name' => 'Gabon'])
            ->assertSessionHasErrors('code');
    }

    public function test_code_must_be_unique(): void
    {
        Pays::factory()->create(['code' => 'FR']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.pays.store'), ['code' => 'fr', 'name' => 'France'])
            ->assertSessionHasErrors('code');
    }

    public function test_admin_can_update_a_country(): void
    {
        $pays = Pays::factory()->create(['code' => 'CG', 'name' => 'Congo']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.pays.update', $pays), ['code' => 'CD', 'name' => 'Congo (RDC)'])
            ->assertRedirect(route('admin.referentiels'));

        $pays->refresh();

        $this->assertSame('CD', $pays->code);
        $this->assertSame('Congo (RDC)', $pays->name);
    }

    public function test_update_keeps_its_own_code_available(): void
    {
        $pays = Pays::factory()->create(['code' => 'GA']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.pays.update', $pays), ['code' => 'GA', 'name' => 'Gabon'])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertSame('Gabon', $pays->refresh()->name);
    }

    public function test_admin_can_deactivate_then_reactivate_a_country(): void
    {
        $admin = $this->admin();
        $pays = Pays::factory()->create(['actif' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.pays.activation', $pays))
            ->assertRedirect(route('admin.referentiels'));

        $this->assertFalse($pays->refresh()->actif);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.pays.activation', $pays));

        $this->assertTrue($pays->refresh()->actif);
    }
}
