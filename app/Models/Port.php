<?php

namespace App\Models;

use Database\Factories\PortFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Référentiel Port d'escale (code UN/LOCODE).
 *
 * @property int $id
 * @property string $name
 * @property string $code
 * @property int|null $pays_id
 * @property string|null $prefixe_numerotation
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'code', 'pays_id', 'prefixe_numerotation', 'actif'])]
class Port extends Model
{
    /** @use HasFactory<PortFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Pays, $this> */
    public function pays(): BelongsTo
    {
        return $this->belongsTo(Pays::class);
    }
}
