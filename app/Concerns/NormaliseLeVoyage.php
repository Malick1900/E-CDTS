<?php

namespace App\Concerns;

/**
 * La clé de rapprochement d'ADR-0009, des deux côtés à la fois.
 *
 * Le n° de voyage s'écrit comme on l'entend : « 26-114S » à la conférence
 * portuaire, « 26-114 s » chez le consignataire. C'est le même passage. La
 * forme normalisée — MAJUSCULES, espaces supprimés, tirets et caractères
 * spéciaux CONSERVÉS — est ce que l'on compare.
 *
 * Le trait porte la fonction ET le crochet qui maintient la colonne : les deux
 * modèles rapprochés doivent normaliser de la même façon, et l'oubli d'un côté
 * suffirait à laisser des dossiers orphelins en silence. Une seule règle, un
 * seul endroit, appliquée sans qu'on ait à y penser.
 *
 * Les tirets restent significatifs : on préfère un rapprochement manuel à une
 * fusion abusive.
 *
 * @see docs/DECISIONS.md ADR-0009, ADR-0042
 *
 * @property string $voyage
 * @property string $voyage_normalise
 */
trait NormaliseLeVoyage
{
    public static function normaliserVoyage(string $voyage): string
    {
        return preg_replace('/\s+/u', '', mb_strtoupper(trim($voyage))) ?? '';
    }

    /**
     * Booté par Eloquent du seul fait d'utiliser le trait : la forme normalisée
     * se déduit du voyage à chaque écriture, et n'est jamais assignable.
     */
    protected static function bootNormaliseLeVoyage(): void
    {
        static::saving(function (self $modele): void {
            $modele->voyage_normalise = self::normaliserVoyage($modele->voyage);
        });
    }
}
