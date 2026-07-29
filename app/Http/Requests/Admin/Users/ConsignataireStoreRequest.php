<?php

namespace App\Http\Requests\Admin\Users;

use App\Concerns\TitulaireValidationRules;
use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConsignataireStoreRequest extends FormRequest
{
    use TitulaireValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ComptesClientsGerer->value) ?? false;
    }

    /**
     * Le sigle est normalisé en majuscules. Les champs facultatifs laissés vides
     * par le formulaire sont ramenés à null — on ne stocke jamais de chaîne vide.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'sigle' => $this->blankToNull(strtoupper(trim((string) $this->input('sigle')))),
            'rccm_nif' => $this->blankToNull(trim((string) $this->input('rccm_nif'))),
            'adresse' => $this->blankToNull(trim((string) $this->input('adresse'))),
            'telephone' => $this->blankToNull(trim((string) $this->input('telephone'))),
            'email' => $this->blankToNull(trim((string) $this->input('email'))),
            ...$this->titulaireNormalise(),
        ]);
    }

    private function blankToNull(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    /**
     * Le nombre de ports de rattachement n'est pas borné : l'ADR-0014 en cite
     * deux parce que le Gabon en compte deux aujourd'hui, pas parce que la règle
     * l'impose. C'est le référentiel qui fait foi.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'sigle' => ['nullable', 'string', 'max:10'],
            'rccm_nif' => ['nullable', 'string', 'max:80'],
            'pays_immatriculation_id' => ['nullable', 'integer', Rule::exists('pays', 'id')],
            'adresse' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'armement_ids' => ['array'],
            'armement_ids.*' => ['integer', Rule::exists('armements', 'id')],
            'port_ids' => ['array'],
            'port_ids.*' => ['integer', Rule::exists('ports', 'id')],
            // Le compte maître de la société — facultatif à la création de la
            // fiche, obligatoire dès qu'une adresse e-mail est saisie.
            ...$this->titulaireRules(null),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'raison sociale',
            'sigle' => 'sigle',
            'rccm_nif' => 'RCCM / NIF',
            'pays_immatriculation_id' => "pays d'immatriculation",
            'adresse' => 'adresse',
            'telephone' => 'téléphone',
            'email' => 'adresse e-mail',
            'armement_ids' => 'armements représentés',
            'port_ids' => 'ports de rattachement',
            ...$this->titulaireAttributes(),
        ];
    }
}
