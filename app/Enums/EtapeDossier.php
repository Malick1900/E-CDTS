<?php

namespace App\Enums;

/**
 * Où en est un dossier d'escale dans le circuit de liquidation.
 *
 * Les six premiers cas SONT le circuit, dans l'ordre où on le parcourt : le
 * dossier s'ouvre, reçoit son manifeste (WF4), passe la navette du
 * dépouillement (WF5), donne lieu à un devis puis à une facture (WF6), et se
 * clôt. Le rang sert à afficher « 3/6 » ; on ne réordonne donc pas cet enum
 * sans y regarder à deux fois.
 *
 * « Annulé » est à part, hors frise (ADR-0009) : un dossier dont le navire ne
 * viendra jamais et qui a déjà reçu un manifeste ou été soumis ne se supprime
 * plus — il s'annule. Ce n'est pas une étape franchie, c'est une sortie de
 * route, d'où un rang nul.
 *
 * @see docs/WORKFLOWS-METIER.md WF3 à WF6
 * @see docs/DECISIONS.md ADR-0009 (annulation), ADR-0041
 */
enum EtapeDossier: string
{
    case Ouvert = 'ouvert';
    case Manifeste = 'manifeste';
    case Depouillement = 'depouillement';
    case Devis = 'devis';
    case Facture = 'facture';
    case Cloture = 'cloture';
    case Annule = 'annule';

    /** Libellé métier — colonne « Étape du circuit », filtres, pastilles. */
    public function label(): string
    {
        return match ($this) {
            self::Ouvert => 'Ouvert',
            self::Manifeste => 'Manifeste',
            self::Depouillement => 'Dépouillement',
            self::Devis => 'Devis émis',
            self::Facture => 'Facturé',
            self::Cloture => 'Clôturé',
            self::Annule => 'Annulé',
        };
    }

    /**
     * Les six étapes du circuit, dans l'ordre — « Annulé » excepté.
     *
     * @return list<self>
     */
    public static function circuit(): array
    {
        return [
            self::Ouvert,
            self::Manifeste,
            self::Depouillement,
            self::Devis,
            self::Facture,
            self::Cloture,
        ];
    }

    /**
     * Position sur la frise, de 1 à 6 — nulle pour une sortie de route, qui
     * n'a pas de « x/6 » à afficher.
     */
    public function rang(): ?int
    {
        $position = array_search($this, self::circuit(), strict: true);

        return $position === false ? null : $position + 1;
    }

    /**
     * L'écran qui instruit cette étape, par son nom de route — nul tant que
     * cet écran n'existe pas.
     *
     * C'est le seul endroit du code qui sache où mène un dossier. La liste s'en
     * sert pour décider quelles lignes s'ouvrent, l'aiguillage pour rediriger :
     * un écran qui arrive se branche ici, et les deux suivent.
     *
     * Les trois premières étapes partagent l'écran du manifeste : le
     * consignataire le renseigne (WF4), le CGC le dépouille (WF5), et la
     * navette du dépouillement ne quitte pas la pièce.
     */
    public function ecran(): ?string
    {
        return match ($this) {
            self::Ouvert, self::Manifeste, self::Depouillement => 'dossiers.manifeste',
            default => null,
        };
    }

    /**
     * Le dossier est-il encore en circulation ? Le total liquidé du pied de
     * tableau ne compte que ce qui est facturé ou clos ; le reste n'a pas
     * encore de montant opposable.
     */
    public function liquide(): bool
    {
        return in_array($this, [self::Facture, self::Cloture], strict: true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $etape): string => $etape->value, self::cases());
    }
}
