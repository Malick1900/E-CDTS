<?php

namespace App\Http\Requests\Admin\Users;

use App\Concerns\TitulaireValidationRules;
use App\Enums\Permission;
use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConsignataireUpdateRequest extends FormRequest
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
     * Le titulaire déjà en place, s'il y en a un : il conditionne l'unicité de
     * l'e-mail (la sienne ne doit pas se heurter à elle-même) et le caractère
     * facultatif du mot de passe.
     */
    private function titulaireExistant(): ?User
    {
        $consignataire = $this->route('consignataire');

        return $consignataire instanceof Consignataire ? $consignataire->titulaire : null;
    }

    /**
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
            ...$this->titulaireRules($this->titulaireExistant()),
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
