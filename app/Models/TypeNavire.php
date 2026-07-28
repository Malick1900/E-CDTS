<?php

namespace App\Models;

use Database\Factories\TypeNavireFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Référentiel Type de navire (porte-conteneurs, vraquier, RoRo…).
 *
 * @property int $id
 * @property string $name
 * @property string $code
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'code', 'actif'])]
class TypeNavire extends Model
{
    /** @use HasFactory<TypeNavireFactory> */
    use HasFactory;

    protected $table = 'types_navire';

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return HasMany<Navire, $this> */
    public function navires(): HasMany
    {
        return $this->hasMany(Navire::class);
    }
}
