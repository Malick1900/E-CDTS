<?php

namespace App\Http\Controllers;

use App\Enums\EtapeDossier;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Http\Requests\DossierEscale\EscaleStoreRequest;
use App\Models\Armement;
use App\Models\Escale;
use App\Models\Navire;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Les dossiers d'escale — l'écran d'accueil du module.
 *
 * Il ne fait rien d'autre que montrer : la liste des dossiers du périmètre du
 * compte, l'état vide quand il n'y en a pas, et le bouton qui mène à
 * l'ouverture. Le circuit lui-même (manifeste, dépouillement, devis) vit
 * ailleurs, écran par écran.
 *
 * Le périmètre n'est pas une affaire de front : un compte client ne voit que
 * les dossiers de sa société, un interne CGC les voit tous, et c'est la requête
 * qui le décide (`Escale::scopeVisiblePar`).
 *
 * Filtrage et pagination côté serveur, contrairement aux tableaux
 * d'administration : un référentiel est borné, les escales non — plus de 200
 * par mois (ADR-0005). Envoyer la liste entière au navigateur marcherait le
 * premier mois et deviendrait intenable le troisième.
 */
class DossierEscaleController extends Controller
{
    /** Assez pour remplir l'écran sans le faire défiler à l'infini. */
    private const PAR_PAGE = 15;

    /**
     * La pastille « En cours » n'est pas une étape : elle regroupe les trois
     * moments où le dossier circule entre le consignataire et le CGC.
     */
    private const EN_COURS = 'en-cours';

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $recherche = trim($request->string('q')->toString());
        $sens = $request->string('sens')->toString();
        $etape = $request->string('etape')->toString();
        $port = $request->integer('port');

        $dossiers = $this->filtrer(
            Escale::query()->visiblePar($user),
            $recherche,
            $sens,
            $etape,
            $port,
        )
            ->with(['navire', 'consignataire', 'port', 'posteQuai'])
            ->orderByDesc('ouvert_le')
            ->orderByDesc('id')
            ->paginate(self::PAR_PAGE)
            ->withQueryString();

