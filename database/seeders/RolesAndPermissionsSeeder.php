<?php

namespace Database\Seeders;

use App\Enums\Permission as PermissionCatalogue;
use App\Enums\Profil;
use App\Enums\RoleClient;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Pose le socle RBAC (ADR-0012/0013/0015) :
 *  - le catalogue complet des permissions (source : enum App\Enums\Permission) ;
 *  - les 5 profils CGC par défaut + le rôle super-admin protégé ;
 *  - la composition initiale de chaque profil (matrice ENTITES.md §3) ;
 *  - les 2 rôles clients figés et leur composition définitive (ADR-0031).
 *
 * Idempotent : rejouable sans dupliquer (firstOrCreate + syncPermissions).
 * La composition posée ici est un POINT DE DÉPART éditable depuis l'admin,
 * pas un gel — ne pas « resynchroniser » de force en production.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. Catalogue des permissions (défini par le code).
        foreach (PermissionCatalogue::cases() as $permission) {
            Permission::findOrCreate($permission->value, 'web');
        }

        // Le registrar a pu mémoriser la collection AVANT ces créations :
        // on la réinitialise pour que syncPermissions retrouve les nouveaux noms.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 2. Rôles par défaut + composition initiale.
        foreach (Profil::cases() as $profil) {
            $role = Role::findOrCreate($profil->value, 'web');

            // super-admin : outrepasse via Gate::before, aucune permission explicite.
            if ($profil->estProtege()) {
                continue;
            }

            $role->syncPermissions(
                array_map(
                    static fn (PermissionCatalogue $p): string => $p->value,
                    $profil->permissionsParDefaut(),
                ),
            );
        }

        // 3. Rôles clients (ADR-0031). Eux, on les resynchronise à chaque
        // passage sans état d'âme : figés, ils n'ont pas pu être amendés depuis
        // l'admin — leur composition en base ne peut que refléter le code.
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
