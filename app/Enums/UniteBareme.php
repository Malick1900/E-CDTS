<?php

namespace App\Enums;

/**
 * L'assiette sur laquelle une ligne de barème se calcule.
 *
 * Le document du CGC ne nomme pas cette colonne : elle se lit dans la
 * désignation (« DECLARE EN METRIQUE », « DECLARE EN CUBAGE », « CONTENEUR 20
 * PIEDS »…). La rendre explicite est ce qui permet à la liquidation de choisir
 * seule le bon multiplicateur — et à l'écran du barème de dire à quoi chaque
 * ligne s'applique.
 *
 * C'est aussi ce qui rend calculable la **règle de l'unité payante**
 * (BAREME-CDTS.md, §Notes de gestion) : quand un type ouvre une ligne au
 * métrique ET une au cubage, on calcule les deux et on retient la plus élevée.
 * Sans unité déclarée, la comparaison n'a pas de sens.
 *
 * @see docs/BAREME-CDTS.md
 * @see docs/DECISIONS.md ADR-0034 (le barème est tenu en francs), ADR-0044
 */
enum UniteBareme: string
{
    /** Par conteneur, quel que soit son contenu — le tarif est un forfait. */
    case Forfait = 'forfait';

    /** À la tonne, sur le poids brut du BL. Le barème dit « métrique ». */
    case Tonne = 'tonne';

    /** Au mètre cube, sur le volume du BL. Le barème dit « cubage ». */
    case MetreCube = 'm3';

    /** À la pièce — les véhicules de tourisme, et eux seuls. */
    case Unite = 'unite';

    public function label(): string
    {
        return match ($this) {
            self::Forfait => 'Au conteneur',
            self::Tonne => 'À la tonne',
            self::MetreCube => 'Au mètre cube',
            self::Unite => 'À l\'unité',
        };
    }

    /** Le suffixe qu'on lit derrière un montant : « 1 312 F / t ». */
    public function suffixe(): string
    {
        return match ($this) {
            self::Forfait => 'TC',
            self::Tonne => 't',
            self::MetreCube => 'm³',
            self::Unite => 'unité',
        };
    }

    /**
     * L'assiette de cette unité se lit-elle au niveau du BL ?
     *
     * Poids et volume sont portés par le `Goods_segment`, donc par le BL, et
     * ne se répètent jamais par conteneur (MANIFESTE-XML.md, règle de totaux
     * n° 1). Le forfait, lui, se compte boîte par boîte.
     */
    public function auNiveauDuBl(): bool
    {
        return $this !== self::Forfait;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $u): string => $u->value, self::cases());
    }
}
