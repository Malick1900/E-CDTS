<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\Pays;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortManagementTest extends TestCase
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
            ->post(route('admin.referentiels.ports.store'), ['code' => 'GAOWE', 'name' => 'Owendo'])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_port(): void
    {
        $pays = Pays::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), [
                'code' => 'GAOWE',
                'name' => 'Owendo',
                'pays_id' => $pays->id,
                'prefixe_numerotation' => 'OWE',
            ])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertDatabaseHas('ports', [
            'code' => 'GAOWE',
            'name' => 'Owendo',
            'pays_id' => $pays->id,
            'prefixe_numerotation' => 'OWE',
            'actif' => true,
        ]);
    }

    public function test_creation_requires_code_and_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), ['code' => '', 'name' => ''])
            ->assertSessionHasErrors(['code', 'name']);
    }

    public function test_code_is_normalised_to_uppercase_without_spaces(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), ['code' => ' ga owe ', 'name' => 'Owendo'])
            ->assertRedirect(route('admin.referentiels'));

        // TOUS les espaces sautent, pas seulement ceux de bordure : sans cela
        // « GA OWE » et « GAOWE » cohabiteraient malgré la contrainte d'unicité.
        $this->assertDatabaseHas('ports', ['code' => 'GAOWE', 'name' => 'Owendo']);
    }

    public function test_code_spacing_does_not_defeat_uniqueness(): void
    {
        Port::factory()->create(['code' => 'GAOWE']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), ['code' => 'GA OWE', 'name' => 'Owendo bis'])
            ->assertSessionHasErrors('code');
    }

    public function test_code_must_be_unique(): void
    {
        Port::factory()->create(['code' => 'GAOWE']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), ['code' => 'gaowe', 'name' => 'Owendo'])
            ->assertSessionHasErrors('code');
    }

    public function test_creation_rejects_an_unknown_country(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.ports.store'), [
                'code' => 'GAOWE',
                'name' => 'Owendo',
                'pays_id' => 999999,
            ])
            ->assertSessionHasErrors('pays_id');
    }

    public function test_admin_can_update_a_port(): void
    {
        $port = Port::factory()->create(['code' => 'GAPOG', 'name' => 'Port-Gentil']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.ports.update', $port), [
                'code' => 'GAOWE',
                'name' => 'Owendo',
                'prefixe_numerotation' => 'OWE',
            ])
            ->assertRedirect(route('admin.referentiels'));

        $port->refresh();

        $this->assertSame('GAOWE', $port->code);
        $this->assertSame('Owendo', $port->name);
        $this->assertSame('OWE', $port->prefixe_numerotation);
    }

    public function test_update_keeps_its_own_code_available(): void
    {
        $port = Port::factory()->create(['code' => 'GAOWE']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.ports.update', $port), ['code' => 'GAOWE', 'name' => 'Owendo'])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertSame('Owendo', $port->refresh()->name);
    }

    public function test_admin_can_deactivate_then_reactivate_a_port(): void
    {
        $admin = $this->admin();
        $port = Port::factory()->create(['actif' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.ports.activation', $port))
            ->assertRedirect(route('admin.referentiels'));

        $this->assertFalse($port->refresh()->actif);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.ports.activation', $port));

        $this->assertTrue($port->refresh()->actif);
    }
}
