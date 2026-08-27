<?php

namespace App\DataTransferObjects;

/**
 * Un connaissement lu dans un manifeste AWMDS, avant écriture.
 *
 * Les trois assiettes — poids, volume, colis — vivent ICI et nulle part
 * ailleurs : c'est la première règle de totaux (MANIFESTE-XML.md). Une assiette
 * nulle est une assiette ABSENTE du fichier, pas une assiette à zéro.
 */
final readonly class BlLu
{
    public function __construct(
        public string $reference,
        public int $ligneNumero,
        /** Vide sur un BL simple, renseigné sur un house/dégroupage. */
        public ?string $masterReference,
        public ?string $portChargement,
        public ?string $portDechargement,
        public ?string $expediteur,
        public ?string $destinataire,
        public ?string $description,
        public ?int $poidsBrutKg,
        public ?float $volumeM3,
        public ?int $colis,
        /** Ce que le fichier ANNONCE, à confronter aux boîtes réellement listées. */
        public int $conteneursAnnonces,
        public bool $horsConteneur,
        /** @var list<ConteneurLu> */
        public array $conteneurs,
    ) {}
}
