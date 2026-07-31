<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Les permissions de consultation des profils CGC (ADR-0030).
 *
 * Ce que ces tests protègent : depuis qu'une entrée de navigation vaut une
 * permission, un profil sans `.consulter` perd l'accès à l'écran — silencieuse-
 * ment, puisque le menu se contente de ne rien afficher. La matrice ci-dessous
 * est donc une règle métier, pas un détail de seed.
 */
class PermissionsConsultationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * @return array<string, array{Profil, list<Permission>}>
     */
    public static function matrice(): array
    {
        return [
            // Il renseigne la situation portuaire, rien d'autre.
            'Conférencier' => [Profil::Conferencier, [Permission::SituationPortuaireConsulter]],
            'Agent dépouilleur' => [Profil::AgentDepouilleur, [
                Permission::SituationPortuaireConsulter,
                Permission::DossiersConsulter,
                Permission::DevisConsulter,
            ]],
            'Superviseur' => [Profil::Superviseur, [
                Permission::SituationPortuaireConsulter,
                Permission::DossiersConsulter,
                Permission::DevisConsulter,
            ]],
            'Administrateur' => [Profil::Administrateur, [
                Permission::SituationPortuaireConsulter,
                Permission::DossiersConsulter,
                Permission::DevisConsulter,
            ]],
            // Profil d'observation : ses statistiques n'existent pas encore, il
            // n'aura donc que le tableau de bord.
            'Consultant' => [Profil::Consultant, []],
        ];
    }

    /**
     * @param  list<Permission>  $attendues
     */
    #[DataProvider('matrice')]
    public function test_chaque_profil_recoit_les_consultations_de_son_perimetre(Profil $profil, array $attendues): void
    {
        $role = Role::findByName($profil->value);

        $consultations = [
            Permission::SituationPortuaireConsulter,
            Permission::DossiersConsulter,
            Permission::DevisConsulter,
        ];

        foreach ($consultations as $consultation) {
            $this->assertSame(
                in_array($consultation, $attendues, true),
                $role->hasPermissionTo($consultation->value),
                "{$profil->value} / {$consultation->value}",
            );
        }
    }

    public function test_aucun_profil_interne_ne_porte_la_gestion_des_agents_d_une_societe(): void
    {
        foreach (Profil::cases() as $profil) {
            if ($profil->estProtege()) {
                continue;
            }

            $this->assertFalse(
                Role::findByName($profil->value)->hasPermissionTo(Permission::MesAgentsGerer->value),
                $profil->value,
            );
        }
    }

    public function test_la_commande_rattrape_sans_effacer_les_amendements(): void
    {
        $superviseur = Role::findByName(Profil::Superviseur->value);
        $administrateur = Role::findByName(Profil::Administrateur->value);

        // L'état d'avant ADR-0030 : pas de consultations, et un Administrateur
        // qui portait le catalogue entier, `mes-agents.gerer` compris.
        $superviseur->revokePermissionTo([
            Permission::SituationPortuaireConsulter->value,
            Permission::DossiersConsulter->value,
            Permission::DevisConsulter->value,
        ]);
        $administrateur->givePermissionTo(Permission::MesAgentsGerer->value);

        // Un amendement fait depuis l'écran des rôles : il doit survivre.
        $superviseur->revokePermissionTo(Permission::ReferentielsGerer->value);

        $this->artisan('roles:aligner-consultations')->assertSuccessful();

        $superviseur = $superviseur->fresh();
        $this->assertTrue($superviseur->hasPermissionTo(Permission::DossiersConsulter->value));
        $this->assertFalse($superviseur->hasPermissionTo(Permission::ReferentielsGerer->value));
        $this->assertFalse($administrateur->fresh()->hasPermissionTo(Permission::MesAgentsGerer->value));
    }

    public function test_la_commande_est_idempotente(): void
    {
        $this->artisan('roles:aligner-consultations')->assertSuccessful();

        $this->assertTrue(
            Role::findByName(Profil::Conferencier->value)
                ->hasPermissionTo(Permission::SituationPortuaireConsulter->value),
        );
        $this->assertFalse(
            Role::findByName(Profil::Conferencier->value)
                ->hasPermissionTo(Permission::DossiersConsulter->value),
        );
    }
}
