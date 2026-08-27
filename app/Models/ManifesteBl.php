<?php

namespace App\Models;

use App\Enums\TypeMarchandise;
use Database\Factories\ManifesteBlFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Un connaissement du manifeste — la maille de facturation (WF4/WF5).
 *
 * Poids, volume et colis sont portés ICI et nulle part ailleurs. Le tableau les
 * affiche sur une seule des lignes du BL et les totalise une seule fois : les
 * répéter par conteneur ferait tripler le tonnage d'un BL à trois boîtes.
 *
 * @property int $id
 * @property int $manifeste_id
 * @property string $reference
 * @property int|null $ligne_numero
 * @property string|null $master_reference
 * @property string|null $port_chargement
 * @property string|null $port_chargement_nom
 * @property string|null $port_dechargement
 * @property string|null $port_dechargement_nom
 * @property string|null $expediteur
 * @property string|null $destinataire
 * @property string|null $description
 * @property int|null $poids_brut_kg
 * @property string|null $volume_m3
 * @property int|null $colis
 * @property int $conteneurs_annonces
 * @property bool $hors_conteneur
 * @property TypeMarchandise|null $type_marchandise
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Manifeste $manifeste
 * @property-read Collection<int, ManifesteConteneur> $conteneurs
 */
#[Fillable([
    'manifeste_id',
    'reference',
    'ligne_numero',
    'master_reference',
    'port_chargement',
    'port_chargement_nom',
    'port_dechargement',
    'port_dechargement_nom',
    'expediteur',
    'destinataire',
    'description',
    'poids_brut_kg',
    'volume_m3',
    'colis',
    'conteneurs_annonces',
    'hors_conteneur',
    'type_marchandise',
])]
class ManifesteBl extends Model
{
    /** @use HasFactory<ManifesteBlFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'poids_brut_kg' => 'integer',
            'volume_m3' => 'decimal:3',
            'colis' => 'integer',
            'conteneurs_annonces' => 'integer',
            'hors_conteneur' => 'boolean',
            'type_marchandise' => TypeMarchandise::class,
        ];
    }

    /**
     * Ce BL est-il un house/dégroupage ?
     *
     * Le manifeste ne porte pas de drapeau : c'est la présence d'un
     * connaissement mère qui le dit (MANIFESTE-XML.md, colonne 2).
     */
    public function groupage(): bool
    {
        return $this->master_reference !== null && $this->master_reference !== '';
    }

    /**
     * Le volume en mètres cubes, sous une forme calculable.
     *
     * Le cast décimal rend une chaîne — c'est ce qu'il faut pour l'afficher
     * sans perte, pas pour multiplier un tarif.
     */
    public function volume(): ?float
    {
        return $this->volume_m3 === null ? null : (float) $this->volume_m3;
    }

    /** @return BelongsTo<Manifeste, $this> */
    public function manifeste(): BelongsTo
    {
        return $this->belongsTo(Manifeste::class);
    }

    /** @return HasMany<ManifesteConteneur, $this> */
    public function conteneurs(): HasMany
    {
        return $this->hasMany(ManifesteConteneur::class);
    }
}
