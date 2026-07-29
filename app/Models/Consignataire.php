<?php

namespace App\Models;

use App\Enums\StatutValidation;
use Database\Factories\ConsignataireFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Société consignataire — mandataire de l'armement dans le port (ADR-0014).
 * C'est l'entité facturée : les déclarations de ses agents lui sont imputées.
 *
 * @property int $id
 * @property string $name
 * @property string|null $sigle
 * @property string|null $rccm_nif
 * @property int|null $pays_immatriculation_id
 * @property string|null $adresse
 * @property string|null $telephone
 * @property string|null $email
 * @property int|null $titulaire_user_id
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'sigle',
    'rccm_nif',
    'pays_immatriculation_id',
    'adresse',
    'telephone',
    'email',
    'titulaire_user_id',
    'actif',
])]
class Consignataire extends Model
{
    /** @use HasFactory<ConsignataireFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Pays, $this> */
    public function paysImmatriculation(): BelongsTo
    {
        return $this->belongsTo(Pays::class, 'pays_immatriculation_id');
    }

    /**
     * Le compte maître de la société (WF1) : la personne qui gère le compte et
     * crée les agents. Absent tant que le CGC n'a pas ouvert le compte.
     *
     * @return BelongsTo<User, $this>
     */
    public function titulaire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'titulaire_user_id');
    }

    /**
     * Les comptes agents de la société (ADR-0013) — quel que soit leur état de
     * validation : un compte refusé reste rattaché, c'est la trace opposable
     * (ADR-0024).
     *
     * @return HasMany<User, $this>
     */
    public function agents(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Successeurs possibles à la fonction de titulaire : les agents validés de
     * la société, le titulaire en poste exclu — on ne se remplace pas soi-même
     * (ADR-0027).
     *
     * Porté par le modèle parce que la liste des sociétés et la fiche de l'une
     * d'elles posent tous deux la question, et qu'une règle d'éligibilité
     * évaluée à deux endroits finit par diverger.
     *
     * @return Collection<int, User>
     */
    public function agentsEligiblesTitulaire(): Collection
    {
        return $this->agents
            ->filter(fn (User $agent): bool => $agent->statut_validation === StatutValidation::Valide
                && $agent->id !== $this->titulaire_user_id)
            ->values();
    }

    /** @return BelongsToMany<Armement, $this> */
    public function armements(): BelongsToMany
    {
        return $this->belongsToMany(Armement::class);
    }

    /** @return BelongsToMany<Port, $this> */
    public function ports(): BelongsToMany
    {
        return $this->belongsToMany(Port::class);
    }
}
