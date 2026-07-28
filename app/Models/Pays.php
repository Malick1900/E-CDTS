<?php

namespace App\Models;

use Database\Factories\PaysFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Référentiel Pays (ISO 3166-1 alpha-2) — pavillon des navires, origine et
 * immatriculation des armements.
 *
 * @property int $id
 * @property string $name
 * @property string $code
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'code', 'actif'])]
class Pays extends Model
{
    /** @use HasFactory<PaysFactory> */
    use HasFactory;

    // « pays » est invariable : on fixe le nom de table (l'inflexion anglaise
    // le déduirait mal).
    protected $table = 'pays';

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return HasMany<Navire, $this> */
    public function navires(): HasMany
    {
        return $this->hasMany(Navire::class);
    }

    /** @return HasMany<Port, $this> */
    public function ports(): HasMany
    {
        return $this->hasMany(Port::class);
    }
}
