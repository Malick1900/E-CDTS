<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\Armement;
use App\Models\Pays;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArmementManagementTest extends TestCase
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
            ->post(route('admin.referentiels.armements.store'), ['name' => 'Compagnie Maritime Gabonaise'])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_shipping_company(): void
    {
        $origine = Pays::factory()->create(['code' => 'GA']);
        $immatriculation = Pays::factory()->create(['code' => 'LR']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.armements.store'), [
                'name' => 'Compagnie Maritime Gabonaise',
                'sigle' => 'cmg',
                'pays_origine_id' => $origine->id,
                'pays_immatriculation_id' => $immatriculation->id,
                'gerant' => 'Jean Mounguengui',
                'rccm_nif' => 'RCCM-123456',
                'adresse' => 'Zone portuaire, Owendo',
            ])
            ->assertRedirect(route('admin.referentiels'));

        // Le sigle est normalisé en majuscules.
        $this->assertDatabaseHas('armements', [
            'name' => 'Compagnie Maritime Gabonaise',
            'sigle' => 'CMG',
            'pays_origine_id' => $origine->id,
            'pays_immatriculation_id' => $immatriculation->id,
            'gerant' => 'Jean Mounguengui',
            'rccm_nif' => 'RCCM-123456',
            'adresse' => 'Zone portuaire, Owendo',
            'actif' => true,
        ]);
    }

    public function test_creation_requires_a_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.armements.store'), ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_blank_optional_fields_are_stored_as_null(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.armements.store'), [
                'name' => 'Armement Minimal',
                'sigle' => '',
                'gerant' => '',
                'rccm_nif' => '',
                'adresse' => '',
            ])
            ->assertRedirect(route('admin.referentiels'));

        $armement = Armement::where('name', 'Armement Minimal')->sole();

        // On ne stocke jamais de chaîne vide : les facultatifs retombent à null.
        $this->assertNull($armement->sigle);
        $this->assertNull($armement->gerant);
        $this->assertNull($armement->rccm_nif);
        $this->assertNull($armement->adresse);
    }

    public function test_creation_rejects_an_unknown_country_of_origin(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.armements.store'), [
                'name' => 'Compagnie Maritime Gabonaise',
                'pays_origine_id' => 999999,
            ])
            ->assertSessionHasErrors('pays_origine_id');
    }

    public function test_admin_can_update_a_shipping_company(): void
    {
        $armement = Armement::factory()->create(['name' => 'Ancien Armement', 'sigle' => 'AAA']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.armements.update', $armement), [
                'name' => 'Nouvel Armement',
                'sigle' => 'nna',
                'gerant' => 'Paul Ndong',
            ])
            ->assertRedirect(route('admin.referentiels'));

        $armement->refresh();

        $this->assertSame('Nouvel Armement', $armement->name);
        $this->assertSame('NNA', $armement->sigle);
        $this->assertSame('Paul Ndong', $armement->gerant);
    }

    public function test_admin_can_deactivate_then_reactivate_a_shipping_company(): void
    {
        $admin = $this->admin();
        $armement = Armement::factory()->create(['actif' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.armements.activation', $armement))
            ->assertRedirect(route('admin.referentiels'));

        $this->assertFalse($armement->refresh()->actif);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.armements.activation', $armement));

        $this->assertTrue($armement->refresh()->actif);
    }
}
