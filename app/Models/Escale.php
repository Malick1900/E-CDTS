<?php

namespace App\Models;

use App\Concerns\NormaliseLeVoyage;
use App\Enums\EtapeDossier;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use Carbon\CarbonImmutable;
use Database\Factories\EscaleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Un dossier d'escale : le passage d'un navire, vu par un consignataire, pour
 * un sens de trafic (ENTITES §2).
 *
 * Un dossier par sens (WF3) : le consignataire qui décharge de l'import et
 * charge de l'export sur le même passage en ouvre deux, chacun avec son propre
 * verrou de transmission et son propre circuit jusqu'à la clôture.
 *
 * Il ne stocke ni les dates réelles d'accostage et de départ, ni le pavillon,
 * ni le type du navire : tout cela vit ailleurs — à la situation portuaire
 * pour les dates (ADR-0009), au référentiel pour le navire. Le dossier
 * référence ; il ne recopie pas.
 *
 * @property int $id
 * @property string $reference
 * @property string|null $numero_affiche
 * @property CarbonImmutable|null $numero_fige_le
 * @property int $consignataire_id
 * @property int|null $ouvert_par
 * @property int $navire_id
 * @property int|null $armement_id
 * @property string $voyage
 * @property string $voyage_normalise
 * @property SensTrafic $sens
 * @property int $port_id
 * @property int|null $poste_quai_id
 * @property CarbonImmutable|null $eta_prevue
 * @property int|null $mouvement_navire_id
 * @property EtapeDossier $etape
 * @property ModeExploitation|null $mode_exploitation
 * @property int|null $montant_liquide
 * @property CarbonImmutable $ouvert_le
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'consignataire_id',
    'ouvert_par',
    'navire_id',
    'armement_id',
    'voyage',
    'sens',
    'port_id',
    'poste_quai_id',
    'eta_prevue',
    'mode_exploitation',
])]
class Escale extends Model
{
    /** @use HasFactory<EscaleFactory> */
    use HasFactory;

    use NormaliseLeVoyage;

    protected function casts(): array
    {
        return [
            'sens' => SensTrafic::class,
            'etape' => EtapeDossier::class,
            'mode_exploitation' => ModeExploitation::class,
            'eta_prevue' => 'datetime',
            'numero_fige_le' => 'datetime',
            'ouvert_le' => 'datetime',
        ];
    }

    /**
     * Un dossier cherche sa ligne dès qu'il naît (ADR-0042). Le cas inverse —
     * la ligne arrive après le dossier — est pris en charge par le crochet
     * symétrique de `MouvementNavire`.
     */
    protected static function booted(): void
    {
        static::creating(static fn (self $escale) => $escale->heriteLeModeDExploitation());
        static::created(static fn (self $escale) => $escale->rapprocher());
    }

    /**
     * Le mode d'exploitation découle du navire.
     *
     * L'escale ne le lit pas chez lui, elle le **recopie** à sa création : à
     * partir de là, c'est elle qui fait foi pour la facturation, et le CGC seul
     * pourra la corriger pour ce passage sans toucher aux autres escales du
     * même navire (ENTITES §2, BAREME-CDTS.md §Notes de gestion).
     *
     * C'est un crochet de modèle et non un appel de contrôleur, pour la même
     * raison qu'ADR-0042 : le seeder, les factories et les imports à venir
     * n'ont pas à s'en souvenir. La recopie ne vivait jusqu'ici que dans
     * l'écran d'ouverture, et deux dossiers du jeu de démonstration sont nés
     * sans mode alors que leur navire en portait un.
     *
     * Une valeur posée explicitement n'est jamais écrasée : c'est le geste
     * réservé au CGC.
     *
     * **À défaut de tout, ligne régulière** (CGC, 2026-08-27). Un navire dont
     * le référentiel tait le mode est un navire de ligne : c'est l'ordinaire
     * du port, le tramping étant l'exception qu'on déclare. Un dossier naît
     * donc toujours avec un mode, et le bois export ne bute plus sur une case
     * vide du référentiel.
     */
    public function heriteLeModeDExploitation(): void
    {
        $this->mode_exploitation ??= $this->navire->mode_exploitation_defaut
            ?? ModeExploitation::LigneReguliere;
    }