        return Inertia::render('activite/dossiers', [
            'dossiers' => $dossiers->through(fn (Escale $e): array => $this->ligne($e))->items(),
            'page' => $dossiers->currentPage(),
            'parPage' => self::PAR_PAGE,
            'total' => $dossiers->total(),
            'filtres' => [
                'q' => $recherche,
                'sens' => in_array($sens, SensTrafic::values(), strict: true) ? $sens : 'all',
                'etape' => $this->etapesDuFiltre($etape) === null ? 'all' : $etape,
                'port' => $port > 0 ? $port : null,
            ],
            'resume' => $this->resume($user),
            'liquide' => $this->liquide($user, $recherche, $sens, $etape, $port),
            'etapes' => array_map(
                static fn (EtapeDossier $e): array => [
                    'value' => $e->value,
                    'label' => $e->label(),
                    'rang' => $e->rang(),
                ],
                EtapeDossier::cases(),
            ),
            'sens' => array_map(
                static fn (SensTrafic $s): array => ['value' => $s->value, 'label' => $s->label()],
                SensTrafic::cases(),
            ),
            'ports' => Port::query()
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Port $p): array => ['id' => $p->id, 'label' => $p->name])
                ->all(),
            // Ouvrir un dossier est le geste du consignataire (WF3) : c'est lui
            // qui détient le n° de voyage et qui déclarera. Un interne CGC
            // instruit les dossiers, il ne les ouvre pas.
            'peutOuvrir' => $user->consignataire_id !== null,
            // Ce que dit le pied de tableau : de quel périmètre on parle.
            'perimetre' => $user->consignataire_id === null
                ? 'tous consignataires'
                : $user->consignataire->name,
        ]);
    }

    /**
     * L'aiguillage — cliquer un dossier, c'est arriver là où il en est.
     *
     * L'écran d'accueil ne connaît aucun écran de traitement : il envoie ici,
     * et c'est l'étape qui décide (`EtapeDossier::ecran`). Une étape dont
     * l'écran n'est pas encore ouvert ramène à la liste en disant où en est le
     * dossier — mieux qu'une page blanche.
     *
     * Le périmètre s'applique ici comme partout : un dossier d'une autre
     * société n'est pas interdit, il n'existe pas.
     */
    public function show(Request $request, Escale $escale): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($escale->estVisiblePar($user), 404);

        $ecran = $escale->etape->ecran();

        if ($ecran === null) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => __("Dossier :numero — l'écran de l'étape « :etape » n'est pas encore ouvert.", [
                    'numero' => $escale->libelle(),
                    'etape' => $escale->etape->label(),
                ]),
            ]);

            return redirect()->route('dossiers');
        }

        return redirect()->route($ecran, $escale);
    }

    /**
     * L'écran d'ouverture (WF3) — et, une fois le dossier ouvert, la
     * confirmation de ce qui vient d'être créé.
     *
     * Un seul écran pour les deux moments, comme la maquette : le dossier
     * ouvert reste sous les yeux de celui qui vient de l'ouvrir, avec son
     * numéro provisoire et le jalon qu'il a franchi. Passer par l'URL le rend
     * rechargeable — et le périmètre du compte s'y applique comme partout.
     */
    public function create(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        // Ouvrir suppose une société au nom de laquelle déclarer : un interne
        // CGC n'aurait personne à qui attribuer le dossier (WF3).
        abort_if($user->consignataire_id === null, 403);

        $ouvert = $request->integer('ouvert');

        $escale = $ouvert > 0
            ? Escale::query()
                ->visiblePar($user)
                ->with(['navire.typeNavire', 'navire.pays', 'armement', 'port', 'posteQuai'])
                ->find($ouvert)
            : null;

        return Inertia::render('activite/dossier-nouveau', [
            'consignataire' => $user->consignataire->name,
            'navires' => Navire::query()
                ->with(['typeNavire', 'pays', 'armement'])
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Navire $n): array => [
                    'id' => $n->id,
                    'name' => $n->name,
                    'imo' => $n->imo,
                    'pavillon' => $n->pays?->name,
                    'typeCode' => $n->typeNavire?->code,
                    'typeLabel' => $n->typeNavire?->name,
                    'armementId' => $n->armement_id,
                    'armement' => $n->armement?->name,
                    // Le mode que le dossier PORTERA : à défaut, ligne
                    // régulière. L'écran ne montre pas un vide là où l'escale
                    // naîtra avec une valeur (CGC, 2026-08-27).
                    'modeExploitation' => ($n->mode_exploitation_defaut
                        ?? ModeExploitation::LigneReguliere)->label(),
                ])
                ->all(),
            'armements' => Armement::query()
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Armement $a): array => ['id' => $a->id, 'label' => $a->name])
                ->all(),
            // Les postes voyagent avec leur port : le menu du second se borne au
            // choix du premier, sans aller-retour serveur.
            'ports' => Port::query()
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Port $p): array => [
                    'id' => $p->id,
                    'label' => $p->name,
                    'postes' => PosteQuai::query()
                        ->where('port_id', $p->id)
                        ->where('actif', true)
                        ->orderBy('code')
                        ->get()
                        ->map(fn (PosteQuai $q): array => ['id' => $q->id, 'code' => $q->code])
                        ->all(),
                ])
                ->all(),
            'sens' => array_map(
                static fn (SensTrafic $s): array => ['value' => $s->value, 'label' => $s->label()],
                SensTrafic::cases(),
            ),
            'circuit' => array_map(
                static fn (EtapeDossier $e): array => [
                    'value' => $e->value,
                    'label' => $e->label(),
                    'rang' => $e->rang(),
                ],
                EtapeDossier::circuit(),
            ),
            'ouvert' => $escale === null ? null : $this->confirmation($escale),
        ]);
    }

    /**
     * L'ouverture proprement dite. Le dossier naît « ouvert », avec sa
     * référence stable et sans numéro affiché : le n° de manifeste n'existe pas
     * encore, et c'est lui qui figera le libellé (ADR-0008).
     */
    public function store(EscaleStoreRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $port = Port::query()->whereKey($request->integer('port_id'))->firstOrFail();
        $navire = Navire::query()->whereKey($request->integer('navire_id'))->firstOrFail();

        $escale = new Escale($request->validated());
        $escale->consignataire_id = $user->consignataire_id;
        $escale->ouvert_par = $user->id;
        $escale->etape = EtapeDossier::Ouvert;
        $escale->ouvert_le = now();
        $escale->reference = Escale::referenceSuivante($port);

        // Le mode d'exploitation se recopie du navire tout seul, au crochet
        // `creating` du modèle : cet écran n'est pas la seule porte par où une
        // escale peut naître.

        // L'armement suit le navire par défaut — le consignataire peut en
        // désigner un autre pour ce passage.
        $escale->armement_id ??= $navire->armement_id;

        $escale->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Dossier :reference ouvert — son numéro deviendra celui du manifeste.', [
                'reference' => $escale->reference,
            ]),
        ]);

        return redirect()->route('dossiers.nouveau', ['ouvert' => $escale->id]);
    }

    /**
     * Le dossier qui vient d'être ouvert, tel que l'écran de confirmation le
     * montre. Les attributs du navire y sont aplatis : ils viennent du
     * référentiel et ne s'éditent pas d'ici.
     *
     * @return array<string, mixed>
     */
    private function confirmation(Escale $escale): array
    {
        return [
            'id' => $escale->id,
            'reference' => $escale->reference,
            'numero' => $escale->libelle(),
            'provisoire' => $escale->numeroProvisoire(),
            'consignataire' => $escale->consignataire->name,
            'navire' => $escale->navire->name,
            'pavillon' => $escale->navire->pays?->name,
            'typeCode' => $escale->navire->typeNavire?->code,
            'typeLabel' => $escale->navire->typeNavire?->name,
            'armement' => $escale->armement?->name,
            'voyage' => $escale->voyage,
            'sens' => $escale->sens->value,
            'sensLabel' => $escale->sens->label(),
            'port' => $escale->port->name,
            'poste' => $escale->posteQuai?->code,
            'etaPrevue' => $escale->eta_prevue?->toIso8601String(),
            'ouvertLe' => $escale->ouvert_le->toIso8601String(),
            'etape' => $escale->etape->value,
        ];
    }

    /**
     * Les quatre filtres de la barre d'outils. La recherche porte sur ce qu'on
     * a sous les yeux quand on cherche un dossier : son numéro, le navire, le
     * voyage — et sur la référence interne, que l'audit cite.
     *
     * @param  Builder<Escale>  $query
     * @return Builder<Escale>
     */
    private function filtrer(
        Builder $query,
        string $recherche,
        string $sens,
        string $etape,
        int $port,
    ): Builder {
        return $query
            ->when($recherche !== '', function (Builder $q) use ($recherche): void {
                $motif = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_strtoupper($recherche)).'%';

                $q->where(function (Builder $ou) use ($motif, $recherche): void {
                    $ou->whereRaw('UPPER(reference) LIKE ?', [$motif])
                        ->orWhereRaw('UPPER(numero_affiche) LIKE ?', [$motif])
                        ->orWhere('voyage_normalise', 'like', '%'.Escale::normaliserVoyage($recherche).'%')
                        ->orWhereHas('navire', function (Builder $n) use ($motif): void {
                            $n->whereRaw('UPPER(name) LIKE ?', [$motif]);
                        });
                });
            })
            ->when(
                in_array($sens, SensTrafic::values(), strict: true),
                fn (Builder $q): Builder => $q->where('sens', $sens),
            )
            ->when(
                $this->etapesDuFiltre($etape) !== null,
                fn (Builder $q): Builder => $q->whereIn('etape', (array) $this->etapesDuFiltre($etape)),
            )
            ->when($port > 0, fn (Builder $q): Builder => $q->where('port_id', $port));
    }

    /**
     * Les étapes que désigne le filtre — null quand il ne filtre rien. Une
     * valeur inconnue vaut « tout » plutôt qu'une erreur : un filtre est une
     * commodité de lecture, pas une écriture, et une URL bricolée ne doit pas
     * casser l'écran.
     *
     * @return list<string>|null
     */
    private function etapesDuFiltre(string $etape): ?array
    {
        if ($etape === self::EN_COURS) {
            return [
                EtapeDossier::Manifeste->value,
                EtapeDossier::Depouillement->value,
                EtapeDossier::Devis->value,
            ];
        }

        return in_array($etape, EtapeDossier::values(), strict: true) ? [$etape] : null;
    }

    /**
     * Une ligne du tableau. Le navire, le port et le poste sont aplatis pour
     * l'affichage : ils restent la propriété de leurs référentiels.
     *
     * @return array<string, mixed>
     */
    private function ligne(Escale $escale): array
    {
        return [
            'id' => $escale->id,
            'numero' => $escale->libelle(),
            'provisoire' => $escale->numeroProvisoire(),
            'navire' => $escale->navire->name,
            'voyage' => $escale->voyage,
            'sens' => $escale->sens->value,
            'consignataire' => $escale->consignataire->name,
            'port' => $escale->port->name,
            'poste' => $escale->posteQuai?->code,
            'etape' => $escale->etape->value,
            'ouvertLe' => $escale->ouvert_le->toIso8601String(),
            'montant' => $escale->montant_liquide,
            // Le tableau n'ouvre que ce qui a un écran : une ligne dont
            // l'étape n'en a pas encore reste inerte plutôt que de promettre
            // un clic qui retomberait ici.
            'ouvrable' => $escale->etape->ecran() !== null,
        ];
    }

    /**
     * Les compteurs des pastilles, calculés sur TOUT le périmètre et non sur la
     * page affichée : elles servent à naviguer entre les grandes phases, pas à
     * décrire ce qu'on voit.
     *
     * @return array<string, int>
     */
    private function resume(User $user): array
    {
        /** @var array<string, int> $parEtape */
        $parEtape = Escale::query()
            ->visiblePar($user)
            ->selectRaw('etape, count(*) as total')
            ->groupBy('etape')
            ->pluck('total', 'etape')
            ->all();

        $compte = static fn (EtapeDossier ...$etapes): int => array_sum(
            array_map(static fn (EtapeDossier $e): int => $parEtape[$e->value] ?? 0, $etapes)
        );

        return [
            'tous' => array_sum($parEtape),
            'ouverts' => $compte(EtapeDossier::Ouvert),
            'enCours' => $compte(EtapeDossier::Manifeste, EtapeDossier::Depouillement, EtapeDossier::Devis),
            'clotures' => $compte(EtapeDossier::Cloture),
        ];
    }

    /**
     * La CDTS liquidée du pied de tableau : la somme des montants des dossiers
     * facturés et clôturés du filtrage courant. Un devis émis ne compte pas —
     * son montant peut encore bouger.
     */
    private function liquide(
        User $user,
        string $recherche,
        string $sens,
        string $etape,
        int $port,
    ): int {
        return (int) $this->filtrer(
            Escale::query()->visiblePar($user),
            $recherche,
            $sens,
            $etape,
            $port,
        )
            ->whereIn('etape', [EtapeDossier::Facture->value, EtapeDossier::Cloture->value])
            ->sum('montant_liquide');
    }
}
