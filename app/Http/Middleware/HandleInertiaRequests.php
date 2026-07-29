<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use App\Enums\StatutValidation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'admin' => [
                'agentsAValider' => fn (): int => $this->agentsAValider($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Comptes agents en attente de décision du CGC (ADR-0013). Partagé plutôt
     * que passé par une page : le badge vit dans la barre latérale de l'espace
     * d'administration, donc visible depuis n'importe quel module.
     *
     * Zéro pour qui n'a pas la charge des comptes clients — l'alerte s'adresse
     * à celui qui peut y répondre.
     */
    private function agentsAValider(Request $request): int
    {
        if (! $request->user()?->can(Permission::ComptesClientsGerer->value)) {
            return 0;
        }

        return User::where('statut_validation', StatutValidation::EnAttente)->count();
    }
}
