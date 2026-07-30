<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Refus d'un compte agent par le CGC (ADR-0024).
 *
 * Le motif figure dans le courriel : c'est sa raison d'être. Un refus dont la
 * société ignore la cause laisse un compte bloqué sans recours, alors que la
 * demande peut être soumise à nouveau une fois le point corrigé (ADR-0026).
 */
class CompteAgentRefuse extends Notification
{
    public function __construct(private readonly User $agent, private readonly string $motif)
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
            ->subject(__('Compte agent refusé — :agent', ['agent' => $this->agent->name]))
            ->greeting(__('Bonjour,'))
            // Tournure sans préposition devant le nom : « de Éric » serait fautif
            // et l'élision ne peut pas être décidée depuis un gabarit.
            ->line(__("Le Conseil Gabonais des Chargeurs n'a pas validé la demande de compte agent suivante : :agent (:email), rattaché à :societe.", [
                'agent' => $this->agent->name,
                'email' => $this->agent->email,
                'societe' => $this->agent->consignataire->name ?? __('votre société'),
            ]))
            ->line(__('Motif : :motif', ['motif' => $this->motif]))
            ->line(__('La demande peut être soumise à nouveau une fois ce point corrigé. Le compte reste enregistré, il ne faut pas le recréer.'))
            ->salutation(__('Le Conseil Gabonais des Chargeurs'));
    }
}
