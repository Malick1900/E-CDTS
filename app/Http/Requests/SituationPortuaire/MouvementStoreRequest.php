<?php

namespace App\Http\Requests\SituationPortuaire;

use App\Concerns\MouvementNavireValidationRules;
use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Inscription d'un navire à la situation d'un port.
 *
 * Le navire vient du référentiel : la situation ne décrit pas un navire, elle
 * décrit le passage d'un navire déjà connu du CGC.
 */
class MouvementStoreRequest extends FormRequest
{
    use MouvementNavireValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::SituationPortuaireRenseigner->value) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['voyage' => trim((string) $this->input('voyage'))]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'port_id' => ['required', 'integer', Rule::exists('ports', 'id')->where('actif', true)],
            'navire_id' => ['required', 'integer', Rule::exists('navires', 'id')->where('actif', true)],
            'voyage' => ['required', 'string', 'max:40'],
            'consignataire_id' => ['nullable', 'integer', Rule::exists('consignataires', 'id')->where('actif', true)],
            ...$this->reglesDeLEscale((int) $this->input('port_id')),
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $portId = (int) $this->input('port_id');

                $this->verifierUniciteEscale($validator, $portId, (int) $this->input('navire_id'), (string) $this->input('voyage'));
                $this->verifierPosteLibre($validator, $portId, $this->integer('poste_quai_id') ?: null, $this->input('statut'));
            },
        ];
    }
}
