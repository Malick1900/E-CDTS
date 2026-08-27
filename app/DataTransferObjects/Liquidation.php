<?php

namespace App\DataTransferObjects;

use App\Enums\UniteBareme;

/**
 * Le résultat de la liquidation d'une ligne : un montant, et de quoi dire
 * pourquoi c'est celui-là.
 *
 * La référence et l'unité retenues ne sont pas décoratives. Quand un type ouvre
 * une ligne au métrique et une au cubage, c'est la règle de l'unité payante qui
 * tranche — et le consignataire comme l'agent doivent pouvoir lire laquelle a
 * gagné. Un montant nu, sans son article de barème, n'est pas opposable.
 *
 * @see docs/BAREME-CDTS.md §Notes de gestion (unité payante)
 */
final readonly class Liquidation
{
    public function __construct(
        /** En francs CFA — une devise sans subdivision, d'où l'entier. */
        public int $montant,
        /** L'article du barème retenu : « IMP17 », « EXP02B »… */
        public string $reference,
        public UniteBareme $unite,
        /** L'assiette effectivement multipliée — 12,5 tonnes, 3 conteneurs… */
        public float $assiette,
    ) {}
}
