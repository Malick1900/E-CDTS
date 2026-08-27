<?php

namespace App\DataTransferObjects;

/**
 * Une boîte lue dans un manifeste AWMDS, avant écriture.
 *
 * `taille` est la SEULE chose que le profil gabonais transmette du code ISO
 * 6346 : la nature — sec, frigo, citerne — reste inconnue et ne se devine pas
 * (ADR-0038). `tareKg` est le poids à vide, jamais celui de la marchandise.
 */
final readonly class ConteneurLu
{
    public function __construct(
        public string $reference,
        /** 20, 40 ou 45 — nulle quand le fichier ne donne pas de taille lisible. */
        public ?int $taille,
        public ?int $colis,
        public ?bool $plein,
        public ?int $tareKg,
    ) {}
}
