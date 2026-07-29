<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserStoreRequest;
use App\Http\Requests\Admin\UserUpdateRequest;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

/**
 * Module « Utilisateurs & habilitations » (Phase 2).
 *
 * CRUD des comptes internes CGC + affectation de rôles cumulables. Conforme au
 * cadrage : on désactive au lieu de supprimer, les rôles s'attribuent (jamais
 * les permissions à la pièce), et l'anti-auto-blocage protège le gestionnaire
 * courant. La permission d'accès (`utilisateurs.gerer`) est posée par le
 * middleware de route ; la UserPolicy ajoute la protection du super-admin.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        // Comptes internes CGC uniquement : les comptes clients vivent dans la
        // même table mais relèvent d'un autre onglet et d'un autre circuit.
        $users = User::query()
            ->whereNull('consignataire_id')
            ->with('roles:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'phone' => $user->phone,
                'job_title' => $user->job_title,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'is_self' => $request->user()->is($user),
                'is_protected' => $user->hasRole(Profil::SuperAdmin->value),
                'roles' => $user->roles->pluck('name')->all(),
            ]);

        return Inertia::render('admin/utilisateurs', [
            'users' => $users,
            // Rôles attribuables (le rôle technique super-admin reste hors UI).
            'assignableRoles' => Role::query()
                ->where('name', '!=', Profil::SuperAdmin->value)
                ->orderBy('name')
                ->pluck('name'),
            'consignataires' => $this->consignataires(),
            'agents' => $this->agents(),
            'optionsPays' => $this->options(Pays::query()),
            'optionsArmements' => $this->options(Armement::query()),
            'optionsPorts' => $this->options(Port::query()),
            // Le volet client est visible par tout gestionnaire d'utilisateurs,
            // mais seul l'Administrateur y écrit (ADR-0025). Ce drapeau pilote
            // l'état de consultation des deux onglets concernés.
            'peutGererClients' => $request->user()?->can(Permission::ComptesClientsGerer->value) ?? false,
            // Matrice « Rôles & permissions ». Absente — et non vide — pour qui
            // n'a pas `roles.gerer` : l'onglet n'existe alors pas, et la
            // composition des rôles ne transite pas jusqu'au navigateur.
            'matriceRoles' => $request->user()?->can(Permission::RolesGerer->value)
                ? $this->matriceRoles()
                : null,
            'cataloguePermissions' => $this->cataloguePermissions(),
        ]);
    }

    /**
     * Les rôles de la matrice et leur composition courante (ADR-0025).
     *
     * `super-admin` en est absent : il ne porte aucune permission explicite et
     * outrepasse via Gate::before — l'afficher, fût-ce tout décoché, serait
     * mensonger. `Administrateur` y figure mais figé, en dernière colonne :
     * il porte le catalogue complet par définition.
     *
     * @return list<array<string, mixed>>
     */
    private function matriceRoles(): array
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->get()
            ->keyBy('name');

        $affiches = array_values(array_filter(
            Profil::cases(),
            static fn (Profil $profil): bool => ! $profil->estProtege(),
        ));

        // Les recomposables d'abord, la colonne figée en bout de tableau. Le tri
        // de PHP étant stable, l'ordre de l'enum est conservé dans chaque groupe.
        usort($affiches, static fn (Profil $a, Profil $b): int => $b->estRecomposable() <=> $a->estRecomposable());

        return array_values(array_map(
            static fn (Profil $profil): array => [
                'id' => $roles->get($profil->value)?->id,
                'name' => $profil->value,
                'recomposable' => $profil->estRecomposable(),
                'permissions' => $roles->get($profil->value)?->permissions->pluck('name')->all() ?? [],
            ],
            $affiches,
        ));
    }

    /**
     * Le catalogue des permissions, groupé par domaine — l'ordre des groupes est
     * celui de leur première apparition dans l'enum, qui va de l'exploitation
     * quotidienne vers l'administration.
     *
     * @return list<array{domaine: string, permissions: list<array{value: string, label: string}>}>
     */
    private function cataloguePermissions(): array
    {
        $groupes = [];

        foreach (Permission::cases() as $permission) {
            $groupes[$permission->domaine()][] = [
                'value' => $permission->value,
                'label' => $permission->label(),
            ];
        }

        return array_map(
            static fn (string $domaine, array $permissions): array => [
                'domaine' => $domaine,
                'permissions' => $permissions,
            ],
            array_keys($groupes),
            $groupes,
        );
    }

    /**
     * Sociétés consignataires (ADR-0014). Les deux rattachements N-N sont
     * projetés en deux temps : les identifiants pour le formulaire, les libellés
     * déjà résolus pour l'affichage — le front n'a jamais à recroiser les listes.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function consignataires(): Collection
    {
        return Consignataire::query()
            ->with([
                'paysImmatriculation:id,name',
                'armements:id,name',
                'ports:id,name',
                'titulaire:id,name,first_name,last_name,email,phone,job_title',
                'agents:id,name,email,consignataire_id,statut_validation',
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Consignataire $consignataire): array => [
                'id' => $consignataire->id,
                'name' => $consignataire->name,
                'sigle' => $consignataire->sigle,
                'rccm_nif' => $consignataire->rccm_nif,
                'pays_immatriculation_id' => $consignataire->pays_immatriculation_id,
                'pays_immatriculation_name' => $consignataire->paysImmatriculation?->name,
                'adresse' => $consignataire->adresse,
                'telephone' => $consignataire->telephone,
                'email' => $consignataire->email,
                'actif' => $consignataire->actif,
                // Compte maître de la société (ADR-0010). Projeté champ par
                // champ parce que le tiroir l'édite, pas seulement l'affiche.
                'titulaire_user_id' => $consignataire->titulaire_user_id,
                'titulaire_name' => $consignataire->titulaire?->name,
                'titulaire_first_name' => $consignataire->titulaire?->first_name,
                'titulaire_last_name' => $consignataire->titulaire?->last_name,
                'titulaire_email' => $consignataire->titulaire?->email,
                'titulaire_phone' => $consignataire->titulaire?->phone,
                'titulaire_job_title' => $consignataire->titulaire?->job_title,
                // Successeurs possibles à la fonction de titulaire (ADR-0027) —
                // la règle d'éligibilité est portée par le modèle, la fiche de
                // la société pose la même question.
                'agents_eligibles' => $consignataire->agentsEligiblesTitulaire()
                    ->map(fn (User $agent): array => ['value' => $agent->id, 'label' => $agent->name.' · '.$agent->email])
                    ->all(),
                // La liste ne montre plus *quels* comptes — la fiche s'en charge
                // — mais combien, et surtout combien attendent une décision :
                // c'est le seul chiffre qui appelle une action du CGC.
                'agents_count' => $consignataire->agents->count(),
                'agents_en_attente' => $consignataire->agents
                    ->filter(fn (User $agent): bool => $agent->statut_validation === StatutValidation::EnAttente)
                    ->count(),
                'armement_ids' => $consignataire->armements->pluck('id')->all(),
                'armement_names' => $consignataire->armements->pluck('name')->all(),
                'port_ids' => $consignataire->ports->pluck('id')->all(),
                'port_names' => $consignataire->ports->pluck('name')->all(),
            ]);
    }

    /**
     * Comptes agents consignataires, tous statuts confondus (ADR-0013) — y
     * compris les refusés, qui restent la trace opposable d'une décision prise
     * (ADR-0024).
     *
     * Le statut affiché combine la décision du CGC et l'activation : le front
     * n'a pas à refaire ce calcul pour retrouver les quatre états de l'écran.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function agents(): Collection
    {
        return User::query()
            ->whereNotNull('consignataire_id')
            ->with(['consignataire:id,name,titulaire_user_id', 'consignataire.armements:id,name,sigle', 'armements:id,name,sigle', 'valideur:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $agent): array => [
                'id' => $agent->id,
                'name' => $agent->name,
                'email' => $agent->email,
                'job_title' => $agent->job_title,
                'consignataire_id' => $agent->consignataire_id,
                'consignataire_name' => $agent->consignataire?->name,
                // Le titulaire figure ici comme les autres : il déclare aussi.
                // Le marqueur dit seulement qu'il gère en plus les comptes de sa
                // société — il ne change pas les actions offertes au CGC.
                'est_titulaire' => $agent->consignataire?->titulaire_user_id === $agent->id,
                'statut' => $agent->statutAffiche(),
                'armements' => $this->armements($agent->armements),
                // Le choix offert par le tiroir d'affectation : les armements de
                // sa société, et eux seuls (ADR-0009).
                'armements_societe' => $this->armements($agent->consignataire?->armements ?? collect()),
                'decide_par' => $agent->valideur?->name,
                'decide_le' => $agent->valide_le?->toIso8601String(),
                'motif_refus' => $agent->motif_refus,
            ]);
    }

    /**
     * @param  Collection<int, Armement>  $armements
     * @return list<array{id: int, name: string, sigle: string|null}>
     */
    private function armements(Collection $armements): array
    {
        return $armements
            ->map(fn (Armement $armement): array => [
                'id' => $armement->id,
                'name' => $armement->name,
                'sigle' => $armement->sigle,
            ])
            ->values()
            ->all();
    }

    /**
     * Liste déroulante d'un référentiel. Seules les entrées actives sont
     * proposées à la saisie ; un rattachement existant vers une entrée
     * désactivée reste porté par le formulaire et n'est donc pas perdu.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @return Collection<int, array{value: int, label: string}>
     */
    private function options(Builder $query): Collection
    {
        return $query->where('actif', true)
            ->orderBy('name')
            ->pluck('name', 'id')
            ->map(fn (string $label, int $value): array => ['value' => $value, 'label' => $label])
            ->values();
    }

    public function store(UserStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            $user = User::create([
                'name' => $this->composeName($data['first_name'], $data['last_name']),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'phone' => $data['phone'],
                'job_title' => $data['job_title'],
                'email' => $data['email'],
                'password' => $data['password'],
                'is_active' => true,
            ]);

            $user->syncRoles($data['roles'] ?? []);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Utilisateur créé.')]);

        return to_route('admin.utilisateurs.index');
    }

    public function update(UserUpdateRequest $request, User $utilisateur): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($request, $utilisateur, $data): void {
            $utilisateur->fill([
                'name' => $this->composeName($data['first_name'], $data['last_name']),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'phone' => $data['phone'],
                'job_title' => $data['job_title'],
                'email' => $data['email'],
            ]);

            if ($utilisateur->isDirty('email')) {
                $utilisateur->email_verified_at = null;
            }

            if (! empty($data['password'])) {
                $utilisateur->password = $data['password'];
            }

            $utilisateur->save();

            $this->syncRolesGuarded($request, $utilisateur, $data['roles'] ?? []);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Utilisateur mis à jour.')]);

        return to_route('admin.utilisateurs.index');
    }

    public function toggleActive(Request $request, User $utilisateur): RedirectResponse
    {
        Gate::authorize('update', $utilisateur);

        // Seule la désactivation est bridée ; réactiver est toujours permis.
        if ($utilisateur->is_active && $request->user()->is($utilisateur)) {
            throw ValidationException::withMessages([
                'is_active' => __('Vous ne pouvez pas désactiver votre propre compte.'),
            ]);
        }

        $utilisateur->is_active = ! $utilisateur->is_active;
        $utilisateur->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $utilisateur->is_active ? __('Utilisateur réactivé.') : __('Utilisateur désactivé.'),
        ]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Nom d'affichage « Prénom Nom » — alimente le champ `name` du starter kit
     * (initiales, en-têtes) à partir de l'identité détaillée.
     */
    private function composeName(string $firstName, string $lastName): string
    {
        return trim($firstName.' '.$lastName);
    }

    /**
     * Applique les rôles en interdisant à l'utilisateur de se retirer à
     * lui-même la capacité de gérer les utilisateurs (anti-auto-blocage,
     * ADR-0012). Le super-admin n'est pas concerné : il outrepasse via Gate.
     *
     * @param  list<string>  $roles
     */
    private function syncRolesGuarded(Request $request, User $utilisateur, array $roles): void
    {
        $modifieSonPropreCompte = $request->user()->is($utilisateur);

        if ($modifieSonPropreCompte && ! $utilisateur->hasRole(Profil::SuperAdmin->value)) {
            $conserveLaGestion = Role::query()
                ->whereIn('name', $roles)
                ->get()
                ->contains(fn (Role $role): bool => $role->hasPermissionTo(Permission::UtilisateursGerer->value));

            if (! $conserveLaGestion) {
                throw ValidationException::withMessages([
                    'roles' => __('Vous ne pouvez pas retirer votre propre capacité à gérer les utilisateurs.'),
                ]);
            }
        }

        $utilisateur->syncRoles($roles);
    }
}
