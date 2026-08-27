<?php

namespace App\Http\Controllers;

use App\Actions\Liquidation\LiquideLeManifeste;
use App\Actions\Manifeste\ImporteUnManifesteAwmds;
use App\Concerns\GardeLeManifeste;
use App\DataTransferObjects\LigneManifeste;
use App\Enums\EtapeDossier;
use App\Enums\TypeMarchandise;
use App\Http\Requests\Manifeste\QualificationRequest;
use App\Models\BaremeLigne;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Le manifeste d'un dossier d'escale — WF4 pour le consignataire qui le
 * renseigne, WF5 pour le CGC qui le dépouille.
 *
 * Deux visages selon ce que le dossier porte. Sans manifeste, l'écran propose
 * les deux voies de renseignement — import du XML SYDONIA, saisie ligne à
 * ligne. Avec, il déroule le tableau de dépouillement : une ligne par
 * conteneur, plus une par part hors conteneur, chacune qualifiée et chiffrée.
 *
 * Ce qu'il montre, il ne le détient pas : les dates réelles et le poste
 * d'accostage se lisent sur la ligne de situation portuaire à laquelle le
 * dossier a été rapproché (ADR-0009), jamais recopiés.
 *
 * **Le filtrage et la pagination se font en mémoire**, contrairement à la liste
 * des dossiers. Un manifeste est borné — quelques centaines de lignes pour un
 * gros porte-conteneurs — et ses lignes n'existent pas telles quelles en base :
 * elles naissent du dépliage de l'arbre BL → conteneurs. Les paginer en SQL
 * demanderait de matérialiser ce dépliage, donc une deuxième vérité.
 */
class ManifesteEscaleController extends Controller
{
    use GardeLeManifeste;

    /** Le pas de la maquette : 25, 50 ou 100 lignes par page. */
    private const PAS = [25, 50, 100];

    /** La pastille qui ne désigne pas un type, mais ce qui n'en a pas encore. */
    private const A_QUALIFIER = 'a-qualifier';

    public function __construct(private LiquideLeManifeste $liquideLeManifeste) {}

    public function index(Request $request, Escale $escale): Response
    {
        /** @var User $user */
        $user = $request->user();

        // La visibilité du dossier, et l'étape qui doit être la sienne : on
        // n'ouvre pas le manifeste d'un dossier déjà facturé sous couvert
        // d'URL. C'est le même dictionnaire qui a servi à aiguiller ici.
        $this->assureLeDossier($request, $escale);

        $escale->load([
            'consignataire',
            'navire.typeNavire',
            'navire.pays',
            'armement',
            'port',
            'posteQuai',
            'mouvementNavire.posteQuai',
            'manifeste',
        ]);

        return Inertia::render('activite/dossier-manifeste', [
            'dossier' => $this->banniere($escale),
            'circuit' => array_map(
                static fn (EtapeDossier $e): array => [
                    'value' => $e->value,
                    'label' => $e->label(),
                    'rang' => $e->rang(),
                ],
                EtapeDossier::circuit(),
            ),
            // La nomenclature, bornée au sens du dossier ET à ce que le barème
            // sait encore facturer : le bois ne se propose pas à l'import, les
            // autres emballages pas à l'export, et un type dont toutes les
            // lignes sont hors exploitation ne se propose plus du tout.
            'types' => array_map(
                static fn (TypeMarchandise $t): array => [
                    'value' => $t->value,
                    'label' => $t->label(),
                    'conteneur' => $t->estConteneur(),
                ],
                BaremeLigne::typesFacturables($escale->sens),
            ),
            // Le consignataire déclare, le CGC instruit (ADR-0007).
            'peutQualifier' => $user->consignataire_id !== null,
            'manifeste' => $escale->manifeste === null
                ? null
                : $this->tableau($escale->manifeste, $request),
            // Le connaissement ouvert en correction — nul tant qu'on n'en
            // désigne aucun. Le passer en prop plutôt que d'aller le chercher
            // évite un second état à tenir en phase côté écran.
            'connaissement' => $this->connaissementDemande($escale, $request),
        ]);
    }

