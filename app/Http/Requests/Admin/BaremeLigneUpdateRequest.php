<?php

namespace App\Http\Requests\Admin;

use App\Concerns\BaremeLigneValidationRules;
use App\Enums\Permission;
use App\Models\BaremeLigne;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BaremeLigneUpdateRequest extends FormRequest
{
    use BaremeLigneValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::BaremeModifier->value) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->normaliserReference();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $ligne = $this->route('ligne');

        return $this->baremeLigneRules($ligne instanceof BaremeLigne ? $ligne->id : null);
    }
}
