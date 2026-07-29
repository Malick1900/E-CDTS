<?php

namespace App\Models;

use Database\Factories\ArmementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Référentiel Armement (= armateur / compagnie maritime, ADR-0014).
 *
 * @property int $id
 * @property string $name
 * @property string|null $sigle
 * @property int|null $pays_origine_id
 * @property int|null $pays_immatriculation_id
 * @property string|null $gerant
 * @property string|null $rccm_nif
 * @property string|null $adresse
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'sigle',
    'pays_origine_id',
    'pays_immatriculation_id',
    'gerant',
    'rccm_nif',
    'adresse',
    'actif',
])]
class Armement extends Model
{
    /** @use HasFactory<ArmementFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Pays, $this> */
    public function paysOrigine(): BelongsTo
    {
        return $this->belongsTo(Pays::class, 'pays_origine_id');
    }

    /** @return BelongsTo<Pays, $this> */
    public function paysImmatriculation(): BelongsTo
    {
        return $this->belongsTo(Pays::class, 'pays_immatriculation_id');
    }

    /** @return HasMany<Navire, $this> */
    public function navires(): HasMany
    {
        return $this->hasMany(Navire::class);
    }

    /**
     * Sociétés qui représentent cet armement au port (ADR-0014).
     *
     * @return BelongsToMany<Consignataire, $this>
     */
    public function consignataires(): BelongsToMany
    {
        return $this->belongsToMany(Consignataire::class);
    }
}
