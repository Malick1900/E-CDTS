<?php

namespace App\Notifications;

use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Un agent déjà en place devient titulaire du compte de sa société (ADR-0027).
 *
 * Distincte de [CompteClientOuvert] : le compte existe et le mot de passe ne
 * change pas. Ce qui change, c'est la responsabilité — d'où un courriel qui
 * annonce une fonction, pas un accès.
 */
class TitulaireDesigne extends Notification
{
    public function __construct(private readonly Consignataire $consignataire)
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

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Vous êtes désormais titulaire du compte :societe', ['societe' => $this->consignataire->name]))
            ->greeting(__('Bonjour :prenom,', ['prenom' => $notifiable->first_name ?? $notifiable->name]))
            ->line(__('Le Conseil Gabonais des Chargeurs vous a désigné titulaire du compte e-CDTS de :societe.', [
                'societe' => $this->consignataire->name,
            ]))
            ->line(__('Vous créez désormais les comptes des agents de votre société, que le CGC valide avant activation. Vos identifiants et vos déclarations en cours sont inchangés.'))
            ->action(__('Accéder à e-CDTS'), url('/login'))
            ->salutation(__('Le Conseil Gabonais des Chargeurs'));
    }
}
