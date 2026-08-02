<?php

namespace App\Concerns;

use App\Enums\SensTrafic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

/**
 * Les règles d'une ligne de barème, communes à la création et à la modification
 * (ADR-0034) — seule l'unicité de la référence diffère, d'où l'identifiant à
 * ignorer.
 */
trait BaremeLigneValidationRules
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    protected function baremeLigneRules(?int $ignore = null): array
    {
        return [
            'reference' => [
                'required',
                'string',
                'max:20',
                Rule::unique('bareme_lignes', 'reference')->ignore($ignore),
            ],
            'sens' => ['required', Rule::enum(SensTrafic::class)],
            'designation' => ['required', 'string', 'max:255'],
            // En francs CFA. Zéro est une valeur légitime : le document porte
            // deux lignes à 0,00.
            'montant_cfa' => ['required', 'numeric', 'min:0', 'max:9999999999'],
        ];
    }

    /**
     * La référence est normalisée en majuscules : le document officiel les
     * écrit ainsi, et une casse libre ferait passer « exp01 » pour une
     * nouvelle ligne.
     */
    protected function normaliserReference(): void
    {
        $this->merge([
            'reference' => strtoupper(trim((string) $this->input('reference'))),
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reference' => 'référence',
            'sens' => 'sens du trafic',
            'designation' => 'désignation',
            'montant_cfa' => 'montant en francs CFA',
        ];
    }
}
