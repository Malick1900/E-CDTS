<?php

namespace App\Http\Controllers\MonEspace;

use App\Concerns\BorneASaSociete;
use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Models\Armement;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * La portée des agents de la société : qui déclare pour quel armement (ADR-0009).
 *
 * Un filtre de données, jamais une permission — l'agent garde les mêmes droits,
 * il ne les exerce que sur les armements cochés ici. La société répartit donc sa
 * charge de travail sans que le CGC ait à trancher : ce sont ses armements, ses
 * agents, son organisation interne.
 *
 * Deux bornes, et elles se ferment toutes les deux ici : l'agent doit être le
 * sien, l'armement doit être représenté par elle. Sans la seconde, un titulaire
 * pourrait ouvrir à son agent un armement qu'un concurrent représente.
 */
class AffectationController extends Controller
{
    use BorneASaSociete;

    /**
     * Une case de la matrice : on coche ou on décoche, la ligne du pivot suit.
     *
     * La bascule dit l'intention mieux qu'un `sync` de la ligne entière — deux
     * titulaires qui cochent en même temps sur des colonnes différentes ne
     * s'effacent pas mutuellement.
     */
    public function toggle(Request $request, User $agent, Armement $armement): RedirectResponse
    {
        $societe = $this->societe($request);

        $this->garantirMonAgent($societe, $agent);

        // Introuvable et non interdit, pour la même raison qu'un agent d'une
        // autre société : la réponse ne doit rien dire de ce qui existe.
        abort_unless(
            $societe->armements()->where('armements.id', $armement->id)->exists(),
            Response::HTTP_NOT_FOUND,
        );

        if ($agent->statut_validation !== StatutValidation::Valide || ! $agent->is_active) {
            throw ValidationException::withMessages([
                'agent' => __('Seul un agent dont l’accès est ouvert reçoit une affectation.'),
            ]);
        }

        $bascule = $agent->armements()->toggle($armement->id);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $bascule['attached'] !== []
                ? __(':armement affecté à :agent.', ['armement' => $armement->name, 'agent' => $agent->name])
                : __(':armement retiré à :agent.', ['armement' => $armement->name, 'agent' => $agent->name]),
        ]);

        return to_route('mon-espace');
    }
}
