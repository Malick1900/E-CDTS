<?php

namespace App\Concerns;

use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Models\MouvementNavire;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Les règles d'une ligne de situation portuaire, communes à l'inscription d'un
 * navire et à l'édition en ligne.
 *
 * Deux contrôles ne sont pas exprimables en règles unitaires et vivent donc
 * dans `after()` : l'unicité de l'escale (navire + voyage dans un port) et
 * l'occupation d'un poste. La cohérence statut/dates, elle, n'est PAS contrôlée
 * ici : en conférence on note ce qu'on entend, quitte à compléter après — c'est
 * la publication qui la refuse (ADR-0013).
 */
trait MouvementNavireValidationRules
{
    /**
     * Les statuts pendant lesquels un navire tient son poste. `hors_zone` n'en
     * fait pas partie : le navire a quitté le quai.
     *
     * ⚠ Définition reprise de la maquette — la portée exacte de « hors zone »
     * reste à confirmer par le CGC.
     *
     * @return list<StatutNavire>
     */
    protected function statutsOccupants(): array
    {
        return [StatutNavire::Quai, StatutNavire::ZoneExploitation];
    }

    /**
     * Ce qu'un agent peut changer sur une ligne existante. Ni le port ni le
     * navire n'en font partie : les corriger reviendrait à décrire une autre
     * escale, qui doit être inscrite comme telle.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    protected function reglesDeLEscale(int $portId): array
    {
        return [
            'sens' => ['required', Rule::enum(SensTrafic::class)],
            'statut' => ['required', Rule::enum(StatutNavire::class)],
            'poste_quai_id' => [
                'nullable',
                'integer',
                Rule::exists('postes_quai', 'id')->where('port_id', $portId)->where('actif', true),
            ],
            'eta' => ['nullable', 'date'],
            // Un départ antérieur à l'arrivée est une inversion de saisie, pas
            // une escale.
            'etd' => ['nullable', 'date', 'after:eta'],
        ];
    }

    /**
     * L'escale déjà inscrite : même navire, même voyage, même port. C'est
     * l'unicité que porte la base ; on la vérifie ici pour rendre un message
     * plutôt qu'une erreur SQL.
     *
     * Sur la forme normalisée (ADR-0042) : « 26-114S » et « 26-114 s » ne sont
     * pas deux escales du même navire dans le même port, c'est la même écrite
     * deux fois. Les laisser coexister rendrait de surcroît le rapprochement
     * des dossiers ambigu, donc impossible.
     */
    protected function verifierUniciteEscale(Validator $validator, int $portId, int $navireId, string $voyage, ?int $ignore = null): void
    {
        $existe = MouvementNavire::query()
            ->where('port_id', $portId)
            ->where('navire_id', $navireId)
            ->where('voyage_normalise', MouvementNavire::normaliserVoyage($voyage))
            ->when($ignore !== null, fn ($query) => $query->whereKeyNot($ignore))
            ->exists();

        if ($existe) {
            $validator->errors()->add(
                'voyage',
                __("Ce navire est déjà inscrit à la situation de ce port pour le voyage :voyage. L'escale doit être unique.", ['voyage' => $voyage]),
            );
        }
    }

    /**
     * Un seul navire par poste à un instant t (CHAMPS-DONNEES.md §8). On ne
     * regarde que les navires qui tiennent effectivement leur poste : une
     * escale terminée le libère.
     */
    protected function verifierPosteLibre(Validator $validator, int $portId, ?int $posteId, ?string $statut, ?int $ignore = null): void
    {
        $statutSaisi = $statut === null ? null : StatutNavire::tryFrom($statut);

        if ($posteId === null || $statutSaisi === null || ! in_array($statutSaisi, $this->statutsOccupants(), strict: true)) {
            return;
        }

        $occupant = MouvementNavire::query()
            ->with('navire')
            ->where('port_id', $portId)
            ->where('poste_quai_id', $posteId)
            ->whereIn('statut', array_map(static fn (StatutNavire $s): string => $s->value, $this->statutsOccupants()))
            ->when($ignore !== null, fn ($query) => $query->whereKeyNot($ignore))
            ->first();

        if ($occupant !== null) {
            $validator->errors()->add('poste_quai_id', __('Poste déjà occupé par :navire (voyage :voyage). Un seul navire par poste.', [
                'navire' => $occupant->navire->name,
                'voyage' => $occupant->voyage,
            ]));
        }
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'port_id' => 'port',
            'navire_id' => 'navire',
            'voyage' => 'numéro de voyage',
            'sens' => 'sens',
            'statut' => 'statut',
            'poste_quai_id' => 'poste à quai',
            'eta' => 'ETA',
            'etd' => 'ETD',
            'consignataire_id' => 'consignataire responsable',
        ];
    }
}
