<?php

namespace App\Models;

use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Enums\UniteBareme;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Une ligne du barème CDTS : un article tarifé, dans un sens de trafic (ADR-0034).
 *
 * @property int $id
 * @property string $reference
 * @property SensTrafic $sens
 * @property TypeMarchandise|null $type_marchandise
 * @property UniteBareme|null $unite
 * @property ModeExploitation|null $mode_exploitation
 * @property string $designation
 * @property string $montant_cfa
 * @property bool $actif
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'reference',
    'sens',
    'type_marchandise',
    'unite',
    'mode_exploitation',
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
            'type_marchandise' => TypeMarchandise::class,
            'unite' => UniteBareme::class,
            'mode_exploitation' => ModeExploitation::class,
            'montant_cfa' => 'decimal:2',
            'actif' => 'boolean',
        ];
    }

    /**
     * La ligne peut-elle servir à liquider ?
     *
     * Il lui faut un type de marchandise — sans quoi aucune qualification ne
     * la désigne — et une unité — sans quoi on ne sait par quoi multiplier.
     * Six lignes de la grille officielle n'ont ni l'un ni l'autre : elles
     * restent affichées et ne facturent rien (ADR-0044).
     */
    public function facturable(): bool
    {
        return $this->actif && $this->type_marchandise !== null && $this->unite !== null;
    }

    /**
     * Les types de marchandise réellement facturables dans un sens donné.
     *
     * Un type dont plus aucune ligne n'est en exploitation ne doit pas être
     * proposé à la qualification : il s'afficherait sans jamais produire de
     * montant, et la ligne resterait à qualifier indéfiniment sans qu'on
     * comprenne pourquoi. Mieux vaut ne pas l'offrir — c'est déjà le principe
     * retenu pour les types mono-sens (BAREME-CDTS.md).
     *
     * C'est ce qui rend visible, à l'écran, une décision prise au barème : le
     * jour où le CGC réactive les hydrocarbures, le type revient dans la liste
     * sans qu'on touche au code.
     *
     * @return list<TypeMarchandise>
     */
    public static function typesFacturables(SensTrafic $sens): array
    {
        $facturables = self::query()
            ->where('sens', $sens)
            ->where('actif', true)
            ->whereNotNull('type_marchandise')
            ->whereNotNull('unite')
            ->pluck('type_marchandise')
            ->all();

        return array_values(array_filter(
            TypeMarchandise::pour($sens),
            static fn (TypeMarchandise $type): bool => in_array($type, $facturables, true),
        ));
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
