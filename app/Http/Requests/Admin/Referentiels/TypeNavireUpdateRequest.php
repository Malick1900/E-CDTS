<?php

namespace App\Http\Requests\Admin\Referentiels;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TypeNavireUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ReferentielsGerer->value) ?? false;
    }

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
            'code' => [
                'required', 'string', 'max:20',
                Rule::unique('types_navire', 'code')->ignore($this->route('typeNavire')),
            ],
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
