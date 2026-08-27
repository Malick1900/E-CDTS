<?php

namespace App\Enums;

/**
 * Où en est le manifeste lui-même — à ne pas confondre avec l'étape du dossier.
 *
 * Deux états seulement à ce stade, ceux du consignataire : il remplit, puis il
 * transmet. Les états du CGC (en dépouillement, validé) viendront avec l'écran
 * qui les produit — les poser d'avance reviendrait à décrire un circuit que
 * personne ne peut encore parcourir.
 *
 * Le passage à `Transmis` est sans retour : après transmission, le manifeste
 * n'est plus modifiable par le consignataire (WF4).
 *
 * @see docs/WORKFLOWS-METIER.md WF4
 */
enum EtatManifeste: string
{
    case Brouillon = 'brouillon';
    case Transmis = 'transmis';

    public function label(): string
    {
        return match ($this) {
            self::Brouillon => 'Brouillon — saisie en cours',
            self::Transmis => 'Transmis au CGC',
        };
    }

    /** Le manifeste se laisse-t-il encore corriger ? */
    public function modifiable(): bool
    {
        return $this === self::Brouillon;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $e): string => $e->value, self::cases());
    }
}
