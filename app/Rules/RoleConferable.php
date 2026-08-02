<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Spatie\Permission\Models\Role;

/**
 * « On ne donne pas ce qu'on n'a pas » (ADR-0033).
 *
 * Le pendant serveur du filtrage de la liste des rôles proposés : l'écran ne
 * montre plus au demandeur ce qu'il ne peut pas conférer, mais une requête
 * forgée n'a pas d'écran à contourner.
 */
class RoleConferable implements ValidationRule
{
    public function __construct(private readonly ?User $demandeur) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $role = Role::query()->with('permissions:id,name')->firstWhere('name', $value);

        // Rôle inconnu : c'est l'affaire de la règle `exists`, pas de celle-ci.
        if (! $role instanceof Role) {
            return;
        }

        if (! $this->demandeur?->peutConferer($role)) {
            $fail("Le rôle « {$value} » porte des permissions que vous n'avez pas : vous ne pouvez pas l'attribuer.");
        }
    }
}
