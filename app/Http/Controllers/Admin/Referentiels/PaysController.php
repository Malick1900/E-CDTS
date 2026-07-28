<?php

namespace App\Http\Controllers\Admin\Referentiels;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Referentiels\PaysStoreRequest;
use App\Http\Requests\Admin\Referentiels\PaysUpdateRequest;
use App\Models\Pays;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * CRUD du référentiel « Pays » (pavillons, origine et immatriculation des
 * armements).
 *
 * Pas de suppression dure (décision « actif/inactif partout ») : un pays se
 * désactive et disparaît des menus, les navires et ports qui le référencent
 * restent intacts.
 */
class PaysController extends Controller
{
    public function store(PaysStoreRequest $request): RedirectResponse
    {
        Pays::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pays ajouté.')]);

        return to_route('admin.referentiels');
    }

    public function update(PaysUpdateRequest $request, Pays $pays): RedirectResponse
    {
        $pays->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pays mis à jour.')]);

        return to_route('admin.referentiels');
    }

    public function toggleActive(Pays $pays): RedirectResponse
    {
        $pays->update(['actif' => ! $pays->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $pays->actif ? __('Pays réactivé.') : __('Pays désactivé.'),
        ]);

        return to_route('admin.referentiels');
    }
}
