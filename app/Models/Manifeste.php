<?php

namespace App\Models;

use App\Enums\EtatManifeste;
use App\Enums\ModeSaisieManifeste;
use App\Enums\SensTrafic;
use Database\Factories\ManifesteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Le manifeste d'un dossier d'escale (WF4).
 *
 * Il ne détient pas grand-chose en propre : son numéro, par où il est entré, et
 * où il en est. Tout le reste — les expéditions — vit dans ses BL et leurs
 * conteneurs, et c'est là que se joue la liquidation.
 *
 * Son numéro fige le libellé du dossier au premier rattachement (ADR-0008) :
 * `Escale::numero_affiche` cesse d'être provisoire et ne bougera plus.
 *
 * @property int $id
 * @property int $escale_id
 * @property string|null $numero
 * @property ModeSaisieManifeste $mode_saisie
 * @property EtatManifeste $etat
 * @property string|null $piece_jointe_chemin
 * @property string|null $piece_jointe_nom
 * @property int|null $piece_jointe_octets
 * @property int|null $depose_par
 * @property Carbon|null $transmis_le
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Escale $escale
 * @property-read Collection<int, ManifesteBl> $bls
 */
#[Fillable([
    'escale_id',
    'numero',
    'mode_saisie',
    'etat',
    'piece_jointe_chemin',
    'piece_jointe_nom',
    'piece_jointe_octets',
    'depose_par',
    'transmis_le',
])]
class Manifeste extends Model
{
    /** @use HasFactory<ManifesteFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'mode_saisie' => ModeSaisieManifeste::class,
            'etat' => EtatManifeste::class,
            'transmis_le' => 'datetime',
        ];
    }

    /**
     * Le dossier suit son manifeste, quelle que soit la porte d'entrée —
     * import XML, saisie manuelle, seeder de démonstration (ADR-0042).
     *
     * Le crochet avance l'étape ; il ne numérote pas. Le figement du libellé
     * n'a pas lieu ici parce qu'il n'a pas lieu au même moment selon la voie :
     * au dépôt en import, à la transmission en saisie manuelle (ADR-0046).
     */
    protected static function booted(): void
    {
        static::created(static fn (self $manifeste) => $manifeste->escale->entreEnManifeste());
    }

    /**
     * Attribuer son numéro au manifeste, et le donner au dossier (ADR-0046).
     *
     * Sans effet s'il en a déjà un : le numéro d'un manifeste ne change pas,
     * et celui du dossier encore moins — il a circulé sous ce libellé.
     */
    public function numeroter(): void
    {
        if ($this->numero !== null) {
            return;
        }

        $this->numero = self::numeroSuivant();
        $this->save();

        $this->escale->figerLeNumero($this->numero);
    }

    /**
     * Le prochain n° de manifeste — « 2026 M 00123 ».
     *
     * La forme est celle des manifestes gabonais réels : l'année, la lettre M,
     * puis un rang à cinq chiffres. La séquence court **par année**, sans
     * distinction de port : un manifeste est un document unique dans le
     * système, pas le ticket d'un guichet.
     *
     * Elle se calcule sur ce qui a été **attribué**, et non sur ce qui subsiste
     * : le libellé figé d'un dossier tient registre d'un numéro dont le
     * manifeste a pu être repris à zéro depuis. Ne regarder que les manifestes
     * vivants rendrait ce numéro à la séquence, et deux documents porteraient
     * le même — dont un que le dossier affiche encore.
     *
     * L'unicité en base reste le juge : deux dépôts simultanés peuvent
     * calculer le même rang, et c'est la contrainte qui tranche.
     */
    public static function numeroSuivant(): string
    {
        $racine = now()->format('Y').' M ';

        /** @var string|null $dernierManifeste */
        $dernierManifeste = self::query()->where('numero', 'like', $racine.'%')->max('numero');

        /** @var string|null $dernierFige */
        $dernierFige = Escale::query()->where('numero_affiche', 'like', $racine.'%')->max('numero_affiche');

        $dernier = max($dernierManifeste ?? '', $dernierFige ?? '');
        $rang = $dernier === '' ? 0 : (int) substr($dernier, strlen($racine));

        return $racine.str_pad((string) ($rang + 1), 5, '0', STR_PAD_LEFT);
    }

    /**
     * Le manifeste se laisse-t-il encore corriger ?
     *
     * Avant transmission, la correction est libre : le consignataire redépose
     * et refait le circuit, sans formalisme (WF4). Après, plus rien ne bouge
     * de son côté.
     */
    public function modifiable(): bool
    {
        return $this->etat->modifiable();
    }

    /**
     * La pièce probante est-elle au dossier ?
     *
     * Une seule vérité pour les deux modes : le PDF joint en saisie manuelle,
     * le fichier XML déposé en import — l'un et l'autre valent preuve de ce qui
     * a été déclaré, et l'agent CGC rejouera le travail sur la pièce (WF4/WF5).
     * Elle est bloquante à la transmission, dans les deux cas.
     */
    public function pieceProbantePresente(): bool
    {
        return $this->piece_jointe_chemin !== null;
    }

    /**
     * Le manifeste peut-il quitter les mains du consignataire ?
     *
     * Quatre conditions, dont trois lui appartiennent — il est encore en
     * brouillon, sa pièce probante est au dossier, et pas une ligne ne reste à
     * qualifier. La quatrième ne dépend pas de lui : la situation portuaire
     * doit avoir constaté le jalon de son sens (ADR-0009).
     *
     * @return list<string> Les motifs de blocage, dans l'ordre où on les lève.
     *                      Vide quand la transmission est ouverte.
     */
    public function obstaclesALaTransmission(int $aQualifier, int $lignes): array
    {
        $obstacles = [];

        if (! $this->modifiable()) {
            $obstacles[] = __('Ce manifeste a déjà été transmis au CGC.');
        }

        if ($lignes === 0) {
            $obstacles[] = __('Aucune expédition n’est déclarée.');
        }

        if ($aQualifier > 0) {
            $obstacles[] = trans_choice(
                '{1}Une ligne reste à qualifier.|[2,*]:count lignes restent à qualifier.',
                $aQualifier,
                ['count' => $aQualifier],
            );
        }

        if (! $this->pieceProbantePresente()) {
            $obstacles[] = __('Le manifeste PDF justificatif n’est pas joint.');
        }

        if (! $this->escale->verrouOuvert()) {
            $obstacles[] = $this->escale->sens === SensTrafic::Import
                ? __('La situation portuaire n’a pas encore publié l’accostage du navire.')
                : __('La situation portuaire n’a pas encore publié la sortie du navire.');
        }

        return $obstacles;
    }

    /** @return BelongsTo<Escale, $this> */
    public function escale(): BelongsTo
    {
        return $this->belongsTo(Escale::class);
    }

    /** @return BelongsTo<User, $this> */
    public function deposePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'depose_par');
    }

    /** @return HasMany<ManifesteBl, $this> */
    public function bls(): HasMany
    {
        return $this->hasMany(ManifesteBl::class);
    }
}
