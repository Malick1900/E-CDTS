<?php

namespace App\Http\Controllers\MonEspace;

use App\Concerns\BorneASaSociete;
use App\Enums\RoleClient;
use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Http\Requests\MonEspace\AgentStoreRequest;
use App\Http\Requests\MonEspace\AgentUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Les comptes agents, du côté de la société qui les emploie (ADR-0013).
 *
 * Le pendant exact de `Admin\Users\AgentController` : là-bas le CGC statue,
 * ici la société propose. Elle crée ses agents, corrige leur fiche, suspend ou
 * reprend leur accès, et soumet à nouveau une demande refusée — mais elle ne
 * valide jamais, et ne supprime pas un compte que le CGC a déjà examiné.
 *
 * Tout passe par la société du compte connecté, jamais par un identifiant reçu
 * de l'écran (voir `BorneASaSociete`).
 */
class AgentController extends Controller
{
    use BorneASaSociete;

    public function store(AgentStoreRequest $request): RedirectResponse
    {
        $societe = $this->societe($request);
        $data = $request->validated();

        DB::transaction(function () use ($societe, $data): void {
            $agent = User::create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'phone' => $data['phone'],
                'job_title' => $data['job_title'],
                'email' => $data['email'],
                // Secret aléatoire, jamais affiché ni transmis à personne : il
                // n'est là que pour ne pas laisser la colonne vide. L'agent
                // définira le sien depuis le lien reçu à la validation.
                'password' => Str::password(10),
                'consignataire_id' => $societe->id,
                'statut_validation' => StatutValidation::EnAttente,
                'is_active' => false,
            ]);

            // Le rôle découle de la position dans la société, il ne se choisit
            // pas (ADR-0031) : un compte créé ici est un agent, point.
            $agent->syncRoles([RoleClient::Agent->value]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Agent créé. Sa demande part en validation au CGC.'),
        ]);

        return to_route('mon-espace');
    }

    public function update(AgentUpdateRequest $request, User $agent): RedirectResponse
    {
        $this->garantirMonAgent($this->societe($request), $agent);
        $this->garantirPasSoiMeme($request, $agent);

        $data = $request->validated();
        $data['name'] = trim($data['first_name'].' '.$data['last_name']);

        $agent->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Fiche de l’agent mise à jour.')]);

        return to_route('mon-espace');
    }

    /**
     * Suspension ou reprise de l'accès d'un agent validé.
     *
     * C'est le geste courant d'une société : un agent qui part en congé, change
     * de poste ou quitte l'entreprise perd son accès sans que son compte — ni
     * les déclarations qu'il a portées — disparaisse.
     */
    public function toggleActive(Request $request, User $agent): RedirectResponse
    {
        $this->garantirMonAgent($this->societe($request), $agent);
        $this->garantirPasSoiMeme($request, $agent);
        $this->garantirStatut($agent, StatutValidation::Valide, __('Seul un compte validé par le CGC peut être suspendu ou repris.'));

        $agent->update(['is_active' => ! $agent->is_active]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $agent->is_active ? __('Accès de l’agent rétabli.') : __('Accès de l’agent suspendu.'),
        ]);

        return to_route('mon-espace');
    }

    /**
     * Nouvelle soumission d'une demande refusée : le compte repasse en attente.
     *
     * Le motif du refus reste écrit jusqu'à la décision suivante (ADR-0024) —
     * c'est lui qui a dit à la société ce qu'elle devait corriger.
     */
    public function resoumettre(Request $request, User $agent): RedirectResponse
    {
        $this->garantirMonAgent($this->societe($request), $agent);
        $this->garantirStatut($agent, StatutValidation::Refuse, __('Seule une demande refusée peut être soumise à nouveau.'));

        $agent->update(['statut_validation' => StatutValidation::EnAttente]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Demande soumise à nouveau au CGC.')]);

        return to_route('mon-espace');
    }

    /**
     * Suppression d'une demande que le CGC n'a jamais examinée — une erreur de
     * saisie rattrapée avant qu'elle n'atteigne personne.
     *
     * Dès qu'une décision a été prise sur un compte, il ne s'efface plus : il se
     * suspend. Un compte validé a pu déclarer, un compte refusé porte la trace
     * opposable du refus (ADR-0024) ; effacer l'un ou l'autre effacerait
     * l'historique de quelqu'un d'autre.
     */
    public function destroy(Request $request, User $agent): RedirectResponse
    {
        $this->garantirMonAgent($this->societe($request), $agent);
        $this->garantirPasSoiMeme($request, $agent);

        if ($agent->valide_le !== null || $agent->statut_validation !== StatutValidation::EnAttente) {
            throw ValidationException::withMessages([
                'statut_validation' => __('Ce compte a déjà été examiné par le CGC : il se suspend, il ne se supprime pas.'),
            ]);
        }

        $agent->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Demande de compte supprimée.')]);

        return to_route('mon-espace');
    }

    /**
     * Le titulaire figure dans sa propre liste — il est agent de sa société
     * autant qu'il la représente — mais aucune de ces actions ne s'y applique :
     * il se retirerait l'accès dont il a besoin pour le rétablir (ADR-0012). Sa
     * fiche se corrige depuis son profil, et sa succession relève du CGC
     * (ADR-0027).
     */
    private function garantirPasSoiMeme(Request $request, User $agent): void
    {
        abort_if($request->user()?->is($agent) ?? false, Response::HTTP_FORBIDDEN, 'Cette action ne s’applique pas à votre propre compte.');
    }

    private function garantirStatut(User $agent, StatutValidation $attendu, string $message): void
    {
        if ($agent->statut_validation !== $attendu) {
            throw ValidationException::withMessages(['statut_validation' => $message]);
        }
    }
}
