<?php

namespace App\Http\Controllers\Admin\Users;

use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\AgentRefuseRequest;
use App\Models\User;
use App\Notifications\CompteAgentRefuse;
use App\Notifications\CompteAgentValide;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Circuit de validation des comptes agents consignataires (ADR-0013).
 *
 * La société crée ses agents ; le CGC les valide avant activation. Ce n'est pas
 * une formalité : le CGC n'exerce pas de supervision continue, et le passage par
 * une décision explicite laisse une trace opposable — en cas de litige, nul ne
 * peut prétendre qu'un compte « est apparu seul ».
 *
 * Quatre décisions, jamais une suppression : valider, refuser, réexaminer sur
 * nouvelle soumission, et (dés)activer un compte déjà validé. Un compte refusé
 * demeure en base (ADR-0024) ; le refus n'est pas définitif, la société peut
 * soumettre à nouveau, ce qui replace le compte en attente sans effacer la
 * décision précédente.
 *
 * L'activation elle-même reste portée par `is_active`, seule colonne lue à la
 * connexion : ici on décide, et la décision retombe sur ce drapeau.
 */
class AgentController extends Controller
{
    public function valider(Request $request, User $agent): RedirectResponse
    {
        $this->garantirAgent($agent);
        $this->garantirStatut($agent, [StatutValidation::EnAttente, StatutValidation::Refuse], __('Ce compte est déjà validé.'));

        $this->decider($request, $agent, StatutValidation::Valide, actif: true);
        $this->informer($agent, new CompteAgentValide($agent));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Compte agent validé.')]);

        return to_route('admin.utilisateurs.index');
    }

    public function refuser(AgentRefuseRequest $request, User $agent): RedirectResponse
    {
        $this->garantirAgent($agent);
        $this->garantirStatut($agent, [StatutValidation::EnAttente], __('Seule une demande en attente peut être refusée.'));

        $motif = (string) $request->validated('motif_refus');

        $this->decider($request, $agent, StatutValidation::Refuse, actif: false, motif: $motif);
        $this->informer($agent, new CompteAgentRefuse($agent, $motif));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Compte agent refusé.')]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Nouvelle soumission d'une demande refusée : le compte repasse en attente.
     * La décision précédente n'est pas effacée — elle reste lisible jusqu'à ce
     * qu'une nouvelle la remplace (ADR-0024).
     */
    public function reexaminer(User $agent): RedirectResponse
    {
        $this->garantirAgent($agent);
        $this->garantirStatut($agent, [StatutValidation::Refuse], __('Seul un compte refusé peut être réexaminé.'));

        $agent->update([
            'statut_validation' => StatutValidation::EnAttente,
            'is_active' => false,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Demande replacée en attente de validation.')]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Suspension ou reprise d'un compte déjà validé. Distinct du refus : le
     * refus tranche une demande, la désactivation interrompt un accès accordé.
     */
    public function toggleActive(User $agent): RedirectResponse
    {
        $this->garantirAgent($agent);
        $this->garantirStatut($agent, [StatutValidation::Valide], __('Seul un compte validé peut être activé ou désactivé.'));

        $agent->update(['is_active' => ! $agent->is_active]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $agent->is_active ? __('Compte agent réactivé.') : __('Compte agent désactivé.'),
        ]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Écrit la décision et sa trace : qui a tranché, quand, et pourquoi en cas
     * de refus. Le motif d'un refus antérieur est effacé par une validation —
     * il ne décrit plus la situation du compte.
     */
    private function decider(Request $request, User $agent, StatutValidation $statut, bool $actif, ?string $motif = null): void
    {
        $agent->update([
            'statut_validation' => $statut,
            'is_active' => $actif,
            'valide_par_user_id' => $request->user()?->id,
            'valide_le' => now(),
            'motif_refus' => $motif,
        ]);
    }

    /**
     * Porte la décision aux trois intéressés : l'agent, le titulaire du compte
     * de sa société, et l'adresse de la société elle-même.
     *
     * Dédoublonné par adresse — le titulaire est souvent aussi le contact de la
     * société, et recevoir deux fois le même courriel donne à croire à deux
     * décisions. Les destinataires manquants sont simplement omis : une société
     * sans adresse ou sans titulaire ne doit pas empêcher la notification des
     * autres.
     */
    private function informer(User $agent, Notification $notification): void
    {
        $comptes = collect([$agent, $agent->consignataire?->titulaire])
            ->filter()
            ->unique('id');

        $emailSociete = $agent->consignataire?->email;
        $enDouble = $emailSociete !== null && $comptes->contains(fn (User $compte): bool => $compte->email === $emailSociete);

        DB::afterCommit(function () use ($comptes, $emailSociete, $enDouble, $notification): void {
            NotificationFacade::send($comptes, $notification);

            if ($emailSociete !== null && ! $enDouble) {
                NotificationFacade::route('mail', $emailSociete)->notify($notification);
            }
        });
    }

    /**
     * Les routes de ce contrôleur ne s'adressent qu'aux comptes clients : un
     * compte interne CGC se gère depuis l'onglet Internes, pas ici.
     */
    private function garantirAgent(User $agent): void
    {
        abort_unless($agent->estAgent(), Response::HTTP_NOT_FOUND);
    }

    /**
     * @param  list<StatutValidation>  $attendus
     */
    private function garantirStatut(User $agent, array $attendus, string $message): void
    {
        if (! in_array($agent->statut_validation, $attendus, strict: true)) {
            throw ValidationException::withMessages(['statut_validation' => $message]);
        }
    }
}
