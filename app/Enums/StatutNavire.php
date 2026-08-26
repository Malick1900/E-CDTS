<?php

namespace App\Enums;

/**
 * Les six jalons d'une escale, tels que la conférence portuaire les publie
 * (ADR-0011, complété le 2026-08-26 par la validation du jalon « hors zone »).
 *
 * L'ordre des cas EST la frise : un navire les franchit dans cet ordre, et le
 * rang sert à la fois à dessiner la frise d'escale et à calculer le verrou de
 * transmission. On ne réordonne donc pas cet enum sans y regarder à deux fois.
 *
 * @see docs/GLOSSARY.md « Situation portuaire »
 * @see docs/DECISIONS.md ADR-0009 (verrou), ADR-0011 (liste fermée)
 */
enum StatutNavire: string
{
    case Attendu = 'attendu';
    case Rade = 'rade';
    case Quai = 'quai';
    case HorsZone = 'hors_zone';
    case ZoneExploitation = 'zone';
    case Sorti = 'sorti';

    /** Libellé métier complet — menus déroulants, filtres, infobulles. */
    public function label(): string
    {
        return match ($this) {
            self::Attendu => 'Navire attendu',
            self::Rade => 'En rade',
            self::Quai => 'À quai',
            self::HorsZone => 'Hors zone',
            self::ZoneExploitation => "En zone d'exploitation",
            self::Sorti => 'Sorti',
        };
    }

    /**
     * Libellé court de la frise : six pastilles dans une colonne de tableau, il
     * n'y a pas la place pour « En zone d'exploitation ».
     */
    public function abrege(): string
    {
        return match ($this) {
            self::Attendu => 'Attendu',
            self::Rade => 'En rade',
            self::Quai => 'À quai',
            self::HorsZone => 'Hors zone',
            self::ZoneExploitation => 'En zone',
            self::Sorti => 'Sorti',
        };
    }

    /** Position sur la frise, de 0 (attendu) à 5 (sorti). */
    public function rang(): int
    {
        return (int) array_search($this, self::cases(), strict: true);
    }

    /**
     * Le jalon qui ouvre le verrou de transmission pour ce sens (ADR-0009) :
     * un dossier import part quand le navire est à quai, un dossier export
     * quand il est sorti.
     */
    public static function jalonDeVerrou(SensTrafic $sens): self
    {
        return $sens === SensTrafic::Import ? self::Quai : self::Sorti;
    }

    /**
     * Le navire a-t-il touché le quai ? À partir de là, la date d'accostage
     * existe : c'est celle que le dossier d'escale ira lire (ADR-0009). Sans
     * elle, la situation n'est pas publiable.
     */
    public function exigeEta(): bool
    {
        return in_array($this, [self::Quai, self::HorsZone, self::ZoneExploitation], strict: true);
    }

    /**
     * Symétrique pour la sortie : un navire déclaré sorti sans date de départ
     * laisserait le verrou export fermé sur une escale pourtant terminée.
     */
    public function exigeEtd(): bool
    {
        return $this === self::Sorti;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $statut): string => $statut->value, self::cases());
    }
}
