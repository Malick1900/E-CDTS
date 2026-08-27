<?php

namespace App\DataTransferObjects;

/**
 * Le `General_segment` d'un manifeste AWMDS — ce que le fichier dit de
 * l'escale avant qu'on descende dans les connaissements.
 *
 * C'est l'en-tête que l'aperçu d'import montre au consignataire : le voyage,
 * le navire et son identité, qui transporte, quand le navire est arrivé, et
 * les totaux que le fichier annonce sur lui-même. Rien n'est déduit — un champ
 * que le profil ne renseigne pas reste nul et s'affiche comme absent.
 *
 * Les dates arrivent telles que le fichier les écrit (`AAAA-MM-JJ`) : les
 * transformer en instants ferait naître un fuseau que le manifeste n'exprime
 * pas.
 *
 * @see docs/MANIFESTE-XML.md
 */
final readonly class EnTeteLu
{
    public function __construct(
        /** Le bureau de douane émetteur — OW100, OW110, GAPOG. Pas un port. */
        public ?string $bureau,
        public ?string $voyage,
        public ?string $navire,
        /** Le pavillon, en code ISO 3166-1 alpha-2 : LR, PA, AG… */
        public ?string $pavillon,
        /** N° OMI ou indicatif d'appel, selon le profil du transporteur. */
        public ?string $immatriculation,
        /** La compagnie qui émet le manifeste — souvent l'agent local. */
        public ?string $transporteur,
        public ?string $agent,
        public ?string $dateDepart,
        public ?string $dateArrivee,
        /** UN/LOCODE du port d'où part le navire, et de celui qu'il dessert. */
        public ?string $portDepart,
        public ?string $portDestination,
        /** Le fichier porte-t-il un `Totals_segment` ? Sans lui, rien à confronter. */
        public bool $totauxPresents,
        public ?int $blsAnnonces,
        public ?int $colisAnnonces,
        public ?int $conteneursAnnonces,
        public ?int $masseAnnonceeKg,
    ) {}
}
