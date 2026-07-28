<?php

namespace App\Http\Requests\Admin\Referentiels;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PortStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ReferentielsGerer->value) ?? false;
    }

    /**
     * Le code UN/LOCODE est mis en majuscules et débarrassé de TOUS ses espaces
     * avant contrôle d'unicité : « GA OWE » et « GAOWE » désignent le même port,
     * la contrainte ne doit pas laisser passer les deux. Le préfixe de
     * numérotation, facultatif, retombe à null lorsqu'il est laissé vide.
     */
    protected function prepareForValidation(): void
    {
        $prefixe = strtoupper(trim((string) $this->input('prefixe_numerotation')));

        $this->merge([
            'code' => strtoupper((string) preg_replace('/\s+/', '', (string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
            'prefixe_numerotation' => $prefixe !== '' ? $prefixe : null,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:10', Rule::unique('ports', 'code')],
            'name' => ['required', 'string', 'max:120'],
            'pays_id' => ['nullable', 'integer', Rule::exists('pays', 'id')],
            'prefixe_numerotation' => ['nullable', 'string', 'max:10'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'code UN/LOCODE',
            'name' => 'nom du port',
            'pays_id' => 'pays',
            'prefixe_numerotation' => 'préfixe de numérotation',
        ];
    }
}
