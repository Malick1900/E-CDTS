<?php

namespace App\Models;

use App\Enums\SensTrafic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Une ligne du barème CDTS : un article tarifé, dans un sens de trafic (ADR-0034).
 *
 * @property int $id
 * @property string $reference
 * @property SensTrafic $sens
 * @property string $designation
 * @property string $montant_cfa
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'reference',
    'sens',
    'designation',
    'montant_cfa',
    'actif',
])]
class BaremeLigne extends Model
{
    protected function casts(): array
    {
        return [
            'sens' => SensTrafic::class,
            'montant_cfa' => 'decimal:2',
            'actif' => 'boolean',
        ];
    }

    /**
     * Le montant en euros, déduit de la parité fixe XAF/EUR.
     *
     * Calculé et jamais stocké : le barème n'a qu'une valeur de référence, le
     * franc. Arrondi au centime, comme le document officiel — sur la valeur
     * exacte, pas sur un intermédiaire déjà arrondi.
     */
    public function montantEuro(): float
    {
        $taux = (float) config('cdts.taux_euro_cfa');

        if ($taux <= 0) {
            return 0.0;
        }

        return round((float) $this->montant_cfa / $taux, 2);
    }
}