    /**
     * La ligne de situation portuaire de ce passage — nulle tant que le navire
     * n'a pas été annoncé à la conférence.
     *
     * Sur `navire + voyage` seuls : ni le port (un voyage ne dessert qu'un
     * port), ni le sens (import et export d'un même passage pointent la MÊME
     * ligne, chacun y lisant sa date — ADR-0009).
     *
     * Deux lignes homonymes ne se départagent pas toutes seules : on rend null
     * et le filet manuel prendra le relais. Mieux vaut un dossier en attente
     * qu'un dossier rattaché au mauvais navire.
     */
    public function ligneDeSituation(): ?MouvementNavire
    {
        $candidates = MouvementNavire::query()
            ->where('navire_id', $this->navire_id)
            ->where('voyage_normalise', $this->voyage_normalise)
            ->take(2)
            ->get();

        return $candidates->count() === 1 ? $candidates->first() : null;
    }

    /**
     * Poser le lien s'il est certain. Sans effet si le dossier est déjà
     * rapproché : un rapprochement acquis ne se rejoue pas — c'est la ligne
     * contre laquelle le dossier aura été instruit.
     *
     * Le lien se pose sur une ligne encore en brouillon : l'identifier n'est
     * pas l'opposer. C'est `publiee_at` qui commande le verrou de transmission
     * (ADR-0013), pas le rapprochement.
     */
    public function rapprocher(): void
    {
        if ($this->mouvement_navire_id !== null) {
            return;
        }

        $ligne = $this->ligneDeSituation();

        if ($ligne === null) {
            return;
        }

        $this->mouvement_navire_id = $ligne->id;
        $this->saveQuietly();
    }

    /** Le dossier attend-il encore sa ligne de situation portuaire ? */
    public function enAttenteDeRapprochement(): bool
    {
        return $this->mouvement_navire_id === null;
    }

    /**
     * Les dossiers qui attendaient cette ligne. Appelé à l'inscription d'un
     * navire à la situation portuaire : c'est le cas le plus courant, le
     * consignataire ouvrant son dossier bien avant l'annonce du navire.
     */
    public static function rapprocherLesOrphelinsDe(MouvementNavire $mouvement): void
    {
        self::query()
            ->whereNull('mouvement_navire_id')
            ->where('navire_id', $mouvement->navire_id)
            ->where('voyage_normalise', $mouvement->voyage_normalise)
            ->get()
            ->each(static fn (self $escale) => $escale->rapprocher());
    }

