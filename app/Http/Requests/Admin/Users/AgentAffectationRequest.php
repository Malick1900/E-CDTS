<?php

namespace App\Http\Requests\Admin\Users;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Portée d'un agent : les armements sur lesquels il pourra opérer (ADR-0009).
 *
 * Le choix est borné aux armements représentés par sa propre société — un
 * identifiant hors de ce périmètre est rejeté, jamais ignoré en silence : c'est
 * une tentative d'élargir la portée, pas une coquille d'affichage.
 */
class AgentAffectationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ComptesClientsGerer->value) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $agent = $this->route('agent');

        $armementsDeLaSociete = $agent instanceof User
            ? ($agent->consignataire?->armements()->pluck('armements.id')->all() ?? [])
            : [];

        return [
            'armement_ids' => ['array'],
            'armement_ids.*' => ['integer', Rule::in($armementsDeLaSociete)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'armement_ids.*.in' => 'Un agent ne peut être affecté qu\'aux armements représentés par sa société.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['armement_ids' => 'armements affectés'];
    }
}
