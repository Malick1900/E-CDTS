<?php

namespace App\Http\Controllers\Admin\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\RoleUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

/**
 * Recomposition des rôles internes CGC (ADR-0012, précisé par ADR-0025).
 *
 * L'écran recompose, il ne crée pas : le catalogue des rôles comme celui des
 * permissions vient du code. Le seul geste offert est de dire quelles
 * permissions existantes un rôle existant porte — ce qui suffit au besoin réel
 * (« le Superviseur ne doit plus toucher au barème ») sans avoir à trancher le
 * sort des rôles vides, renommés ou supprimés.
 *
 * Action sensible : à inscrire au journal d'audit quand le module existera
 * (ADR-0025 — aucune journalisation d'ici là, assumé).
 */
class RoleController extends Controller
{
    public function update(RoleUpdateRequest $request, Role $role): RedirectResponse
    {
        // syncPermissions purge le cache du registrar : les permissions
        // effectives sont à jour dès la requête suivante, sans intervention.
        $role->syncPermissions($request->validated()['permissions']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Permissions du rôle :role enregistrées.', ['role' => $role->name]),
        ]);

        return to_route('admin.utilisateurs.index');
    }
}
