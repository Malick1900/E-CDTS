<?php

namespace App\Enums;

/**
 * État du circuit de validation d'un compte client (ADR-0013, ADR-0024).
 *
 * Ne concerne que les comptes rattachés à une société consignataire : un compte
 * interne CGC n'a pas de statut de validation (colonne nulle). L'activation
 * elle-même reste portée par `users.is_active` : un compte en attente ou refusé
 * est simplement inactif. Depuis ADR-0032, la connexion lit les deux — non pour
 * décider (`is_active` y suffit) mais pour dire à l'utilisateur *pourquoi* elle
 * refuse, une fois son mot de passe vérifié.
 *
 * Un refus n'est pas une impasse : la société peut soumettre à nouveau, ce qui
 * ramène le compte en attente sans effacer la décision précédente.
 */
enum StatutValidation: string
{
    case EnAttente = 'en_attente';
    case Valide = 'valide';
    case Refuse = 'refuse';

    public function label(): string
    {
        return match ($this) {
            self::EnAttente => 'En attente de validation',
            self::Valide => 'Validé par le CGC',
            self::Refuse => 'Refusé par le CGC',
        };
    }

    /**
     * Les valeurs stockées en base.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $statut): string => $statut->value, self::cases());
    }
}
