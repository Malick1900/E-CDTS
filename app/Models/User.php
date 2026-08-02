<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\StatutValidation;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string|null $first_name
 * @property string|null $last_name
 * @property string|null $phone
 * @property string|null $job_title
 * @property string $email
 * @property CarbonImmutable|null $email_verified_at
 * @property bool $is_active
 * @property CarbonImmutable|null $last_login_at
 * @property string $password
 * @property CarbonImmutable|null $password_changed_at
 * @property string|null $remember_token
 * @property int|null $consignataire_id
 * @property StatutValidation|null $statut_validation
 * @property int|null $valide_par_user_id
 * @property CarbonImmutable|null $valide_le
 * @property string|null $motif_refus
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'name',
    'first_name',
    'last_name',
    'phone',
    'job_title',
    'email',
    'is_active',
    'password',
    'consignataire_id',
    'statut_validation',
    'valide_par_user_id',
    'valide_le',
    'motif_refus',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'password_changed_at' => 'datetime',
            'statut_validation' => StatutValidation::class,
            'valide_le' => 'datetime',
        ];
    }

    /**
     * Horodate tout changement de mot de passe, d'où qu'il vienne.
     *
     * Ici et non dans le contrôleur du profil, parce que le mot de passe change
     * par trois portes — l'écran Profil, le lien de réinitialisation envoyé à
     * l'agent validé (ADR-0035), et le « mot de passe oublié ». Trois portes,
     * trois oublis possibles ; le modèle les tient toutes.
     *
     * `updating` et non `saving` : à la création, le mot de passe n'a pas
     * changé, il vient d'être attribué. Un compte agent en attente affiche donc
     * « jamais modifié » tant qu'il n'a pas suivi son lien.
     */
    protected static function booted(): void
    {
        static::updating(function (User $user): void {
            if ($user->isDirty('password')) {
                $user->password_changed_at = now();
            }
        });
    }

    /**
     * La société dont ce compte est le **titulaire** (compte maître, ADR-0014).
     * Nulle pour un utilisateur CGC comme pour un agent consignataire : seul le
     * titulaire porte ce lien, et il n'en porte qu'un (unicité en base).
     *
     * @return HasOne<Consignataire, $this>
     */
    public function consignataireTitulaire(): HasOne
    {
        return $this->hasOne(Consignataire::class, 'titulaire_user_id');
    }

    /**
     * La société de rattachement d'un compte client (ADR-0013). Nulle pour un
     * compte interne CGC : c'est ce lien qui distingue les deux populations.
     *
     * @return BelongsTo<Consignataire, $this>
     */
    public function consignataire(): BelongsTo
    {
        return $this->belongsTo(Consignataire::class);
    }

    /**
     * L'agent CGC ayant pris la dernière décision de validation (ADR-0024).
     *
     * @return BelongsTo<User, $this>
     */
    public function valideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par_user_id');
    }

    /**
     * Portée de l'agent : les armements sur lesquels il peut opérer (ADR-0009).
     * Filtre de données, jamais une permission.
     *
     * @return BelongsToMany<Armement, $this>
     */
    public function armements(): BelongsToMany
    {
        return $this->belongsToMany(Armement::class);
    }

    /** Un compte client (agent consignataire) par opposition à un interne CGC. */
    public function estAgent(): bool
    {
        return $this->consignataire_id !== null;
    }

    /**
     * Ce compte peut-il conférer ce rôle à quelqu'un ? (ADR-0033)
     *
     * On ne donne pas ce qu'on n'a pas : un rôle n'est attribuable que par un
     * compte qui porte déjà chacune de ses permissions. Sans cette règle, un
     * Superviseur — qui gère les utilisateurs mais pas les rôles (ADR-0025) —
     * se créait un compte Administrateur et reprenait par la porte de service
     * tout ce que cette séparation lui refusait.
     *
     * La règle suit le contenu réel des rôles, pas leur nom : recomposer un rôle
     * déplace aussitôt qui peut l'attribuer. Le super-admin n'est pas gêné, il
     * outrepasse via Gate::before — `can()` lui répond oui pour tout.
     */
    public function peutConferer(Role $role): bool
    {
        return $role->permissions->every(
            fn (Permission $permission): bool => $this->can($permission->name),
        );
    }

    /**
     * Les quatre états affichés d'un compte agent : la décision du CGC croisée
     * avec l'activation du compte. « Désactivé » n'est donc pas un refus — c'est
     * un accès accordé puis suspendu (ADR-0013/0024).
     *
     * Porté par le modèle parce que deux écrans le lisent — la liste des agents
     * et la fiche de leur société — et qu'un état calculé à deux endroits finit
     * par diverger.
     */
    public function statutAffiche(): string
    {
        if ($this->statut_validation !== StatutValidation::Valide) {
            // Nul pour un interne CGC, qui n'est soumis à aucune validation.
            return $this->statut_validation->value ?? StatutValidation::EnAttente->value;
        }

        return $this->is_active ? 'actif' : 'desactive';
    }
}
