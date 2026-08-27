<?php

namespace App\Enums;

/**
 * Par où le manifeste est entré dans e-CDTS (WF4).
 *
 * Ce n'est pas une préférence d'ergonomie : le mode décide de la pièce
 * probante. En XML, le fichier SYDONIA fait foi. En manuel, c'est le PDF joint
 * — obligatoire et bloquant — que l'agent CGC rejouera ligne par ligne au
 * dépouillement.
 *
 * @see docs/WORKFLOWS-METIER.md WF4
 */
enum ModeSaisieManifeste: string
{
    case Xml = 'xml';
    case Manuel = 'manuel';

    public function label(): string
    {
        return match ($this) {
            self::Xml => 'Import XML SYDONIA',
            self::Manuel => 'Saisie manuelle',
        };
    }

    /** Le mode exige-t-il un PDF joint pour que le manifeste soit soumis ? */
    public function exigeUnePieceJointe(): bool
    {
        return $this === self::Manuel;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $m): string => $m->value, self::cases());
    }
}
