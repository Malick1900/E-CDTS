<?php

namespace App\Models;

use Database\Factories\PosteQuaiFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un poste d'accostage d'un port.
 *
 * @property int $id
 * @property int $port_id
 * @property string $code
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['port_id', 'code', 'actif'])]
class PosteQuai extends Model
{
    /** @use HasFactory<PosteQuaiFactory> */
    use HasFactory;

    protected $table = 'postes_quai';

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Port, $this> */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class);
    }
}