    /**
     * Qualifier une ligne : dire ce qu'elle est, donc ce qu'elle coûte.
     *
     * L'écriture porte sur le conteneur ou sur le connaissement selon la
     * maille visée, et rien d'autre ne bouge : le montant n'est jamais stocké,
     * il se recalcule à chaque lecture depuis le barème en vigueur. Un tarif
     * corrigé par l'Administrateur se répercute donc seul sur les manifestes
     * encore en brouillon.
     */
    public function qualifier(QualificationRequest $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        // Après transmission, le manifeste n'est plus modifiable (WF4).
        $manifeste = $this->manifesteModifiable($escale);

        [$maille, $id] = explode(':', $request->string('cle')->toString());
        $type = $request->input('type');

        $cible = $maille === 'c'
            ? ManifesteConteneur::query()
                ->whereKey($id)
                ->whereHas('bl', fn ($q) => $q->where('manifeste_id', $manifeste->id))
                ->first()
            : ManifesteBl::query()
                ->whereKey($id)
                ->where('manifeste_id', $manifeste->id)
                ->first();

        // Une ligne d'un autre manifeste n'est pas interdite : elle n'existe
        // pas pour ce dossier.
        abort_if($cible === null, 404);

        $cible->type_marchandise = $type === null ? null : TypeMarchandise::from($type);
        $cible->save();

        return back();
    }

    /**
     * Reprendre le manifeste à zéro (WF4).
     *
     * Avant transmission, la correction est **libre** : le consignataire qui
     * s'est trompé de fichier ou de mode redépose, sans formalisme. Tout part —
     * connaissements, boîtes, pièce probante.
     *
     * Ce que le dossier garde, c'est son **libellé** : le numéro figé au premier
     * rattachement ne bouge plus (ADR-0008). Il a circulé sous ce numéro, et un
     * manifeste redéposé porte de toute façon le même. L'étape ne recule pas
     * non plus : le dossier reste au stade « Manifeste », qui est bien où il en
     * est.
     */
    public function destroy(Request $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        abort_if($request->user()?->consignataire_id === null, 403);

        $manifeste = $this->manifesteModifiable($escale);
        $piece = $manifeste->piece_jointe_chemin;

        DB::transaction(static function () use ($manifeste): void {
            // Les BL emportent leurs boîtes en cascade (contrainte de schéma).
            $manifeste->bls()->delete();
            $manifeste->delete();
        });

        if ($piece !== null) {
            Storage::disk(ImporteUnManifesteAwmds::DISQUE)->delete($piece);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Manifeste retiré — le dossier :numero attend un nouveau dépôt.', [
                'numero' => $escale->libelle(),
            ]),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /**
     * Le tableau de dépouillement : les lignes de la page, et ce que dit le
     * pied de tableau.
     *
     * Les totaux portent sur TOUT le manifeste et non sur la page ni sur le
     * filtrage : ils disent où en est le dossier, pas ce qu'on regarde.
     *
     * @return array<string, mixed>
     */
    private function tableau(Manifeste $manifeste, Request $request): array
    {
        ['lignes' => $lignes, 'totaux' => $totaux] = $this->liquideLeManifeste->handle($manifeste);

        $recherche = trim($request->string('q')->toString());
        $type = $request->string('type')->toString();
        $filtrees = $this->filtrer($lignes, $recherche, $type);

        $parPage = in_array($request->integer('parPage'), self::PAS, strict: true)
            ? $request->integer('parPage')
            : self::PAS[0];

        $pages = max(1, (int) ceil(count($filtrees) / $parPage));
        $page = min(max(1, $request->integer('page', 1)), $pages);

        return [
            'id' => $manifeste->id,
            'numero' => $manifeste->numero,
            'modeSaisie' => $manifeste->mode_saisie->value,
            'modeLabel' => $manifeste->mode_saisie->label(),
            'etat' => $manifeste->etat->value,
            'etatLabel' => $manifeste->etat->label(),
            'modifiable' => $manifeste->modifiable(),
            'pieceJointe' => $manifeste->piece_jointe_nom,
            'pieceJointeOctets' => $manifeste->piece_jointe_octets,
            // La pièce ne se retire qu'en saisie manuelle : en mode XML, elle
            // EST le fichier qui a produit le tableau.
            'pieceRetirable' => $manifeste->mode_saisie->exigeUnePieceJointe(),
            'transmisLe' => $manifeste->transmis_le?->toIso8601String(),
            // Ce qui empêche encore la transmission, dit en clair. Le bouton
            // grisé n'apprend rien ; la liste des motifs, si.
            'obstacles' => $manifeste->obstaclesALaTransmission($totaux->aQualifier, $totaux->lignes),

            'lignes' => array_map(
                fn (LigneManifeste $l): array => $this->ligne($l),
                array_slice($filtrees, ($page - 1) * $parPage, $parPage),
            ),
            'page' => $page,
            'parPage' => $parPage,
            'pas' => self::PAS,
            'total' => count($filtrees),
            'totalLignes' => $totaux->lignes,

            'filtres' => [
                'q' => $recherche,
                'type' => $this->filtreValide($type) ? $type : 'all',
            ],

            'totaux' => [
                'lignes' => $totaux->lignes,
                'bls' => $totaux->bls,
                'conteneurs' => $totaux->conteneurs,
                'poidsKg' => $totaux->poidsKg,
                'volumeM3' => $totaux->volumeM3,
                'montant' => $totaux->montant,
                'qualifiees' => $totaux->qualifiees,
                'aQualifier' => $totaux->aQualifier,
                'transmissible' => $totaux->transmissible(),
            ],
        ];
    }

