<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Validation d'un compte agent par le CGC (ADR-0013).
 *
 * Adressé à trois destinataires — l'agent, le titulaire de sa société et
 * l'adresse de la société — d'où un texte à la troisième personne : la même
 * phrase doit se lire aussi bien par l'intéressé que par sa hiérarchie.
 */
class CompteAgentValide extends Notification
{
    public function __construct(private readonly User $agent)
    {
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
        return (new MailMessage)
            ->subject(__('Compte agent validé — :agent', ['agent' => $this->agent->name]))
            ->greeting(__('Bonjour,'))
            // Tournure sans préposition devant le nom : « de Éric » serait fautif
            // et l'élision ne peut pas être décidée depuis un gabarit.
            ->line(__('Le Conseil Gabonais des Chargeurs a validé le compte agent suivant : :agent (:email), rattaché à :societe.', [
                'agent' => $this->agent->name,
                'email' => $this->agent->email,
                'societe' => $this->agent->consignataire?->name ?? __('votre société'),
            ]))
            ->line(__('Le compte est actif : :prenom peut désormais se connecter et déclarer sur les armements qui lui sont affectés.', [
                'prenom' => $this->agent->first_name ?? $this->agent->name,
            ]))
            ->action(__('Accéder à e-CDTS'), url('/login'))
            ->line(__("Si l'agent n'a pas encore défini son mot de passe, il peut le faire depuis « Mot de passe oublié » avec cette adresse."))
            ->salutation(__('Le Conseil Gabonais des Chargeurs'));
    }
}
