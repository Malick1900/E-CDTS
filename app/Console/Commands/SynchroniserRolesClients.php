<?php

namespace App\Console\Commands;

use App\Enums\Permission as PermissionCatalogue;
use App\Enums\RoleClient;
use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Aligne le rôle de chaque compte client sur sa position réelle (ADR-0031).
 *
 * Les rôles clients sont arrivés après les comptes : ceux déjà en base n'en
 * portent aucun, donc aucune permission, donc une navigation vide. Cette
 * commande les rattrape. Elle reste utile ensuite comme filet — après une
 * reprise de données, ou si un rôle a été retiré à la main en base.
 *
 * Idempotente : un compte déjà au bon rôle n'est pas touché.
 */
class SynchroniserRolesClients extends Command
{
    protected $signature = 'clients:synchroniser-roles';

    protected $description = 'Aligne le rôle des comptes clients sur leur position dans leur société';

    public function handle(): int
    {
        $this->poserLesRoles();

        $comptes = User::query()
            ->whereNotNull('consignataire_id')
            ->with(['roles:id,name', 'consignataire:id,titulaire_user_id'])
            ->get();

        $alignes = 0;

        foreach ($comptes as $compte) {
            $attendu = $compte->consignataire?->titulaire_user_id === $compte->id
                ? RoleClient::Titulaire
                : RoleClient::Agent;

            // Un compte client ne porte qu'un rôle : on compare la liste entière,
            // sinon un compte qui en cumulerait deux passerait pour conforme.
            if ($compte->roles->pluck('name')->all() === [$attendu->value]) {
                continue;
            }

            $compte->syncRoles([$attendu->value]);
            $alignes++;
        }

        $this->info("{$alignes} compte(s) aligné(s) sur {$comptes->count()} compte(s) client(s).");

        return self::SUCCESS;
    }

    /**
     * Les deux rôles et leur composition, posés avant de les distribuer.
     *
     * Sans quoi la commande échouerait sur le cas même qu'elle vise : une base
     * d'« avant les rôles clients » ne les a, par définition, pas. Le seeder RBAC
     * fait le même geste, mais exiger son passage préalable ferait dépendre un
     * rattrapage d'un ordre d'exécution que personne ne lira. La composition,
     * elle, ne vient que d'un endroit — l'enum (ADR-0031).
     */
    private function poserLesRoles(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (RoleClient::cases() as $roleClient) {
            foreach ($roleClient->permissions() as $permission) {
                Permission::findOrCreate($permission->value, 'web');
            }
        }

        // Le registrar a pu mémoriser la collection AVANT ces créations.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (RoleClient::cases() as $roleClient) {
            Role::findOrCreate($roleClient->value, 'web')->syncPermissions(
                array_map(
                    static fn (PermissionCatalogue $p): string => $p->value,
                    $roleClient->permissions(),
                ),
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
