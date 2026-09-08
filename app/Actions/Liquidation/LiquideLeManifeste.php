<?php

namespace App\Actions\Liquidation;

use App\DataTransferObjects\LigneManifeste;
use App\DataTransferObjects\Liquidation;
use App\DataTransferObjects\TotauxManifeste;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;

/**
 * Déplie un manifeste en lignes affichables, chacune avec son montant.
 *
 * C'est ici que les deux mailles se rencontrent. Le manifeste est un arbre —
 * des BL, et sous chacun ses boîtes ; le tableau de dépouillement est une
 * liste plate. Le dépliage suit trois règles dont aucune n'est négociable
 * (MANIFESTE-XML.md) :
 *
 * 1. **Poids et volume ne se répètent pas.** Ils appartiennent au BL. Une seule
 *    ligne du BL les porte — celle qui les facture s'il y a une part vrac, la
 *    première sinon — et le total les compte une fois.
 * 2. **Le montant suit le moteur.** Une boîte se facture au forfait, ligne par
 *    ligne. Une assiette de connaissement — tonnes, mètres cubes, unités — se
 *    facture une seule fois, quel que soit le nombre de lignes qui la portent.
 * 3. **Les conteneurs se comptent en références distinctes.** Une boîte groupée
 *    figure sous plusieurs BL sans valoir plusieurs boîtes.
 *
 * **Le bois ne se facture jamais au conteneur** (CGC, 2026-08-27). Même
 * enfermé dans des boîtes, il se paie au mètre cube : les conteneurs d'un
 * connaissement de bois partagent donc UN montant, calculé une fois sur le
 * volume du BL. C'est le cas général d'une règle simple — une boîte qualifiée
 * d'un type qui ne se facture pas au conteneur réclame l'assiette de son
 * connaissement, elle ne génère pas de forfait.
 *
 * Le sens et le mode d'exploitation viennent de l'ESCALE, jamais du navire :
 * c'est le dossier qui fait foi pour la facturation (ENTITES §2).
 */
final class LiquideLeManifeste
{
    public function __construct(private LiquideUneLigne $liquideUneLigne) {}

    /**
     * @return array{lignes: list<LigneManifeste>, totaux: TotauxManifeste}
     */
    public function handle(Manifeste $manifeste): array
    {
        $escale = $manifeste->escale;
        $sens = $escale->sens;
        $mode = $escale->mode_exploitation;

        $bls = $manifeste->bls()
            ->with('conteneurs')
            ->orderBy('ligne_numero')
            ->orderBy('id')
            ->get();

        /** @var list<LigneManifeste> $lignes */
        $lignes = [];
        $numero = 0;
        $poidsTotal = 0;
        $volumeTotal = 0.0;
        $montantTotal = 0;
        $qualifiees = 0;
        $aQualifier = 0;
        /** @var array<string, true> $boites */
        $boites = [];

        foreach ($bls as $bl) {
            $conteneurs = $bl->conteneurs;

            $liquidationBl = $this->liquidationDuBl($bl, $sens, $mode);

            // Les assiettes se lisent sur la ligne qui les facture : la part
            // hors conteneur s'il y en a une, sinon la première boîte qui les
            // réclame, sinon la première tout court — il faut bien les montrer
            // quelque part, et une fois seulement.
            $porteuse = $bl->hors_conteneur ? -1 : $this->premiereReclamante($bl);

            foreach ($conteneurs as $index => $conteneur) {
                $numero++;

                // La boîte a-t-elle déjà été facturée sous un connaissement
                // précédent ? Le registre sert aux deux : il compte les boîtes
                // distinctes, et il dit laquelle a déjà payé son forfait.
                $dejaFacturee = isset($boites[$conteneur->reference]);
                $boites[$conteneur->reference] = true;

                $lignes[] = $this->ligneConteneur(
                    $bl,
                    $conteneur,
                    $numero,
                    porte: $index === $porteuse,
                    dejaFacturee: $dejaFacturee,
                    sens: $sens,
                    mode: $mode,
                    liquidationBl: $liquidationBl,
                );
            }

            if ($bl->hors_conteneur) {
                $numero++;
                $lignes[] = $this->ligneVrac($bl, $numero, $liquidationBl);
            }

            // Une fois par BL, quoi qu'il arrive — c'est la règle 1.
            $poidsTotal += $bl->poids_brut_kg ?? 0;
            $volumeTotal += $bl->volume() ?? 0.0;
        }

        foreach ($lignes as $ligne) {
            if ($ligne->aQualifier()) {
                $aQualifier++;

                continue;
            }

            $qualifiees++;

            // Une ligne portée par son connaissement n'ajoute rien : son
            // montant est déjà compté sur la ligne qui le porte.
            if ($ligne->liquidation !== null) {
                $montantTotal += $ligne->liquidation->montant;
            }
        }

        return [
            'lignes' => $lignes,
            'totaux' => new TotauxManifeste(
                lignes: count($lignes),
                bls: $bls->count(),
                conteneurs: count($boites),
                poidsKg: $poidsTotal,
                volumeM3: round($volumeTotal, 3),
                montant: $montantTotal,
                qualifiees: $qualifiees,
                aQualifier: $aQualifier,
            ),
        ];
    }

