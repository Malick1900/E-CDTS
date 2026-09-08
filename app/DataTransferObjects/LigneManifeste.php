<?php

namespace App\DataTransferObjects;

use App\Enums\TypeMarchandise;

/**
 * Une ligne du tableau de dépouillement, telle qu'elle s'affiche.
 *
 * Le tableau est à plat — une ligne par conteneur, plus une ligne pour la part
 * non conteneurisée d'un BL — alors que la facturation, elle, reste au BL pour
 * le poids et au conteneur pour le forfait. Cet objet est le point de jonction
 * des deux mailles : il porte ce qu'on lit, et le montant qu'on doit.
 *
 * `poidsKg`, `volumeM3` et `colis` ne sont renseignés que sur UNE ligne par BL
 * — celle qui les facture s'il y en a une, la première sinon. Les autres lignes
 * du même BL les laissent nuls : c'est ce qui empêche le pied de tableau de
 * compter trois fois le tonnage d'un BL à trois boîtes.
 *
 * @see docs/MANIFESTE-XML.md §Maille d'affichage vs maille de facturation
 */
final readonly class LigneManifeste
{
    public function __construct(
        /** « c:12 » pour un conteneur, « v:34 » pour la part vrac d'un BL. */
        public string $cle,
        public int $numero,
        public string $bl,
        /** L'identifiant du connaissement — la maille où l'on corrige. */
        public int $blId,
        public bool $groupage,
        public ?string $portChargement,
        public ?string $portChargementNom,
        public ?string $portDechargement,
        public ?string $portDechargementNom,
        public ?string $expediteur,
        public ?string $destinataire,
        /** Le n° de boîte — nul sur une ligne de vrac. */
        public ?string $conteneur,
        /** 20, 40 ou 45 — la taille seule, jamais le code ISO complet. */
        public ?int $taille,
        public ?string $description,
        public ?int $poidsKg,
        public ?float $volumeM3,
        public ?int $colis,
        public ?TypeMarchandise $type,
        /** Nulle tant que la ligne n'est pas qualifiée, ou faute d'assiette. */
        public ?Liquidation $liquidation,
        /**
         * La ligne est qualifiée, mais son montant est compté sur une autre
         * ligne. Deux situations, un seul principe : on ne facture pas deux
         * fois le même service.
         *
         * **Le bois** ne se facture jamais au conteneur, même quand il voyage
         * en conteneurs (CGC, 2026-08-27). Les boîtes d'un même BL partagent
         * alors UN montant, calculé une fois sur le volume du connaissement.
         *
         * **La boîte groupée** figure sous plusieurs connaissements, mais n'est
         * manutentionnée qu'une fois : son forfait est porté par le premier BL
         * qui la déclare (CGC, 2026-08-28, ADR-0049).
         *
         * Dans les deux cas la ligne n'est pas « à qualifier » : elle est
         * déclarée, simplement pas facturée séparément.
         */
        public bool $porteeAilleurs = false,
    ) {}

    /** La ligne attend-elle encore qu'on dise ce qu'elle est ? */
    public function aQualifier(): bool
    {
        return $this->liquidation === null && ! $this->porteeAilleurs;
    }
}
