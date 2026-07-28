<?php

namespace App\Http\Controllers\Admin\Referentiels;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Referentiels\ArmementStoreRequest;
use App\Http\Requests\Admin\Referentiels\ArmementUpdateRequest;
use App\Models\Armement;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * CRUD du référentiel « Armement » (armateur / compagnie maritime, ADR-0014).
 *
 * Pas de suppression dure (décision « actif/inactif partout ») : un armement se
 * désactive et disparaît des menus, les navires qui lui sont rattachés restent
 * intacts.
 */
class ArmementController extends Controller
{
    public function store(ArmementStoreRequest $request): RedirectResponse
    {
        Armement::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Armement ajouté.')]);

        return to_route('admin.referentiels');
    }

    public function update(ArmementUpdateRequest $request, Armement $armement): RedirectResponse
    {
        $armement->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Armement mis à jour.')]);

        return to_route('admin.referentiels');
    }

    public function toggleActive(Armement $armement): RedirectResponse
    {
        $armement->update(['actif' => ! $armement->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $armement->actif ? __('Armement réactivé.') : __('Armement désactivé.'),
        ]);

        return to_route('admin.referentiels');
    }
}
