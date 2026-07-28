<?php

namespace App\Http\Controllers\Admin\Referentiels;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Referentiels\TypeNavireStoreRequest;
use App\Http\Requests\Admin\Referentiels\TypeNavireUpdateRequest;
use App\Models\TypeNavire;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * CRUD du référentiel « Type de navire ».
 *
 * Pas de suppression dure (décision « actif/inactif partout ») : un type se
 * désactive et disparaît des menus, l'historique des navires qui le référencent
 * reste intact.
 */
class TypeNavireController extends Controller
{
    public function store(TypeNavireStoreRequest $request): RedirectResponse
    {
        TypeNavire::create($request->validated() + ['actif' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Type de navire ajouté.')]);

        return to_route('admin.referentiels');
    }

    public function update(TypeNavireUpdateRequest $request, TypeNavire $typeNavire): RedirectResponse
    {
        $typeNavire->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Type de navire mis à jour.')]);

        return to_route('admin.referentiels');
    }

    public function toggleActive(TypeNavire $typeNavire): RedirectResponse
    {
        $typeNavire->update(['actif' => ! $typeNavire->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $typeNavire->actif ? __('Type réactivé.') : __('Type désactivé.'),
        ]);

        return to_route('admin.referentiels');
    }
}
