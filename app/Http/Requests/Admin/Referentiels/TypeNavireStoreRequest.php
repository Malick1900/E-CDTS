<?php

namespace App\Http\Requests\Admin\Referentiels;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TypeNavireStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ReferentielsGerer->value) ?? false;
    }

    /**
     * Le code est normalisé (majuscules, sans espaces superflus) avant contrôle
     * d'unicité — on évite les doublons ne différant que par la casse.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('types_navire', 'code')],
            'name' => ['required', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['code' => 'code', 'name' => 'désignation'];
    }
}
