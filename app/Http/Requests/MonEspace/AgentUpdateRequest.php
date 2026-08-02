<?php

namespace App\Http\Requests\MonEspace;

use App\Concerns\ProfileValidationRules;
use App\Enums\Permission;
use App\Enums\StatutValidation;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Correction de la fiche d'un agent par le titulaire.
 *
 * L'adresse électronique n'y figure que tant que le CGC n'a pas validé le
 * compte : une fois la validation prononcée, elle désigne la personne à qui
 * l'accès a été accordé. La changer déplacerait cet accès vers quelqu'un
 * d'autre sans que personne ne statue — la règle est donc côté serveur, l'écran
 * ne fait que la refléter.
 */
class AgentUpdateRequest extends FormRequest
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
        $rules = [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'job_title' => ['required', 'string', 'max:120'],
        ];

        $agent = $this->route('agent');

        if ($agent instanceof User && $agent->statut_validation !== StatutValidation::Valide) {
            $rules['email'] = $this->emailRules($agent->id);
        }

        return $rules;
    }
}
