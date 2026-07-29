<?php

namespace App\Http\Requests\Admin\Users;

use App\Concerns\TitulaireValidationRules;
use App\Enums\Permission;
use App\Enums\StatutValidation;
use App\Models\Consignataire;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Remplacement du titulaire d'une société (ADR-0027).
 *
 * Deux cas réels, deux formes de requête : désigner un agent déjà validé de la
 * société (réorganisation interne), ou ouvrir le compte d'une nouvelle personne
 * (le précédent titulaire est parti). L'un ou l'autre, jamais les deux.
 *
 * Action sensible : elle transfère la capacité de créer des comptes. Elle
 * rejoindra le journal d'audit quand celui-ci existera.
 */
class TitulaireRemplacementRequest extends FormRequest
{
    use TitulaireValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ComptesClientsGerer->value) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge($this->titulaireNormalise());
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        $consignataire = $this->route('consignataire');

        return [
            // Un agent de CETTE société, déjà validé : on ne promeut pas un
            // compte en attente, et encore moins celui d'une autre société.
            'agent_id' => [
                'nullable',
                'required_without:titulaire_email',
                'integer',
                Rule::exists('users', 'id')
                    ->where('consignataire_id', $consignataire instanceof Consignataire ? $consignataire->id : 0)
                    ->where('statut_validation', StatutValidation::Valide->value),
            ],
            ...$this->titulaireRules(null),
            'titulaire_email' => [
                'nullable',
                'required_without:agent_id',
                'prohibited_unless:agent_id,null',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'agent_id.required_without' => 'Choisissez un agent existant ou saisissez la nouvelle personne.',
            'agent_id.exists' => 'Cet agent n\'appartient pas à la société ou n\'est pas validé.',
            'titulaire_email.prohibited_unless' => 'Choisissez un agent existant OU une nouvelle personne, pas les deux.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['agent_id' => 'agent désigné', ...$this->titulaireAttributes()];
    }
}
