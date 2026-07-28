<?php

namespace Tests\Feature\Admin;

use App\Enums\ModeExploitation;
use App\Enums\Profil;
use App\Models\Armement;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\TypeNavire;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavireManagementTest extends TestCase
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
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Bois du Gabon'])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_vessel(): void
    {
        $pays = Pays::factory()->create();
        $type = TypeNavire::factory()->create();
        $armement = Armement::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.navires.store'), [
                'name' => 'Bois du Gabon',
                'imo' => '9123456',
                'pays_id' => $pays->id,
                'type_navire_id' => $type->id,
                'armement_id' => $armement->id,
                'mode_exploitation_defaut' => ModeExploitation::LigneReguliere->value,
            ])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertDatabaseHas('navires', [
            'name' => 'Bois du Gabon',
            'imo' => '9123456',
            'pays_id' => $pays->id,
            'type_navire_id' => $type->id,
            'armement_id' => $armement->id,
            'mode_exploitation_defaut' => ModeExploitation::LigneReguliere->value,
            'actif' => true,
        ]);
    }

    public function test_creation_requires_a_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.navires.store'), ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_imo_must_be_exactly_seven_digits(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Bois du Gabon', 'imo' => '12345'])
            ->assertSessionHasErrors('imo');

        $this->actingAs($admin)
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Bois du Gabon', 'imo' => 'ABCDEFG'])
            ->assertSessionHasErrors('imo');

        $this->assertDatabaseCount('navires', 0);
    }

    public function test_imo_must_be_unique(): void
    {
        Navire::factory()->create(['imo' => '9123456']);

        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Bois du Gabon', 'imo' => '9123456'])
            ->assertSessionHasErrors('imo');
    }

    public function test_two_vessels_without_imo_can_coexist(): void
    {
        $admin = $this->admin();

        // L'IMO vide devient null : sans cette normalisation, la deuxième
        // création casserait sur la contrainte d'unicité de la colonne.
        $this->actingAs($admin)
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Sans IMO 1', 'imo' => ''])
            ->assertRedirect(route('admin.referentiels'));

        $this->actingAs($admin)
            ->post(route('admin.referentiels.navires.store'), ['name' => 'Sans IMO 2', 'imo' => ''])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertDatabaseCount('navires', 2);
        $this->assertNull(Navire::where('name', 'Sans IMO 1')->sole()->imo);
        $this->assertNull(Navire::where('name', 'Sans IMO 2')->sole()->imo);
    }

    public function test_creation_rejects_an_unknown_operating_mode(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.referentiels.navires.store'), [
                'name' => 'Bois du Gabon',
                'mode_exploitation_defaut' => 'cabotage',
            ])
            ->assertSessionHasErrors('mode_exploitation_defaut');
    }

    public function test_admin_can_update_a_vessel(): void
    {
        $navire = Navire::factory()->create(['name' => 'Ancien Nom', 'imo' => '9111111']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.navires.update', $navire), [
                'name' => 'Bois du Gabon',
                'imo' => '9222222',
                'mode_exploitation_defaut' => ModeExploitation::Tramping->value,
            ])
            ->assertRedirect(route('admin.referentiels'));

        $navire->refresh();

        $this->assertSame('Bois du Gabon', $navire->name);
        $this->assertSame('9222222', $navire->imo);
        $this->assertSame(ModeExploitation::Tramping, $navire->mode_exploitation_defaut);
    }

    public function test_update_keeps_its_own_imo_available(): void
    {
        $navire = Navire::factory()->create(['imo' => '9123456']);

        $this->actingAs($this->admin())
            ->patch(route('admin.referentiels.navires.update', $navire), [
                'name' => 'Bois du Gabon',
                'imo' => '9123456',
            ])
            ->assertRedirect(route('admin.referentiels'));

        $this->assertSame('Bois du Gabon', $navire->refresh()->name);
    }

    public function test_admin_can_deactivate_then_reactivate_a_vessel(): void
    {
        $admin = $this->admin();
        $navire = Navire::factory()->create(['actif' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.navires.activation', $navire))
            ->assertRedirect(route('admin.referentiels'));

        $this->assertFalse($navire->refresh()->actif);

        $this->actingAs($admin)
            ->patch(route('admin.referentiels.navires.activation', $navire));

        $this->assertTrue($navire->refresh()->actif);
    }
}
