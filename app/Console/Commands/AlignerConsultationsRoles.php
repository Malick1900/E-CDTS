<?php

namespace App\Console\Commands;

use App\Enums\Permission as PermissionCatalogue;
use App\Enums\Profil;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Donne aux profils CGC déjà en base les permissions de consultation (ADR-0030).
 *
 * Pourquoi une commande plutôt qu'un simple `db:seed` : le seeder resynchronise
 * la composition des profils, ce qui écraserait les amendements faits depuis
 * l'écran « Rôles & permissions ». Celle-ci n'ajoute que ce qui manque et ne
 * retire qu'une chose, `mes-agents.gerer`, qui n'a jamais eu de sens sur un
 * profil interne — « ses » agents, ce sont ceux d'une société consignataire.
 *
 * Les trois consultations sont nées avec ADR-0030 : personne n'a pu les retirer
 * volontairement entre-temps, les rajouter ne défait donc aucune décision.
 *
 * Idempotente : un rôle déjà aligné n'est pas touché.
 */
class AlignerConsultationsRoles extends Command
{
    protected $signature = 'roles:aligner-consultations';

    protected $description = 'Ajoute aux profils CGC les permissions de consultation qui leur manquent';

    public function handle(): int
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $consultations = [
            PermissionCatalogue::SituationPortuaireConsulter,
            PermissionCatalogue::DossiersConsulter,
            PermissionCatalogue::DevisConsulter,
        ];

        // La commande doit tourner seule, sans supposer que le seeder est passé.
        foreach ([...$consultations, PermissionCatalogue::MesAgentsGerer] as $permission) {
            Permission::findOrCreate($permission->value, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $touches = 0;

        foreach (Profil::cases() as $profil) {
            if ($profil->estProtege()) {
                continue;
            }

            $role = Role::findOrCreate($profil->value, 'web');
            $avant = $role->permissions->pluck('name')->all();
            $defaut = $profil->permissionsParDefaut();
            $modifie = false;

            foreach ($consultations as $permission) {
                if (in_array($permission, $defaut, true) && ! in_array($permission->value, $avant, true)) {
                    $role->givePermissionTo($permission->value);
                    $modifie = true;
                }
            }

            if (in_array(PermissionCatalogue::MesAgentsGerer->value, $avant, true)) {
                $role->revokePermissionTo(PermissionCatalogue::MesAgentsGerer->value);
                $modifie = true;
            }

            if ($modifie) {
                $touches++;
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->info("{$touches} profil(s) CGC aligné(s) sur la navigation par permission.");

        return self::SUCCESS;
    }
}