    /**
     * Une boîte — un forfait, ou une part de l'assiette de son connaissement.
     *
     * Qualifiée d'un type conteneur, elle se facture seule : un forfait, une
     * ligne. Qualifiée d'un type qui ne se facture pas au conteneur — le bois,
     * qui se paie au mètre cube même en boîte — elle partage le montant du
     * connaissement avec ses jumelles, et seule la ligne porteuse l'affiche.
     * Les autres ne sont pas « à qualifier » pour autant : elles sont
     * déclarées, simplement pas facturées séparément.
     *
     * **Une boîte groupée ne paie qu'une fois** (CGC, 2026-08-28, ADR-0049).
     * Le conteneur partagé entre plusieurs connaissements n'est manutentionné
     * qu'une fois : son forfait est porté par le premier BL qui le déclare, et
     * ses occurrences suivantes s'affichent sans montant. C'est la même règle
     * que le « TOTAL TC » compte déjà en références distinctes — le montant la
     * suit désormais.
     */
    private function ligneConteneur(
        ManifesteBl $bl,
        ManifesteConteneur $conteneur,
        int $numero,
        bool $porte,
        bool $dejaFacturee,
        SensTrafic $sens,
        ?ModeExploitation $mode,
        ?Liquidation $liquidationBl,
    ): LigneManifeste {
        $type = $conteneur->type_marchandise;
        $auForfait = $type !== null && $type->estConteneur();

        return new LigneManifeste(
            cle: 'c:'.$conteneur->id,
            numero: $numero,
            bl: $bl->reference,
            blId: $bl->id,
            groupage: $bl->groupage(),
            portChargement: $bl->port_chargement,
            portChargementNom: $bl->port_chargement_nom,
            portDechargement: $bl->port_dechargement,
            portDechargementNom: $bl->port_dechargement_nom,
            expediteur: $bl->expediteur,
            destinataire: $bl->destinataire,
            conteneur: $conteneur->reference,
            taille: $conteneur->taille,
            description: $bl->description,
            poidsKg: $porte ? $bl->poids_brut_kg : null,
            volumeM3: $porte ? $bl->volume() : null,
            colis: $porte ? $bl->colis : null,
            type: $type,
            liquidation: match (true) {
                $type === null => null,
                // La boîte déjà facturée sous un BL précédent s'affiche, mais
                // ne rappelle pas son forfait : une manutention, un montant.
                $auForfait => $dejaFacturee ? null : $this->liquideUneLigne->handle(
                    type: $type,
                    sens: $sens,
                    conteneurs: 1,
                    mode: $mode,
                ),
                default => $porte ? $liquidationBl : null,
            },
            porteeAilleurs: $auForfait
                ? $dejaFacturee
                : ! $porte && $liquidationBl !== null,
        );
    }

    /** La part du BL qui n'est dans aucune boîte : l'assiette du connaissement. */
    private function ligneVrac(
        ManifesteBl $bl,
        int $numero,
        ?Liquidation $liquidationBl,
    ): LigneManifeste {
        $type = $bl->type_marchandise;

        return new LigneManifeste(
            cle: 'v:'.$bl->id,
            numero: $numero,
            bl: $bl->reference,
            blId: $bl->id,
            groupage: $bl->groupage(),
            portChargement: $bl->port_chargement,
            portChargementNom: $bl->port_chargement_nom,
            portDechargement: $bl->port_dechargement,
            portDechargementNom: $bl->port_dechargement_nom,
            expediteur: $bl->expediteur,
            destinataire: $bl->destinataire,
            conteneur: null,
            taille: null,
            description: $bl->description,
            poidsKg: $bl->poids_brut_kg,
            volumeM3: $bl->volume(),
            colis: $bl->colis,
            type: $type,
            liquidation: $liquidationBl,
        );
    }

    /**
     * Le montant que porte l'assiette du connaissement — son poids, son volume,
     * ses unités.
     *
     * Le réclament : les boîtes qualifiées d'un type qui ne se facture pas au
     * conteneur, et la part hors conteneur s'il y en a une.
     *
     * **Deux prétendants de types différents, et l'on ne facture pas.** Le
     * manifeste donne UN poids et UN volume pour tout le connaissement, sans
     * dire ce qui revient à quoi : les répartir serait une devinette, et la
     * règle d'or l'interdit. Les lignes concernées restent à qualifier.
     */
    private function liquidationDuBl(
        ManifesteBl $bl,
        SensTrafic $sens,
        ?ModeExploitation $mode,
    ): ?Liquidation {
        /** @var array<string, TypeMarchandise> $reclamants */
        $reclamants = [];

        foreach ($bl->conteneurs as $conteneur) {
            $type = $conteneur->type_marchandise;

            if ($type !== null && ! $type->estConteneur()) {
                $reclamants[$type->value] = $type;
            }
        }

        if ($bl->hors_conteneur && $bl->type_marchandise !== null) {
            $reclamants[$bl->type_marchandise->value] = $bl->type_marchandise;
        }

        if (count($reclamants) !== 1) {
            return null;
        }

        return $this->liquideUneLigne->handle(
            type: reset($reclamants),
            sens: $sens,
            poidsKg: $bl->poids_brut_kg,
            volumeM3: $bl->volume(),
            unites: $bl->colis,
            mode: $mode,
        );
    }

    /**
     * L'index de la première boîte qui réclame l'assiette du connaissement —
     * zéro à défaut, pour que poids et volume s'affichent quelque part.
     */
    private function premiereReclamante(ManifesteBl $bl): int
    {
        foreach ($bl->conteneurs as $index => $conteneur) {
            $type = $conteneur->type_marchandise;

            if ($type !== null && ! $type->estConteneur()) {
                return $index;
            }
        }

        return 0;
    }
}
