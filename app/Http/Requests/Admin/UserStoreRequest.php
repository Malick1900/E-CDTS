<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserStoreRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can('create', User::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'job_title' => ['required', 'string', 'max:120'],
            'email' => $this->emailRules(),
            'password' => $this->passwordRules(),
            'roles' => ['array'],
            'roles.*' => [
                'string',
                Rule::exists('roles', 'name'),
                // Le rôle technique super-admin ne s'attribue jamais depuis l'UI.
                // Les rôles clients non plus : ils suivent la position dans une
                // société et n'ont aucun sens sur un compte interne (ADR-0031).
                Rule::notIn([Profil::SuperAdmin->value, ...RoleClient::values()]),
            ],
        ];
    }
}
