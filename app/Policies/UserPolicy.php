<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Models\User;

/**
 * Autorisations du module « Utilisateurs & habilitations ».
 *
 * Le super-admin outrepasse tout via Gate::before (AppServiceProvider) : il
 * n'atteint jamais ces méthodes. Elles régissent donc l'admin ORDINAIRE, à qui
 * l'on interdit de toucher à un compte super-admin (garde-fou ADR-0012). Les
 * garde-fous dépendant de la charge utile (ne pas se désactiver / se retirer sa
 * propre capacité) vivent dans le controller, au plus près de l'action.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::UtilisateursGerer->value);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::UtilisateursGerer->value);
    }

    public function update(User $user, User $cible): bool
    {
        if (! $user->can(Permission::UtilisateursGerer->value)) {
            return false;
        }

        return ! $cible->hasRole(Profil::SuperAdmin->value);
    }
}
