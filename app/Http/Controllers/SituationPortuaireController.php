<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Http\Requests\SituationPortuaire\MouvementStoreRequest;
use App\Http\Requests\SituationPortuaire\MouvementUpdateRequest;
use App\Models\Consignataire;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use App\Models\PosteQuai;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * La situation portuaire — mouvements de navires, alimentés depuis la
 * conférence portuaire quotidienne.
 *
 * Trois droits distincts s'y croisent (ADR-0013) : la consulter ouvre l'écran,
 * la renseigner autorise les gestes de saisie, la valider autorise la seule
 * publication. Le Conférencier saisit, le Superviseur publie — un même écran,
 * deux mains.
 *
 * Le consignataire y accède aussi : la situation est la référence qui
 * conditionne la transmission de ses dossiers (ADR-0009), mais il n'y écrit
 * rien.
 */
class SituationPortuaireController extends Controller
{
    public function index(Request $request): Response
    {
        $ports = Port::query()->where('actif', true)->orderBy('name')->get();
        $port = $this->portCourant($ports, $request->string('port')->toString());

        if ($port === null) {
            return Inertia::render('activite/situation-portuaire', [
                'ports' => [],
                'portCourant' => null,
                'mouvements' => [],
                'postes' => [],
                'navires' => [],
                'consignataires' => [],
                'statuts' => $this->statuts(),
                'sens' => $this->sens(),
                'droits' => $this->droits($request),
                'publication' => ['publieeLe' => null, 'brouillons' => 0, 'incoherentes' => 0],
            ]);
        }

        $mouvements = MouvementNavire::query()
            ->with(['navire.typeNavire', 'navire.pays', 'navire.armement', 'posteQuai', 'consignataire'])
            ->where('port_id', $port->id)
            ->get()
            ->sortBy(MouvementNavire::ordreDeLaSituation())
            ->values();

        return Inertia::render('activite/situation-portuaire', [
            'ports' => $ports->map(fn (Port $p): array => [
                'id' => $p->id,
                'code' => $p->code,
                'label' => $p->name,
            ])->all(),
            'portCourant' => ['id' => $port->id, 'code' => $port->code, 'label' => $port->name],
            'mouvements' => $mouvements->map(fn (MouvementNavire $m): array => $this->ligne($m))->all(),
            'postes' => PosteQuai::query()
                ->where('port_id', $port->id)
                ->where('actif', true)
                ->orderBy('code')
                ->get()
                ->map(fn (PosteQuai $p): array => ['id' => $p->id, 'code' => $p->code])
                ->all(),
            // Le référentiel alimente le menu du panneau d'ajout : on n'inscrit
            // à la situation qu'un navire que le CGC connaît déjà.
            'navires' => Navire::query()
                ->with(['typeNavire', 'pays', 'armement'])
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Navire $n): array => [
                    'id' => $n->id,
                    'name' => $n->name,
                    'typeCode' => $n->typeNavire?->code,
                    'typeLabel' => $n->typeNavire?->name,
                    'pavillon' => $n->pays?->name,
                    'armateur' => $n->armement?->name,
                ])
                ->all(),
            'consignataires' => Consignataire::query()
                ->where('actif', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Consignataire $c): array => ['id' => $c->id, 'name' => $c->name])
                ->all(),
            'statuts' => $this->statuts(),
            'sens' => $this->sens(),
            'droits' => $this->droits($request),
            'publication' => $this->publication($mouvements),
        ]);
    }

    public function store(MouvementStoreRequest $request): RedirectResponse
    {
        $mouvement = MouvementNavire::create($request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Navire :navire ajouté à la situation — à publier.', [
                'navire' => $mouvement->navire->name,
            ]),
        ]);

        return $this->retour($mouvement->port_id);
    }

    /**
     * Toute écriture ramène la ligne au brouillon : une correction n'atteint le
     * dehors — ni le verrou de transmission — qu'une fois republiée (ADR-0013).
     */
    public function update(MouvementUpdateRequest $request, MouvementNavire $mouvement): RedirectResponse
    {
        $mouvement->fill($request->validated());

        // Hors `fill()` à dessein : l'état de publication n'est pas assignable
        // en masse, sinon un champ glissé dans la requête publierait une ligne
        // sans passer par la validation hiérarchique (ADR-0013).
        $mouvement->publiee_at = null;
        $mouvement->publiee_par = null;
        $mouvement->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Ligne :navire mise à jour — à publier.', [
                'navire' => $mouvement->navire->name,
            ]),
        ]);

        return $this->retour($mouvement->port_id);
    }

    /**
     * La validation hiérarchique d'ADR-0013 : un supérieur relit la saisie du
     * conférencier et la publie. C'est ce geste, et lui seul, qui ouvre les
     * verrous de transmission et autorise la diffusion aux partenaires.
     *
     * Il est refusé tant qu'une ligne du port porte un statut sans la date qui
     * l'accompagne : publier une escale à quai sans date d'accostage laisserait
     * ses dossiers import bloqués sans que personne ne comprenne pourquoi.
     */
    public function publier(Request $request, Port $port): RedirectResponse
    {
        $mouvements = MouvementNavire::query()->with('navire')->where('port_id', $port->id)->get();
        $incoherentes = $mouvements->reject(fn (MouvementNavire $m): bool => $m->estCoherente());

        if ($incoherentes->isNotEmpty()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => __('Publication bloquée — :nombre navire(s) au statut incohérent avec les dates : :navires', [
                    'nombre' => $incoherentes->count(),
                    'navires' => $incoherentes->map(fn (MouvementNavire $m): string => $m->navire->name)->implode(', '),
                ]),
            ]);

            return $this->retour($port->id);
        }

        $brouillons = $mouvements->filter(fn (MouvementNavire $m): bool => $m->publiee_at === null);

        if ($brouillons->isEmpty()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Aucune modification à publier.')]);

            return $this->retour($port->id);
        }

        MouvementNavire::query()
            ->whereKey($brouillons->modelKeys())
            ->update(['publiee_at' => now(), 'publiee_par' => $request->user()?->id]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Situation de :port publiée — :nombre ligne(s) diffusée(s).', [
                'port' => $port->name,
                'nombre' => $brouillons->count(),
            ]),
        ]);

        return $this->retour($port->id);
    }

    /**
     * Le port demandé, à défaut le premier de la liste. On accepte le code
     * (`?port=GAOWE`) : il est stable et lisible, là où un identifiant ne dit
     * rien à qui partage l'URL.
     *
     * @param  Collection<int, Port>  $ports
     */
    private function portCourant(Collection $ports, string $code): ?Port
    {
        if ($code !== '') {
            $demande = $ports->firstWhere('code', $code);

            if ($demande !== null) {
                return $demande;
            }
        }

        return $ports->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function ligne(MouvementNavire $mouvement): array
    {
        $navire = $mouvement->navire;

        return [
            'id' => $mouvement->id,
            'navireId' => $mouvement->navire_id,
            'navire' => $navire->name,
            // Type, pavillon et armateur sont facultatifs sur la fiche navire.
            'typeCode' => $navire->typeNavire?->code,
            'typeLabel' => $navire->typeNavire?->name,
            'pavillon' => $navire->pays?->name,
            'armateur' => $navire->armement?->name,
            'voyage' => $mouvement->voyage,
            'sens' => $mouvement->sens->value,
            'statut' => $mouvement->statut->value,
            'posteQuaiId' => $mouvement->poste_quai_id,
            'poste' => $mouvement->posteQuai?->code,
            // Dates réelles d'accostage et de départ, au format du champ
            // `datetime-local` : l'écran édite ce qu'il affiche.
            'eta' => $mouvement->eta?->format('Y-m-d\TH:i'),
            'etd' => $mouvement->etd?->format('Y-m-d\TH:i'),
            'consignataireId' => $mouvement->consignataire_id,
            'consignataire' => $mouvement->consignataire?->name,
            'publiee' => $mouvement->publiee_at !== null,
            'coherente' => $mouvement->estCoherente(),
        ];
    }

    /**
     * L'état de publication du port, tel que la pastille d'en-tête le dit.
     *
     * @param  Collection<int, MouvementNavire>  $mouvements
     * @return array{publieeLe: string|null, brouillons: int, incoherentes: int}
     */
    private function publication(Collection $mouvements): array
    {
        $derniere = $mouvements->filter(fn (MouvementNavire $m): bool => $m->publiee_at !== null)
            ->max('publiee_at');

        return [
            'publieeLe' => $derniere?->toIso8601String(),
            'brouillons' => $mouvements->filter(fn (MouvementNavire $m): bool => $m->publiee_at === null)->count(),
            'incoherentes' => $mouvements->reject(fn (MouvementNavire $m): bool => $m->estCoherente())->count(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string, abrege: string}>
     */
    private function statuts(): array
    {
        return array_map(static fn (StatutNavire $s): array => [
            'value' => $s->value,
            'label' => $s->label(),
            'abrege' => $s->abrege(),
        ], StatutNavire::cases());
    }

    /**
     * L'import d'abord, à rebours de l'enum : le barème range l'export en tête
     * parce que son document officiel le fait, mais la conférence portuaire
     * parle d'abord des navires qui arrivent — et c'est le sens proposé par
     * défaut à la saisie.
     *
     * @return array<int, array{value: string, label: string, jalon: string}>
     */
    private function sens(): array
    {
        return array_map(static fn (SensTrafic $s): array => [
            'value' => $s->value,
            'label' => $s->label(),
            // Le jalon qui ouvre le verrou pour ce sens : la frise l'y marque
            // d'une pastille verte (ADR-0009).
            'jalon' => StatutNavire::jalonDeVerrou($s)->value,
        ], [SensTrafic::Import, SensTrafic::Export]);
    }

    /**
     * @return array{renseigner: bool, valider: bool}
     */
    private function droits(Request $request): array
    {
        $user = $request->user();

        return [
            'renseigner' => $user?->can(Permission::SituationPortuaireRenseigner->value) ?? false,
            'valider' => $user?->can(Permission::SituationPortuaireValider->value) ?? false,
        ];
    }

    /** Le retour reste sur le port qu'on regardait. */
    private function retour(int $portId): RedirectResponse
    {
        return to_route('situation-portuaire', ['port' => Port::find($portId)?->code]);
    }
}
