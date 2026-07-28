<?php

namespace App\Http\Controllers\Admin\Referentiels;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Referentiels\PortStoreRequest;
use App\Http\Requests\Admin\Referentiels\PortUpdateRequest;
use App\Models\Port;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * CRUD du référentiel « Port » (ports d'escale, codes UN/LOCODE).
 *
 * Pas de suppression dure (décision « actif/inactif partout ») : un port se
 * désactive et disparaît des menus, les escales qui le référencent restent
 * intactes.
 */
class PortController extends Controller
{
    public function store(PortStoreRequest $request): RedirectResponse
    {
        Port::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Port ajouté.')]);

        return to_route('admin.referentiels');
    }

    public function update(PortUpdateRequest $request, Port $port): RedirectResponse
    {
        $port->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Port mis à jour.')]);

        return to_route('admin.referentiels');
    }

    public function toggleActive(Port $port): RedirectResponse
    {
        $port->update(['actif' => ! $port->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $port->actif ? __('Port réactivé.') : __('Port désactivé.'),
        ]);

        return to_route('admin.referentiels');
    }
}
