<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Password;

/**
 * Validation d'un compte agent par le CGC (ADR-0013).
 *
 * Adressé à trois destinataires — l'agent, le titulaire de sa société et
 * l'adresse de la société — d'où un texte à la troisième personne : la même
 * phrase doit se lire aussi bien par l'intéressé que par sa hiérarchie.
 *
 * Une seule chose diffère d'une copie à l'autre, et c'est essentiel : le lien
 * de définition du mot de passe. C'est un jeton d'accès au compte, pas une
 * information — quiconque l'ouvre choisit le mot de passe de l'agent. Il ne
 * part donc que dans la copie de l'intéressé. Le titulaire et le contact de la
 * société apprennent la décision, jamais la clé. Sans cette distinction, le
 * titulaire pourrait entrer dans le compte de son agent et y déclarer sous son
 * identité, ce qui viderait la traçabilité de son sens.
 *
 * Le mot de passe posé à la création du compte par la société est aléatoire et
 * n'a jamais été communiqué : ce lien est le seul chemin d'entrée de l'agent.
 * Il expire (60 minutes par défaut), d'où le rappel du recours « mot de passe
 * oublié » pour qui relève son courriel le lendemain.
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
        $message = (new MailMessage)
            ->subject(__('Compte agent validé — :agent', ['agent' => $this->agent->name]))
            ->greeting(__('Bonjour,'))
            // Tournure sans préposition devant le nom : « de Éric » serait fautif
            // et l'élision ne peut pas être décidée depuis un gabarit.
            ->line(__('Le Conseil Gabonais des Chargeurs a validé le compte agent suivant : :agent (:email), rattaché à :societe.', [
                'agent' => $this->agent->name,
                'email' => $this->agent->email,
                'societe' => $this->agent->consignataire->name ?? __('votre société'),
            ]))
            ->line(__('Le compte est actif : :prenom peut désormais se connecter et déclarer sur les armements qui lui sont affectés.', [
                'prenom' => $this->agent->first_name ?? $this->agent->name,
            ]));

        if ($notifiable instanceof User && $notifiable->is($this->agent)) {
            return $message
                ->action(__('Définir mon mot de passe'), $this->lienMotDePasse($notifiable))
                ->line(__('Ce lien vous est personnel : il ouvre votre compte. Il est valable une heure — passé ce délai, utilisez « Mot de passe oublié » depuis la page de connexion avec cette même adresse.'))
                ->salutation(__('Le Conseil Gabonais des Chargeurs'));
        }

        return $message
            ->action(__('Accéder à e-CDTS'), url('/login'))
            // Ce que les autres destinataires doivent savoir, et rien de plus :
            // l'agent a reçu son propre chemin d'accès, inutile de le lui
            // transmettre — personne d'autre ne le détient.
            ->line(__("L'agent a reçu de son côté un lien personnel pour définir son mot de passe."))
            ->salutation(__('Le Conseil Gabonais des Chargeurs'));
    }

    /**
     * Le jeton est émis à l'envoi, pas à la décision : il court à partir du
     * moment où le courriel part, et n'existe nulle part ailleurs.
     */
    private function lienMotDePasse(User $agent): string
    {
        return url(route('password.reset', [
            'token' => Password::createToken($agent),
            'email' => $agent->getEmailForPasswordReset(),
        ], absolute: false));
    }
}
