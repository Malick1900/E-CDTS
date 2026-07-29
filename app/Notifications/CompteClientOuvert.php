<?php

namespace App\Notifications;

use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Password;

/**
 * Ouverture d'un compte titulaire par le CGC (ADR-0027).
 *
 * Le courriel porte un lien de définition de mot de passe plutôt qu'un secret :
 * l'agent du CGC qui saisit la fiche société ne connaît jamais le mot de passe
 * du titulaire, et le compte n'est utilisable que par la personne qui relève
 * l'adresse déclarée en amont.
 *
 * Le jeton expire (60 minutes par défaut) — d'où la mention explicite du
 * recours « mot de passe oublié », qui évite un aller-retour avec le CGC quand
 * le titulaire ouvre son courriel le lendemain.
 */
class CompteClientOuvert extends Notification
{
    public function __construct(private readonly Consignataire $consignataire)
    {
        // Les destinataires sont des sociétés gabonaises : le courriel part en
        // français quelle que soit la locale configurée sur l'instance.
        $this->locale('fr');
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        /** @var User $notifiable */
        $lien = url(route('password.reset', [
            'token' => Password::createToken($notifiable),
            'email' => $notifiable->getEmailForPasswordReset(),
        ], absolute: false));

        return (new MailMessage)
            ->subject(__('Votre compte e-CDTS est ouvert'))
            ->greeting(__('Bonjour :prenom,', ['prenom' => $notifiable->first_name ?? $notifiable->name]))
            ->line(__('Le Conseil Gabonais des Chargeurs a ouvert le compte titulaire de :societe sur e-CDTS, la plateforme de la Contribution au Développement du Transport et de la Sécurité.', [
                'societe' => $this->consignataire->name,
            ]))
            ->line(__('À ce titre, vous déclarez pour votre société et vous créez les comptes de ses agents, que le CGC valide avant activation.'))
            ->action(__('Définir mon mot de passe'), $lien)
            ->line(__('Ce lien est valable une heure. Passé ce délai, utilisez « Mot de passe oublié » depuis la page de connexion avec cette même adresse.'))
            ->salutation(__('Le Conseil Gabonais des Chargeurs'));
    }
}
