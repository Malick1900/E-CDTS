<?php

namespace App\Http\Controllers\Admin\Referentiels;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Referentiels\NavireStoreRequest;
use App\Http\Requests\Admin\Referentiels\NavireUpdateRequest;
use App\Models\Navire;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * CRUD du référentiel « Navire » — entité maîtresse rapprochée du manifeste
 * (ADR-0009).
 *
 * Pas de suppression dure (décision « actif/inactif partout ») : un navire se
 * désactive et disparaît des menus, les dossiers déjà liquidés qui le
 * référencent restent intacts.
 *
 * `mode_exploitation_defaut` n'est qu'une VALEUR PAR DÉFAUT, recopiée sur
 * l'escale à sa création : la facturation lit l'escale, pas le navire.
 */
class NavireController extends Controller
{
    public function store(NavireStoreRequest $request): RedirectResponse
    {
        Navire::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Navire ajouté.')]);

        return to_route('admin.referentiels');
    }

    public function update(NavireUpdateRequest $request, Navire $navire): RedirectResponse
    {
        $navire->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Navire mis à jour.')]);

        return to_route('admin.referentiels');
    }

    public function toggleActive(Navire $navire): RedirectResponse
    {
        $navire->update(['actif' => ! $navire->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $navire->actif ? __('Navire réactivé.') : __('Navire désactivé.'),
        ]);

        return to_route('admin.referentiels');
    }
}
