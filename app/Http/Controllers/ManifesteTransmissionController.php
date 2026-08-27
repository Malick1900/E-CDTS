<?php

namespace App\Http\Controllers;

use App\Actions\Liquidation\LiquideLeManifeste;
use App\Concerns\GardeLeManifeste;
use App\Enums\EtapeDossier;
use App\Enums\EtatManifeste;
use App\Models\Escale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * La transmission du manifeste au CGC — la fin de WF4, le début de WF5.
 *
 * Le geste est **sans retour** : passé là, le manifeste n'est plus modifiable
 * par le consignataire, et le dossier entre en dépouillement. Sa déclaration
 * vaut PV provisoire, que le CGC validera ou réfutera (ADR-0007).
 *
 * C'est aussi le moment où une **saisie manuelle reçoit son numéro** : elle est
 * close, donc acquise, et le dossier cesse d'être provisoire (ADR-0046). Un
 * manifeste importé, lui, a été numéroté à son dépôt — l'appel est sans effet.
 *
 * Quatre verrous, dont trois appartiennent au consignataire — le manifeste est
 * en brouillon, il porte des lignes, toutes sont qualifiées, sa pièce probante
 * est jointe. Le quatrième ne dépend pas de lui : **la situation portuaire doit
 * avoir constaté le jalon de son sens** (import → à quai, export → sorti) sur
 * une ligne PUBLIÉE (ADR-0009/0013). Un dossier qui n'est pas encore rapproché
 * ne transmet rien.
 *
 * Le contrôle est ici et pas seulement à l'écran : le bouton grisé est une
 * courtoisie, la garde est ce qui tient.
 *
 * @see docs/WORKFLOWS-METIER.md WF4, WF5
 */
class ManifesteTransmissionController extends Controller
{
    use GardeLeManifeste;

    public function __construct(private LiquideLeManifeste $liquideLeManifeste) {}

    public function store(Request $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);

        // Le consignataire transmet ; l'interne CGC instruit ensuite (ADR-0007).
        abort_if($request->user()?->consignataire_id === null, 403);

        $manifeste = $this->manifesteModifiable($escale);
        $escale->load('mouvementNavire');

        ['totaux' => $totaux] = $this->liquideLeManifeste->handle($manifeste);
        $obstacles = $manifeste->obstaclesALaTransmission($totaux->aQualifier, $totaux->lignes);

        if ($obstacles !== []) {
            throw ValidationException::withMessages(['transmission' => $obstacles]);
        }

        DB::transaction(function () use ($manifeste, $escale): void {
            // Une saisie manuelle transmise est une saisie close : c'est ici
            // qu'elle reçoit son numéro et que le dossier cesse d'être
            // provisoire (ADR-0046). Sans effet sur un manifeste importé, qui
            // a été numéroté à son dépôt.
            $manifeste->numeroter();

            $manifeste->update([
                'etat' => EtatManifeste::Transmis,
                'transmis_le' => now(),
            ]);

            $escale->etape = EtapeDossier::Depouillement;
            $escale->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Manifeste :numero transmis au CGC — le dossier passe en dépouillement.', [
                'numero' => $manifeste->numero,
            ]),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }
}
