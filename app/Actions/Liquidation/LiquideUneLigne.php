<?php

namespace App\Actions\Liquidation;

use App\DataTransferObjects\Liquidation;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Enums\UniteBareme;
use App\Models\BaremeLigne;
use Illuminate\Support\Collection;

/**
 * Ce que coûte une ligne de manifeste, une fois qu'on a dit ce qu'elle est.
 *
 * Le chemin est celui du barème (ADR-0044) : le type de marchandise et le sens
 * du dossier désignent un petit paquet de lignes ; le mode d'exploitation en
 * écarte pour le seul bois ; l'assiette disponible fait le reste.
 *
 * **La règle de l'unité payante y est centrale.** Quand un type ouvre une ligne
 * au métrique ET une au cubage, on calcule les deux et on retient la plus
 * élevée — c'est la règle du CGC, à son avantage (BAREME-CDTS.md). Elle n'a de
 * sens que parce que chaque ligne déclare son unité.
 *
 * **On ne devine jamais.** Pas d'assiette, pas de montant : l'action rend null
 * et la ligne reste « à qualifier ». C'est la règle d'or du dépouillement
 * (MANIFESTE-XML.md) — un véhicule dont le manifeste annonce zéro colis ne se
 * facture pas au jugé, il remonte à l'opérateur. Zéro devinette = zéro erreur
 * silencieuse.
 *
 * @see docs/BAREME-CDTS.md
 * @see docs/MANIFESTE-XML.md §Typologie des BL et règle d'or
 */
final class LiquideUneLigne
{
    /**
     * Le barème ne bouge pas pendant qu'on liquide un manifeste : on ne le
     * relit pas une fois par ligne. La clé est le couple type + sens.
     *
     * @var array<string, Collection<int, BaremeLigne>>
     */
    private array $lignes = [];

    /**
     * @param  int  $conteneurs  Nombre de boîtes — l'assiette du forfait.
     * @param  int|null  $poidsKg  Poids brut du BL, en kilos.
     * @param  float|null  $volumeM3  Volume du BL, en mètres cubes.
     * @param  int|null  $unites  Colis ou véhicules — l'assiette à la pièce.
     * @param  ModeExploitation|null  $mode  Celui de l'ESCALE, jamais du navire.
     */
    public function handle(
        TypeMarchandise $type,
        SensTrafic $sens,
        int $conteneurs = 0,
        ?int $poidsKg = null,
        ?float $volumeM3 = null,
        ?int $unites = null,
        ?ModeExploitation $mode = null,
    ): ?Liquidation {
        $candidates = $this->candidates($type, $sens, $mode);

        $meilleure = null;

        foreach ($candidates as $ligne) {
            $unite = $ligne->unite;

            if ($unite === null) {
                continue;
            }

            $assiette = $this->assiette($unite, $conteneurs, $poidsKg, $volumeM3, $unites);

            if ($assiette === null) {
                continue;
            }

            // Le franc CFA n'a pas de subdivision : le montant opposable est
            // l'entier. On arrondit une seule fois, sur le produit — arrondir
            // le tarif d'abord décalerait tout un manifeste.
            $montant = (int) round((float) $ligne->montant_cfa * $assiette);

            if ($meilleure === null || $montant > $meilleure->montant) {
                $meilleure = new Liquidation($montant, $ligne->reference, $unite, $assiette);
            }
        }

        return $meilleure;
    }

    /**
     * Les lignes de barème qui peuvent tarifer ce type, dans ce sens.
     *
     * Pour le bois export, le mode d'exploitation de l'escale départage : la
     * grume part environ 13 % plus cher en tramping.
     *
     * **Sans mode déclaré, on ne facture pas.** Le document ne porte pas de
     * tarif bois « par défaut » : la ligne générique qu'on y lisait (EXP02) est
     * une transcription incomplète, confirmée comme telle par le CGC le
     * 2026-08-27. La ligne reste donc à qualifier — un tarif intermédiaire
     * choisi ici serait un montant que personne n'a arrêté.
     *
     * Le cas est résiduel : une escale naît toujours avec un mode, celui du
     * navire ou la ligne régulière à défaut (`Escale::heriteLeModeDExploitation`).
     * Ce garde-fou ne protège plus que les dossiers antérieurs à cette règle.
     *
     * @return Collection<int, BaremeLigne>
     */
    private function candidates(
        TypeMarchandise $type,
        SensTrafic $sens,
        ?ModeExploitation $mode,
    ): Collection {
        $toutes = $this->duType($type, $sens);

        if (! $type->suitLeModeDExploitation()) {
            return $toutes->whereNull('mode_exploitation');
        }

        return $mode === null
            ? $toutes->take(0)
            : $toutes->where('mode_exploitation', $mode);
    }

    /**
     * @return Collection<int, BaremeLigne>
     */
    private function duType(TypeMarchandise $type, SensTrafic $sens): Collection
    {
        $cle = $type->value.'|'.$sens->value;

        return $this->lignes[$cle] ??= BaremeLigne::query()
            ->where('type_marchandise', $type)
            ->where('sens', $sens)
            ->where('actif', true)
            ->whereNotNull('unite')
            ->orderBy('reference')
            ->get();
    }

    /**
     * Ce par quoi on multiplie le tarif — null quand le manifeste ne le dit
     * pas.
     *
     * Zéro vaut absence, et non « rien à payer » : un BL de véhicules annonçant
     * `Number_of_packages = 0` n'est pas gratuit, il est incomplet
     * (MANIFESTE-XML.md, constat du 2026-07-28). Le facturer à zéro serait une
     * perte silencieuse pour le CGC.
     */
    private function assiette(
        UniteBareme $unite,
        int $conteneurs,
        ?int $poidsKg,
        ?float $volumeM3,
        ?int $unites,
    ): ?float {
        $valeur = match ($unite) {
            UniteBareme::Forfait => (float) $conteneurs,
            UniteBareme::Tonne => $poidsKg === null ? null : $poidsKg / 1000,
            UniteBareme::MetreCube => $volumeM3,
            UniteBareme::Unite => $unites === null ? null : (float) $unites,
        };

        return $valeur === null || $valeur <= 0.0 ? null : $valeur;
    }
}
