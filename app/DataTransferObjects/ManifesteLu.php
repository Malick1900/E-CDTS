<?php

namespace App\DataTransferObjects;

use App\Enums\TypeMarchandise;

/**
 * Un manifeste AWMDS tel que le parseur l'a lu — avant toute écriture.
 *
 * `anomalies` porte ce qui a été relevé sans faire échouer l'import : un écart
 * de masse au-delà de la tolérance, des totaux de contrôle absents, une
 * identité de navire que le référentiel dément. Ce qui fait vraiment échouer ne
 * remonte pas ici — cela lève.
 *
 * `enTete` porte le `General_segment` : c'est de lui que l'aperçu d'import tire
 * son résumé, sans avoir à relire le fichier.
 *
 * @see docs/MANIFESTE-XML.md
 */
final readonly class ManifesteLu
{
    public function __construct(
        public EnTeteLu $enTete,
        /** @var list<BlLu> */
        public array $bls,
        /** @var list<string> */
        public array $anomalies,
    ) {}

    /** Le nombre de boîtes : des références DISTINCTES, groupage déduit. */
    public function conteneurs(): int
    {
        $boites = [];

        foreach ($this->bls as $bl) {
            foreach ($bl->conteneurs as $conteneur) {
                $boites[$conteneur->reference] = true;
            }
        }

        return count($boites);
    }

    /** La masse cumulée, une fois par connaissement — jamais par boîte. */
    public function poidsBrutKg(): int
    {
        return array_sum(array_map(static fn (BlLu $bl): int => $bl->poidsBrutKg ?? 0, $this->bls));
    }

    /** Le cubage cumulé, à la même maille que la masse. */
    public function volumeM3(): float
    {
        return array_sum(array_map(static fn (BlLu $bl): float => $bl->volumeM3 ?? 0.0, $this->bls));
    }

    /**
     * Combien de lignes l'import laissera « à qualifier ».
     *
     * Le compte se fait à la maille du tableau de dépouillement — une ligne par
     * boîte, plus une par part hors conteneur — et il applique l'arbitre de
     * l'import lui-même : une boîte dont la taille est lisible se pré-qualifie,
     * les autres attendent l'opérateur. Une part hors conteneur n'est jamais
     * pré-qualifiée : le fichier ne dit pas ce qu'elle est.
     */
    public function aQualifier(): int
    {
        $reste = 0;

        foreach ($this->bls as $bl) {
            if ($bl->horsConteneur) {
                $reste++;
            }

            foreach ($bl->conteneurs as $conteneur) {
                if (TypeMarchandise::conteneurDepuis($conteneur->taille, $bl->description) === null) {
                    $reste++;
                }
            }
        }

        return $reste;
    }
}
