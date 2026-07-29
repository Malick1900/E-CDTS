<?php

namespace App\Http\Requests\Admin\Users;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Refus d'un compte agent. Le motif est obligatoire : c'est lui qui rend la
 * décision opposable (ADR-0024) — un refus sans raison consignée ne prouve rien
 * en cas de litige, et la société ne saurait pas quoi corriger avant de
 * soumettre à nouveau.
 */
class AgentRefuseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ComptesClientsGerer->value) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['motif_refus' => trim((string) $this->input('motif_refus'))]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'motif_refus' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['motif_refus' => 'motif du refus'];
    }
}