    /**
     * Les deux filtres de la barre d'outils. La recherche porte sur ce qu'on a
     * sous les yeux quand on cherche une expédition : son connaissement, sa
     * boîte, sa marchandise, et les deux parties du contrat.
     *
     * @param  list<LigneManifeste>  $lignes
     * @return list<LigneManifeste>
     */
    private function filtrer(array $lignes, string $recherche, string $type): array
    {
        $motif = mb_strtolower($recherche);

        return array_values(array_filter($lignes, function (LigneManifeste $l) use ($motif, $type): bool {
            if ($motif !== '') {
                $champs = mb_strtolower(implode(' ', array_filter([
                    $l->bl,
                    $l->conteneur,
                    $l->description,
                    $l->expediteur,
                    $l->destinataire,
                ])));

                if (! str_contains($champs, $motif)) {
                    return false;
                }
            }

            if ($type === self::A_QUALIFIER) {
                return $l->aQualifier();
            }

            return ! $this->filtreValide($type) || $l->type?->value === $type;
        }));
    }

    /** Un filtre inconnu vaut « tout » — une URL bricolée ne casse pas l'écran. */
    private function filtreValide(string $type): bool
    {
        return $type === self::A_QUALIFIER || in_array($type, TypeMarchandise::values(), strict: true);
    }

    /**
     * Une ligne du tableau. Le montant s'accompagne de l'article de barème
     * retenu : quand deux unités s'affrontent, le consignataire doit pouvoir
     * lire laquelle a gagné.
     *
     * @return array<string, mixed>
     */
    private function ligne(LigneManifeste $l): array
    {
        return [
            'cle' => $l->cle,
            'numero' => $l->numero,
            'bl' => $l->bl,
            'blId' => $l->blId,
            'groupage' => $l->groupage,
            'portChargement' => $l->portChargement,
            'portChargementNom' => $l->portChargementNom,
            'portDechargement' => $l->portDechargement,
            'portDechargementNom' => $l->portDechargementNom,
            'expediteur' => $l->expediteur,
            'destinataire' => $l->destinataire,
            'conteneur' => $l->conteneur,
            'taille' => $l->taille,
            'description' => $l->description,
            'poidsKg' => $l->poidsKg,
            'volumeM3' => $l->volumeM3,
            'colis' => $l->colis,
            'type' => $l->type?->value,
            'montant' => $l->liquidation?->montant,
            'reference' => $l->liquidation?->reference,
            'unite' => $l->liquidation?->unite->suffixe(),
        ];
    }

