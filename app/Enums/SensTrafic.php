<?php

namespace App\Enums;

/**
 * Sens du trafic d'une ligne de barème : la marchandise sort du pays ou y entre.
 *
 * Les deux volets du barème CGC sont distincts jusque dans leurs références
 * (`EXP…` / `IMP…`) et leurs montants : la même marchandise n'est pas tarifée
 * pareil selon qu'elle part ou qu'elle arrive.
 *
 * @see docs/GLOSSARY.md « ligne de barème »
 */
enum SensTrafic: string
{
    case Export = 'export';
    case Import = 'import';

    /** Libellé métier lisible (onglets, menus déroulants). */
    public function label(): string
    {
        return match ($this) {
            self::Export => 'Export',
            self::Import => 'Import',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $s): string => $s->value, self::cases());
    }
}
