<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Permission;
use App\Enums\Profil;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserStoreRequest;
use App\Http\Requests\Admin\UserUpdateRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $users = User::query()
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
        ]);
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
