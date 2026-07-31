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
                'permissions' => fn (): array => $request->user()?->getAllPermissions()->pluck('name')->all() ?? [],
            ],
            'coquille' => fn (): ?array => $this->coquille($request->user()),
            'admin' => [
                'agentsAValider' => fn (): int => $this->agentsAValider($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * De quoi dessiner la coquille d'activité (ADR-0030) : les entrées de
     * navigation que ce compte a le droit de voir, sa qualité, et la société
     * dont il ouvre l'espace. Calculé côté serveur parce que c'est une règle
     * métier — une nav construite côté React à partir des permissions
     * reproduirait ces arbitrages dans un second endroit.
     *
     * Null pour un visiteur : les écrans d'authentification n'ont pas de chrome.
     *
     * @return array{navigation: list<array{key: string, label: string, href: string}>, qualite: string, contexte: array{societe: string, immatriculation: string|null}|null}|null
     */
    private function coquille(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $societe = $user->consignataire;

        return [
            'navigation' => $this->navigation($user),
            'qualite' => $this->qualite($user),
            // « Espace de … » : un interne CGC n'est chez personne, il n'a pas
            // de carte de contexte (ADR-0030).
            'contexte' => $societe ? [
                'societe' => $societe->name,
                'immatriculation' => $societe->rccm_nif,
            ] : null,
        ];
    }

    /**
     * Les cinq entrées d'ADR-0030, chacune conditionnée à une permission. Le
     * tableau de bord n'en demande aucune : c'est la porte d'entrée commune, et
     * un compte sans aucune entrée resterait bloqué sur une page introuvable.
     *
     * @return list<array{key: string, label: string, href: string}>
     */
    private function navigation(User $user): array
    {
        $entrees = [
            ['key' => 'dashboard', 'label' => 'Tableau de bord', 'href' => '/dashboard', 'permission' => null],
            ['key' => 'situation-portuaire', 'label' => 'Situation portuaire', 'href' => '/situation-portuaire', 'permission' => Permission::SituationPortuaireConsulter],
            ['key' => 'dossiers', 'label' => "Dossiers d'escale", 'href' => '/dossiers', 'permission' => Permission::DossiersConsulter],
            ['key' => 'devis', 'label' => 'Devis & factures', 'href' => '/devis', 'permission' => Permission::DevisConsulter],
        ];

        $visibles = [];

        foreach ($entrees as $entree) {
            if ($entree['permission'] === null || $user->can($entree['permission']->value)) {
                unset($entree['permission']);
                $visibles[] = $entree;
            }
        }

        // « Administration » mène à deux endroits selon le compte, jamais aux
        // deux : l'espace de sa société pour un titulaire, le panneau CGC pour
        // un interne qui en a la charge (ADR-0030).
        $administration = match (true) {
            $user->can(Permission::MesAgentsGerer->value) => '/mon-espace',
            $user->can(Permission::UtilisateursGerer->value) => '/admin/utilisateurs',
            $user->can(Permission::ReferentielsGerer->value) => '/admin/referentiels',
            default => null,
        };

        if ($administration !== null) {
            $visibles[] = ['key' => 'administration', 'label' => 'Administration', 'href' => $administration];
        }

        return $visibles;
    }

    /**
     * Le sous-titre de la puce utilisateur : sa position pour un compte client,
     * son profil pour un interne CGC.
     */
    private function qualite(User $user): string
    {
        $societe = $user->consignataire;

        if ($societe) {
            return $societe->titulaire_user_id === $user->id
                ? $societe->name.' — Compte maître'
                : $societe->name.' — Agent déclarant';
        }

        return ($user->getRoleNames()->first() ?? 'Compte interne').' — CGC';
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