    /**
     * La référence stable du prochain dossier de ce port (ADR-0008) —
     * `ESC-OWD-26-0342`. La séquence court par port et par année : c'est ainsi
     * que le CGC compte ses escales.
     *
     * L'unicité en base reste le juge : deux ouvertures simultanées peuvent
     * calculer le même rang, et c'est la contrainte qui tranche.
     */
    public static function referenceSuivante(Port $port): string
    {
        $racine = sprintf(
            'ESC-%s-%s-',
            $port->prefixe_numerotation ?? $port->code,
            now()->format('y'),
        );

        /** @var string|null $derniere */
        $derniere = self::query()->where('reference', 'like', $racine.'%')->max('reference');

        $rang = $derniere === null ? 0 : (int) substr($derniere, strlen($racine));

        return $racine.str_pad((string) ($rang + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * Le numéro que l'écran montre : le n° de manifeste une fois figé, la
     * référence interne tant qu'il n'existe pas (ADR-0008).
     */
    public function libelle(): string
    {
        return $this->numero_affiche ?? $this->reference;
    }

    /** Le numéro affiché est-il encore provisoire, faute de manifeste ? */
    public function numeroProvisoire(): bool
    {
        return $this->numero_affiche === null;
    }

    /**
     * Le dossier entre au stade « Manifeste » : il en a reçu un, fût-il vide.
     *
     * L'étape avance seule, sans attendre le numéro — les deux ne surviennent
     * plus au même moment. Un consignataire qui ouvre sa saisie manuelle est
     * bien au stade « Manifeste », alors que son dossier restera sous numéro
     * provisoire jusqu'à la transmission (ADR-0046).
     */
    public function entreEnManifeste(): void
    {
        if ($this->etape !== EtapeDossier::Ouvert) {
            return;
        }

        $this->etape = EtapeDossier::Manifeste;
        $this->saveQuietly();
    }

    /**
     * Le n° de manifeste devient le libellé du dossier, et s'y fige (ADR-0008).
     *
     * Sans retour : un dossier repris à zéro garde le libellé sous lequel il a
     * circulé, et le manifeste redéposé recevra de toute façon son propre
     * numéro sans toucher à celui-ci.
     */
    public function figerLeNumero(string $numero): void
    {
        if ($this->numero_affiche !== null) {
            return;
        }

        $this->numero_affiche = $numero;
        $this->numero_fige_le = now();
        $this->saveQuietly();
    }

    /**
     * La transmission au CGC est-elle ouverte par la situation portuaire ?
     *
     * Le verrou est directionnel et calculé, jamais stocké (ADR-0009) : un
     * dossier import s'ouvre quand le navire est à quai, un dossier export
     * quand il est sorti — et dans les deux cas sur une ligne PUBLIÉE. Tant que
     * le dossier n'est pas rapproché, rien ne l'ouvre.
     */
    public function verrouOuvert(): bool
    {
        return $this->mouvementNavire?->ouvreLaTransmission($this->sens) === true;
    }

    /**
     * Le périmètre de lecture d'un compte.
     *
     * Un compte client ne voit que les dossiers de SA société — les siens comme
     * ceux de ses collègues, puisque le dossier appartient à la société et non
     * à la personne qui l'a ouvert. Un interne CGC voit tout : c'est lui qui
     * instruit le circuit.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisiblePar(Builder $query, User $user): void
    {
        if ($user->consignataire_id !== null) {
            $query->where('consignataire_id', $user->consignataire_id);
        }
    }

    /**
     * Le même périmètre, sur un dossier déjà en main : ce que
     * `scopeVisiblePar` fait à une requête, celui-ci le dit d'une instance.
     *
     * Un dossier hors périmètre n'est pas interdit, il n'existe pas — d'où le
     * 404 des controllers plutôt qu'un 403, qui confirmerait sa présence.
     */
    public function estVisiblePar(User $user): bool
    {
        return $user->consignataire_id === null
            || $user->consignataire_id === $this->consignataire_id;
    }

    /**
     * Le manifeste du dossier — nul tant que le consignataire ne l'a pas
     * renseigné (WF4). C'est son numéro qui figera le libellé du dossier
     * (ADR-0008) ; un dossier n'en porte qu'un tant que le circuit n'a pas
     * atteint le PV validé.
     *
     * @return HasOne<Manifeste, $this>
     */
    public function manifeste(): HasOne
    {
        return $this->hasOne(Manifeste::class);
    }

    /** @return BelongsTo<Consignataire, $this> */
    public function consignataire(): BelongsTo
    {
        return $this->belongsTo(Consignataire::class);
    }

    /** @return BelongsTo<User, $this> */
    public function ouvertPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ouvert_par');
    }

    /** @return BelongsTo<Navire, $this> */
    public function navire(): BelongsTo
    {
        return $this->belongsTo(Navire::class);
    }

    /** @return BelongsTo<Armement, $this> */
    public function armement(): BelongsTo
    {
        return $this->belongsTo(Armement::class);
    }

    /** @return BelongsTo<Port, $this> */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class);
    }

    /** @return BelongsTo<PosteQuai, $this> */
    public function posteQuai(): BelongsTo
    {
        return $this->belongsTo(PosteQuai::class);
    }

    /**
     * La ligne de situation portuaire de ce passage — nulle tant que le navire
     * n'a pas été annoncé à la conférence (ADR-0009).
     *
     * @return BelongsTo<MouvementNavire, $this>
     */
    public function mouvementNavire(): BelongsTo
    {
        return $this->belongsTo(MouvementNavire::class);
    }
}
