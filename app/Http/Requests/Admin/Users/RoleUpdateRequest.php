<?php

namespace App\Http\Requests\Admin\Users;

use App\Enums\Permission;
use App\Enums\Profil;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/**
 * Recomposition d'un rôle interne (ADR-0025).
 *
 * L'autorisation se joue ici en deux temps : la permission `roles.gerer`, puis
 * le caractère recomposable du rôle visé. Le front ne rend pas éditables les
 * colonnes figées, mais une requête forgée n'a pas d'interface à contourner —
 * c'est ce contrôle-là qui protège réellement `Administrateur` et `super-admin`.
 */
class RoleUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()?->can(Permission::RolesGerer->value)) {
            return false;
        }

        $role = $this->route('role');

        return $role instanceof Role
            && (Profil::tryFrom($role->name)?->estRecomposable() ?? false);
    }

    /**
     * Une colonne entièrement décochée arrive absente de la requête : on la
     * ramène à un tableau vide. Vider un rôle est un usage légitime — c'est même
     * la façon de neutraliser un profil sans le supprimer.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'permissions' => $this->input('permissions', []),
        ]);
    }

    /**
     * @return array<string, list<ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            // Le catalogue est fermé : il vient du code, jamais de la requête.
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }
}
