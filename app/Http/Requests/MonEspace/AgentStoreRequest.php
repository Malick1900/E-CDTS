<?php

namespace App\Http\Requests\MonEspace;

use App\Concerns\ProfileValidationRules;
use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Création d'un compte agent par le titulaire de sa société (ADR-0013).
 *
 * Aucun mot de passe n'est demandé — contrairement à la création d'un compte
 * interne CGC. L'agent choisira le sien depuis le lien qu'il recevra une fois
 * le compte validé : le titulaire n'a pas à connaître le secret d'accès de son
 * agent, et jusqu'à la validation le compte est inactif de toute façon.
 */
class AgentStoreRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::MesAgentsGerer->value) ?? false;
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
        ];
    }
}
