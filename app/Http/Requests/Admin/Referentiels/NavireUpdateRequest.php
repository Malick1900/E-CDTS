<?php

namespace App\Http\Requests\Admin\Referentiels;

use App\Enums\ModeExploitation;
use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class NavireUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ReferentielsGerer->value) ?? false;
    }

    /**
     * Le code IMO est normalisé (sans espaces) avant contrôle d'unicité, et
     * ramené à null s'il est vide : la colonne est unique, une chaîne vide
     * ferait échouer l'enregistrement du deuxième navire sans IMO.
     */
    protected function prepareForValidation(): void
    {
        $imo = str_replace(' ', '', trim((string) $this->input('imo')));

        $this->merge([
            'name' => trim((string) $this->input('name')),
            'imo' => $imo === '' ? null : $imo,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            // Le numéro IMO fait exactement 7 chiffres et reste facultatif :
            // tous les navires n'en ont pas (d'où le passage à null plus haut).
            'imo' => [
                'nullable', 'string', 'digits:7',
                Rule::unique('navires', 'imo')->ignore($this->route('navire')),
            ],
            'pays_id' => ['nullable', 'integer', Rule::exists('pays', 'id')],
            'type_navire_id' => ['nullable', 'integer', Rule::exists('types_navire', 'id')],
            'armement_id' => ['nullable', 'integer', Rule::exists('armements', 'id')],
            'mode_exploitation_defaut' => ['nullable', Rule::enum(ModeExploitation::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nom du navire',
            'imo' => 'code IMO',
            'pays_id' => 'pavillon',
            'type_navire_id' => 'type de navire',
            'armement_id' => 'armement',
            'mode_exploitation_defaut' => "mode d'exploitation",
        ];
    }
}
