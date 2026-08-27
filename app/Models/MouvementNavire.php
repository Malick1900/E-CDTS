<?php

namespace App\Models;

use App\Concerns\NormaliseLeVoyage;
use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use Database\Factories\MouvementNavireFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une ligne de la situation portuaire : le passage d'un navire, pour un voyage.
 *
 * Elle ne stocke ni le type, ni le pavillon, ni l'armateur : tout cela vit sur
 * le navire du référentiel, qu'elle référence. Deux vérités pour un même
 * navire finiraient par diverger.
 *
 * `eta` et `etd` sont les dates RÉELLES d'accostage et de départ — les sigles
 * viennent du vocabulaire du port, pas d'une notion de prévision (CGC,
 * 2026-08-26). Le verrou d'ADR-0009 les lit donc directement.
 *
 * @property int $id
 * @property int $port_id
 * @property int $navire_id
 * @property string $voyage
 * @property SensTrafic $sens
 * @property StatutNavire $statut
 * @property int|null $poste_quai_id
 * @property Carbon|null $eta
 * @property Carbon|null $etd
 * @property int|null $consignataire_id
 * @property Carbon|null $publiee_at
 * @property int|null $publiee_par
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'port_id',
    'navire_id',
    'voyage',
    'sens',
    'statut',
    'poste_quai_id',
    'eta',
    'etd',
    'consignataire_id',
])]
class MouvementNavire extends Model
{
    /** @use HasFactory<MouvementNavireFactory> */
    use HasFactory;

    use NormaliseLeVoyage;

    protected $table = 'mouvements_navire';

    protected function casts(): array
    {
        return [
            'sens' => SensTrafic::class,
            'statut' => StatutNavire::class,
            'eta' => 'datetime',
            'etd' => 'datetime',
            'publiee_at' => 'datetime',
        ];
    }

    /**
     * Inscrire un navire rapproche les dossiers qui l'attendaient (ADR-0042).
     *
     * C'est le versant qui tient la promesse d'ADR-0009 : « la mise à jour de
     * la situation portuaire ouvre le verrou automatiquement, sans action côté
     * dossier ». Un dossier s'ouvre le plus souvent avant que le navire ne soit
     * annoncé à la conférence — sans ce crochet, il resterait orphelin jusqu'à
     * ce que quelqu'un y pense.
     *
     * Sur `created` seulement : ni le navire ni le voyage ne sont modifiables
     * sur une ligne existante (`MouvementNavireValidationRules`), donc la clé
     * de rapprochement ne bouge jamais après l'inscription.
     */
    protected static function booted(): void
    {
        static::created(static fn (self $mouvement) => Escale::rapprocherLesOrphelinsDe($mouvement));
    }

    /** @return BelongsTo<Port, $this> */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class);
    }

    /** @return BelongsTo<Navire, $this> */
    public function navire(): BelongsTo
    {
        return $this->belongsTo(Navire::class);
    }

    /** @return BelongsTo<PosteQuai, $this> */
    public function posteQuai(): BelongsTo
    {
        return $this->belongsTo(PosteQuai::class);
    }

    /** @return BelongsTo<Consignataire, $this> */
    public function consignataire(): BelongsTo
    {
        return $this->belongsTo(Consignataire::class);
    }

    /** @return BelongsTo<User, $this> */
    public function publicateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'publiee_par');
    }

    /**
     * Le brouillon : saisi, pas encore validé par un supérieur (ADR-0013).
     *
     * @param  Builder<MouvementNavire>  $query
     */
    public function scopeBrouillon(Builder $query): void
    {
        $query->whereNull('publiee_at');
    }

    /**
     * Ce que le dehors a le droit de voir — et la seule matière du verrou de
     * transmission, qui ne s'ouvre pas sur une saisie non validée.
     *
     * @param  Builder<MouvementNavire>  $query
     */
    public function scopePubliee(Builder $query): void
    {
        $query->whereNotNull('publiee_at');
    }

    /**
     * L'ordre du tableau, partout où il est rendu — écran, vue publique, PDF.
     *
     * La frise d'abord : une escale se lit du jalon le plus avancé au plus
     * lointain. Trier en SQL sur la colonne `statut` donnerait l'ordre
     * alphabétique (`attendu`, `hors_zone`, `quai`, `rade`…), qui n'est l'ordre
     * de rien — d'où un tri en mémoire sur le rang de l'enum. Une situation de
     * port tient en quelques dizaines de lignes.
     *
     * @return array<int, callable(self, self): int>
     */
    public static function ordreDeLaSituation(): array
    {
        return [
            static fn (self $a, self $b): int => $a->statut->rang() <=> $b->statut->rang(),
            static fn (self $a, self $b): int => $a->rangChronologique() <=> $b->rangChronologique(),
        ];
    }

    /** Clé de tri chronologique — une escale sans date d'accostage passe en tête. */
    public function rangChronologique(): int
    {
        $accostage = $this->eta;

        return $accostage === null ? 0 : $accostage->getTimestamp();
    }

    /**
     * Les escales qui **touchent** la période, et non celles qui y tiennent
     * entièrement : un navire accosté avant le 1er et reparti après le 15 fait
     * partie de la situation du 1er au 15, et doit y figurer.
     *
     * Une escale sans date de départ n'est pas terminée — elle court donc
     * jusqu'à aujourd'hui et au-delà. Une ligne sans aucune date n'appartient à
     * aucune période : elle est écartée.
     *
     * @param  Builder<MouvementNavire>  $query
     */
    public function scopeDansLaPeriode(Builder $query, Carbon $du, Carbon $au): void
    {
        $query
            ->where(fn (Builder $q) => $q->whereNotNull('eta')->orWhereNotNull('etd'))
            // L'escale a commencé avant la fin de la période…
            ->whereRaw('COALESCE(eta, etd) <= ?', [$au])
            // …et ne s'était pas achevée avant son début.
            ->where(fn (Builder $q) => $q->whereNull('etd')->orWhere('etd', '>=', $du));
    }

    /**
     * Le verrou de transmission d'ADR-0009, calculé et jamais stocké : le jalon
     * attendu est franchi ET la date correspondante est renseignée.
     *
     * Le sens passé est celui du DOSSIER, pas celui de la ligne : un même
     * passage de navire porte un dossier import et un dossier export, chacun
     * lisant sa propre date.
     */
    public function ouvreLaTransmission(SensTrafic $sensDuDossier): bool
    {
        if ($this->publiee_at === null) {
            return false;
        }

        $jalon = StatutNavire::jalonDeVerrou($sensDuDossier);
        $date = $sensDuDossier === SensTrafic::Import ? $this->eta : $this->etd;

        return $this->statut->rang() >= $jalon->rang() && $date !== null;
    }

    /**
     * La ligne peut-elle être publiée en l'état ? Un statut franchi sans sa
     * date laisserait le verrou fermé sur une escale pourtant avancée — d'où
     * un contrôle bloquant à la publication, mais jamais à la saisie : en
     * conférence, on note ce qu'on entend, on complète après.
     */
    public function estCoherente(): bool
    {
        if ($this->statut->exigeEta() && $this->eta === null) {
            return false;
        }

        return ! ($this->statut->exigeEtd() && $this->etd === null);
    }
}
