<?php

namespace App\Http\Requests\Admin\Referentiels;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ArmementStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ReferentielsGerer->value) ?? false;
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
            'gerant' => $this->blankToNull(trim((string) $this->input('gerant'))),
            'rccm_nif' => $this->blankToNull(trim((string) $this->input('rccm_nif'))),
            'adresse' => $this->blankToNull(trim((string) $this->input('adresse'))),
        ]);
    }

    private function blankToNull(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'sigle' => ['nullable', 'string', 'max:10'],
            'pays_origine_id' => ['nullable', 'integer', Rule::exists('pays', 'id')],
            'pays_immatriculation_id' => ['nullable', 'integer', Rule::exists('pays', 'id')],
            'gerant' => ['nullable', 'string', 'max:160'],
            'rccm_nif' => ['nullable', 'string', 'max:80'],
            'adresse' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => "nom de l'armement",
            'sigle' => 'sigle',
            'pays_origine_id' => "pays d'origine",
            'pays_immatriculation_id' => "pays d'immatriculation",
            'gerant' => 'gérant',
            'rccm_nif' => 'RCCM / NIF',
            'adresse' => 'adresse',
        ];
    }
}
