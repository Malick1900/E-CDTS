<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * La politique de mot de passe de la plateforme, énoncée une seule fois.
 *
 * Deux lecteurs en ont besoin et ils doivent dire la même chose : la validation,
 * qui refuse, et l'écran Profil, qui annonce à l'avance ce qui sera refusé. Une
 * liste d'exigences recopiée dans le composant React finirait par mentir — et un
 * utilisateur à qui l'on refuse un mot de passe conforme à ce qu'on lui a
 * affiché n'a aucun moyen de comprendre.
 */
final class PolitiqueMotDePasse
{
    /**
     * Les exigences vérifiables par l'utilisateur lui-même, telles que l'écran
     * les coche au fil de la saisie.
     *
     * Elles se relâchent hors production : un environnement de développement
     * n'a pas à imposer un secret de douze caractères pour tester un écran.
     *
     * @return array{longueur: int, casse: bool, chiffres: bool, symboles: bool}
     */
    public static function criteres(): array
    {
        return app()->isProduction()
            ? ['longueur' => 12, 'casse' => true, 'chiffres' => true, 'symboles' => true]
            : ['longueur' => 8, 'casse' => false, 'chiffres' => false, 'symboles' => false];
    }

    /**
     * La même politique, sous la forme que la validation attend.
     *
     * S'y ajoute en production le contrôle contre les fuites connues : celui-là
     * ne s'annonce pas à l'avance — il ne se vérifie qu'au moment de soumettre,
     * et se dit alors en clair dans le message d'erreur.
     */
    public static function regle(): Password
    {
        $criteres = self::criteres();

        $regle = Password::min($criteres['longueur']);

        if ($criteres['casse']) {
            $regle->mixedCase()->letters();
        }

        if ($criteres['chiffres']) {
            $regle->numbers();
        }

        if ($criteres['symboles']) {
            $regle->symbols();
        }

        return app()->isProduction() ? $regle->uncompromised() : $regle;
    }
}
