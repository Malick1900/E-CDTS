<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SensTrafic;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BaremeLigneStoreRequest;
use App\Http\Requests\Admin\BaremeLigneUpdateRequest;
use App\Models\BaremeLigne;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Le barème CDTS du CGC (ADR-0034).
 *
 * Un écran, deux volets — export et import — et une seule valeur saisie par
 * ligne : le montant en francs CFA. L'euro l'accompagne partout mais n'est
 * jamais saisi : il se déduit de la parité fixe.
 *
 * Réservé à l'Administrateur par `bareme.modifier` (posée sur la route) : le
 * Superviseur gère les comptes et les référentiels, pas la grille tarifaire.
 */
class BaremeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/bareme', [
            // Les deux volets dans un seul jeu, triés par sens puis par
            // référence — les références étant zéro-paddées, l'ordre du
            // document officiel est retrouvé tel quel.
            'lignes' => BaremeLigne::query()
                ->orderBy('sens')
                ->orderBy('reference')
                ->get()
                ->map(fn (BaremeLigne $ligne): array => [
                    'id' => $ligne->id,
                    'reference' => $ligne->reference,
                    'sens' => $ligne->sens->value,
                    'designation' => $ligne->designation,
                    'montant_cfa' => (float) $ligne->montant_cfa,
                    'montant_euro' => $ligne->montantEuro(),
                    'actif' => $ligne->actif,
                ])
                ->all(),
            'sens' => array_map(
                static fn (SensTrafic $s): array => ['value' => $s->value, 'label' => $s->label()],
                SensTrafic::cases(),
            ),
        ]);
    }

    public function store(BaremeLigneStoreRequest $request): RedirectResponse
    {
        BaremeLigne::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Ligne de barème ajoutée.')]);

        return to_route('admin.bareme');
    }

    public function update(BaremeLigneUpdateRequest $request, BaremeLigne $ligne): RedirectResponse
    {
        $ligne->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Ligne de barème mise à jour.')]);

        return to_route('admin.bareme');
    }

    /**
     * Retire la ligne de l'exploitation sans l'effacer de la grille — le geste
     * courant quand un article cesse d'être tarifé (ADR-0034). Le CGC garde la
     * trace de ce qui a existé, et peut revenir sur sa décision.
     */
    public function toggleActive(BaremeLigne $ligne): RedirectResponse
    {
        $ligne->update(['actif' => ! $ligne->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $ligne->actif ? __('Ligne réactivée.') : __('Ligne désactivée.'),
        ]);

        return to_route('admin.bareme');
    }

    /**
     * Suppression réelle, là où les référentiels se contentent d'une bascule :
     * rien ne pointe encore vers une ligne de barème. Elle reste le geste rare
     * — une ligne saisie par erreur — la désactivation étant celui du quotidien.
     * Le jour où un devis citera une ligne, il faudra la retirer (ADR-0034).
     */
    public function destroy(BaremeLigne $ligne): RedirectResponse
    {
        $ligne->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Ligne de barème supprimée.')]);

        return to_route('admin.bareme');
    }
}
