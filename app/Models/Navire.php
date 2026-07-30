<?php

namespace App\Models;

use App\Enums\ModeExploitation;
use Database\Factories\NavireFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Référentiel Navire — entité maîtresse rapprochée du manifeste (ADR-0009).
 *
 * @property int $id
 * @property string $name
 * @property string|null $imo
 * @property int|null $pays_id
 * @property int|null $type_navire_id
 * @property int|null $armement_id
 * @property ModeExploitation|null $mode_exploitation_defaut
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'imo',
    'pays_id',
    'type_navire_id',
    'armement_id',
    'mode_exploitation_defaut',
    'actif',
])]
class Navire extends Model
{
    /** @use HasFactory<NavireFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'mode_exploitation_defaut' => ModeExploitation::class,
            'actif' => 'boolean',
        ];
    }

    /**
     * Pavillon.
     *
     * @return BelongsTo<Pays, $this>
     */
    public function pays(): BelongsTo
    {
        return $this->belongsTo(Pays::class);
    }

    /** @return BelongsTo<TypeNavire, $this> */
    public function typeNavire(): BelongsTo
    {
        return $this->belongsTo(TypeNavire::class);
    }

    /** @return BelongsTo<Armement, $this> */
    public function armement(): BelongsTo
    {
        return $this->belongsTo(Armement::class);
    }
}