    /**
     * Le connaissement que l'écran ouvre en correction, désigné par `?bl=`.
     *
     * Il rend la maille de SAISIE — le BL et ses boîtes — quand le tableau, lui,
     * montre la maille d'AFFICHAGE, à plat. Les deux ne se confondent pas :
     * poids, volume et colis se corrigent au connaissement, jamais par boîte.
     *
     * @return array<string, mixed>|null
     */
    private function connaissementDemande(Escale $escale, Request $request): ?array
    {
        $id = $request->integer('bl');

        if ($id <= 0 || $escale->manifeste === null) {
            return null;
        }

        $bl = ManifesteBl::query()
            ->with('conteneurs')
            ->whereKey($id)
            ->where('manifeste_id', $escale->manifeste->id)
            ->first();

        if ($bl === null) {
            return null;
        }

        return [
            'id' => $bl->id,
            'reference' => $bl->reference,
            'master_reference' => $bl->master_reference,
            'port_chargement' => $bl->port_chargement,
            'port_chargement_nom' => $bl->port_chargement_nom,
            'port_dechargement' => $bl->port_dechargement,
            'port_dechargement_nom' => $bl->port_dechargement_nom,
            'expediteur' => $bl->expediteur,
            'destinataire' => $bl->destinataire,
            'description' => $bl->description,
            'poids_brut_kg' => $bl->poids_brut_kg,
            'volume_m3' => $bl->volume(),
            'colis' => $bl->colis,
            'hors_conteneur' => $bl->hors_conteneur,
            'conteneurs' => $bl->conteneurs
                ->map(static fn (ManifesteConteneur $c): array => [
                    'reference' => $c->reference,
                    'taille' => $c->taille,
                    'colis' => $c->colis,
                    'tare_kg' => $c->tare_kg,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Le dossier tel que la bannière le lit — à plat, en lecture seule.
     *
     * Les attributs du navire viennent du référentiel, les dates réelles de la
     * situation portuaire : rien de tout cela ne s'édite d'ici.
     *
     * @return array<string, mixed>
     */
    private function banniere(Escale $escale): array
    {
        $ligne = $escale->mouvementNavire;

        return [
            'id' => $escale->id,
            'numero' => $escale->libelle(),
            'provisoire' => $escale->numeroProvisoire(),
            'reference' => $escale->reference,
            'consignataire' => $escale->consignataire->name,
            'navire' => $escale->navire->name,
            'armement' => $escale->armement?->name,
            'pavillon' => $escale->navire->pays?->name,
            'typeCode' => $escale->navire->typeNavire?->code,
            'typeLabel' => $escale->navire->typeNavire?->name,
            'voyage' => $escale->voyage,
            'sens' => $escale->sens->value,
            'sensLabel' => $escale->sens->label(),
            'port' => $escale->port->name,
            'etape' => $escale->etape->value,
            'etapeLabel' => $escale->etape->label(),

            // Ce que le dossier annonce à l'ouverture — la seule date qu'il
            // détienne en propre.
            'etaAnnoncee' => $escale->eta_prevue?->toIso8601String(),
            'posteAnnonce' => $escale->posteQuai?->code,

            // Ce que la situation portuaire constate. Nul tant que le navire
            // n'y est pas annoncé : le dossier s'ouvre souvent avant.
            'rapproche' => ! $escale->enAttenteDeRapprochement(),
            'eta' => $ligne?->eta?->toIso8601String(),
            'etd' => $ligne?->etd?->toIso8601String(),
            'poste' => $ligne?->posteQuai?->code,
            'posteStatut' => $ligne?->statut->label(),

            // Le nombre de boîtes vient du manifeste, et de lui seul.
            'conteneurs' => $escale->manifeste === null
                ? null
                : $escale->manifeste->bls()->join(
                    'manifeste_conteneurs',
                    'manifeste_conteneurs.manifeste_bl_id',
                    '=',
                    'manifeste_bls.id',
                )->distinct()->count('manifeste_conteneurs.reference'),
        ];
    }
}
