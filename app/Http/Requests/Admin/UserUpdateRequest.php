<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\User;
use App\Rules\RoleConferable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('utilisateur')) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $utilisateur = $this->route('utilisateur');

        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'job_title' => ['required', 'string', 'max:120'],
            'email' => $this->emailRules($utilisateur instanceof User ? $utilisateur->id : null),
            // Vide = mot de passe inchangé.
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'roles' => ['array'],
            'roles.*' => [
                'string',
                Rule::exists('roles', 'name'),
                Rule::notIn([Profil::SuperAdmin->value, ...RoleClient::values()]),
                // On n'attribue pas un rôle qu'on ne porte pas soi-même (ADR-0033).
                // Le retrait, lui, est fermé en amont par la UserPolicy.
                new RoleConferable($this->user()),
            ],
        ];
    }
}
