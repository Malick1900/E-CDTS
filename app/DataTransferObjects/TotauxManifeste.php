<?php

namespace App\DataTransferObjects;

/**
 * Le pied du tableau de dépouillement.
 *
 * Trois de ces compteurs obéissent à des règles qu'on ne peut pas relâcher
 * (MANIFESTE-XML.md) : le tonnage et le volume ne se somment qu'une fois par
 * BL, et le nombre de conteneurs se compte en RÉFÉRENCES DISTINCTES — une boîte
 * groupée apparaît sous plusieurs connaissements et ne vaut pourtant qu'une
 * boîte.
 */
final readonly class TotauxManifeste
{
    public function __construct(
        /** Lignes affichées — ni des BL, ni des boîtes. */
        public int $lignes,
        public int $bls,
        /** Références de conteneur distinctes, groupage déduit. */
        public int $conteneurs,
        public int $poidsKg,
        public float $volumeM3,
        /** La CDTS déclarée, en francs CFA. */
        public int $montant,
        public int $qualifiees,
        public int $aQualifier,
    ) {}

    /** Le manifeste peut-il partir au CGC ? Pas une ligne ne doit rester en l'air. */
    public function transmissible(): bool
    {
        return $this->lignes > 0 && $this->aQualifier === 0;
    }
}
