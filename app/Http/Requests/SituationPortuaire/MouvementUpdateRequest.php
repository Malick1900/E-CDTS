<?php

namespace App\Http\Requests\SituationPortuaire;

use App\Concerns\MouvementNavireValidationRules;
use App\Enums\Permission;
use App\Models\MouvementNavire;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Édition en ligne d'une escale déjà inscrite : sens, statut, poste et dates.
 *
 * Le port et le navire n'y figurent pas — les changer décrirait une autre
 * escale, à inscrire comme telle.
 */
class MouvementUpdateRequest extends FormRequest
{
    use MouvementNavireValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can(Permission::SituationPortuaireRenseigner->value) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->reglesDeLEscale($this->mouvement()->port_id);
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

                $mouvement = $this->mouvement();

                $this->verifierPosteLibre(
                    $validator,
                    $mouvement->port_id,
                    $this->integer('poste_quai_id') ?: null,
                    $this->input('statut'),
                    $mouvement->id,
                );
            },
        ];
    }

    private function mouvement(): MouvementNavire
    {
        $mouvement = $this->route('mouvement');

        assert($mouvement instanceof MouvementNavire);

        return $mouvement;
    }
}
