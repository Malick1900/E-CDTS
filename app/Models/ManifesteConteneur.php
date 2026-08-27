<?php

namespace App\Models;

use App\Enums\TypeMarchandise;
use Database\Factories\ManifesteConteneurFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une boîte d'un connaissement — la maille du forfait (WF4/WF5).
 *
 * @property int $id
 * @property int $manifeste_bl_id
 * @property string $reference
 * @property int|null $taille
 * @property int|null $colis
 * @property bool|null $plein
 * @property int|null $tare_kg
 * @property TypeMarchandise|null $type_marchandise
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read ManifesteBl $bl
 */
#[Fillable([
    'manifeste_bl_id',
    'reference',
    'taille',
    'colis',
    'plein',
    'tare_kg',
    'type_marchandise',
])]
class ManifesteConteneur extends Model
{
    /** @use HasFactory<ManifesteConteneurFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'taille' => 'integer',
            'colis' => 'integer',
            'plein' => 'boolean',
            'tare_kg' => 'integer',
            'type_marchandise' => TypeMarchandise::class,
        ];
    }

    /** « 40′ » — ce que le tableau montre en colonne « Taille ». */
    public function tailleAffichee(): string
    {
        return $this->taille === null ? '—' : $this->taille.'′';
    }

    /** @return BelongsTo<ManifesteBl, $this> */
    public function bl(): BelongsTo
    {
        return $this->belongsTo(ManifesteBl::class, 'manifeste_bl_id');
    }
}
