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
                'modules' => fn (): array => $this->modulesAdmin($request->user()),
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
     * @return array{navigation: list<array{key: string, label: string, href: string}>, qualite: string|null, contexte: array{societe: string, immatriculation: string|null}|null}|null
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
     * Les modules du rail d'administration ouverts à ce compte.
     *
     * Même raison que la navigation d'activité (ADR-0030) : le rail doit dire la
     * vérité. Un Superviseur n'a pas le barème — lui laisser l'entrée, c'est lui
     * promettre un écran qui répondra 403.
     *
     * Calculé par `can()` et non depuis la liste des permissions partagée : le
     * super-admin n'en porte aucune explicitement, il outrepasse via Gate::before.
     *
     * @return list<string>
     */
    private function modulesAdmin(?User $user): array
    {
        if (! $user) {
            return [];
        }

        $modules = [
            'users' => Permission::UtilisateursGerer,
            'ref' => Permission::ReferentielsGerer,
            'bareme' => Permission::BaremeModifier,
        ];

        $ouverts = [];

        foreach ($modules as $module => $permission) {
            if ($user->can($permission->value)) {
                $ouverts[] = $module;
            }
        }

        // Le journal d'audit n'a pas encore de permission dédiée ni d'écran
        // réel : il reste visible pour tous ceux qui atteignent le panneau.
        $ouverts[] = 'audit';

        return $ouverts;
    }

    /**
     * Le sous-titre de la puce utilisateur : la société pour un compte client,
     * le profil pour un interne CGC.
     *
     * Les deux populations n'ont pas besoin de la même chose. Un client lit au
     * nom de quelle société il déclare — il peut avoir un compte chez plusieurs
     * consignataires. Un interne lit ce qu'il a le droit de faire : sur une
     * plateforme où les profils n'ouvrent pas les mêmes écrans, savoir qu'on est
     * Consultant et non Superviseur explique ce qu'on ne voit pas.
     *
     * Le premier rôle suffit : un compte interne en cumule rarement, et c'est
     * une indication, pas une habilitation.
     */
    private function qualite(User $user): ?string
    {
        if ($societe = $user->consignataire) {
            return $societe->name;
        }

        $profil = $user->getRoleNames()->first();

        return is_string($profil) ? $profil : null;
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
