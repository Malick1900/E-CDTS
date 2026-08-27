<?php

namespace App\Http\Controllers;

use App\Actions\Manifeste\ImporteUnManifesteAwmds;
use App\Actions\Manifeste\LitUnManifesteAwmds;
use App\Concerns\GardeLeManifeste;
use App\Http\Requests\Manifeste\ImportXmlRequest;
use App\Models\Escale;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * L'import d'un manifeste XML AWMDS — la voie normale du renseignement (WF4).
 *
 * Tout le travail est dans l'action ; le contrôleur ne fait que garder la porte
 * et rendre compte. Ce qui remonte en compte, ce sont deux choses distinctes :
 * ce qui a **refusé** le fichier (une exception de validation, portée sur le
 * champ du fichier) et ce qui a été **relevé sans refuser** — un écart de masse
 * au-delà de la tolérance, des totaux de contrôle absents. Le second cas ne
 * bloque rien mais doit se voir : un manifeste accepté n'est pas un manifeste
 * silencieusement approuvé.
 */
class ManifesteImportController extends Controller
{
    use GardeLeManifeste;

    public function __construct(
        private ImporteUnManifesteAwmds $importe,
        private LitUnManifesteAwmds $lit,
    ) {}

    /**
     * L'aperçu du fichier — ce qu'il annonce, avant toute écriture.
     *
     * Le manifeste est lu, contrôlé et résumé, mais **rien n'est stocké ni
     * enregistré** : le navigateur garde le fichier et le redéposera si le
     * consignataire confirme. Un second envoi de quelques centaines de
     * kilo-octets coûte moins qu'une zone d'attente à purger, et un aperçu
     * abandonné ne laisse rien traîner sur le disque.
     *
     * L'aperçu **n'assouplit aucun contrôle, il les avance** : un fichier qui
     * ne convient pas au dossier lève ici comme il lèverait à l'import, et le
     * refus s'affiche à la place du résumé. Ce qui n'est que réserve — un
     * pavillon qui dément le référentiel, une masse qui ne retombe pas —
     * s'affiche AVEC le résumé, sans fermer la porte.
     */
    public function apercu(ImportXmlRequest $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        $this->assureAucunManifeste($escale);

        $fichier = $request->file('fichier');
        $lu = $this->lit->handle((string) $fichier?->get(), $escale);
        $enTete = $lu->enTete;

        Inertia::flash('apercuManifeste', [
            'fichier' => [
                'nom' => $fichier?->getClientOriginalName(),
                'octets' => $fichier?->getSize(),
            ],
            // Le segment général, tel quel. Un champ que le profil ne
            // renseigne pas reste nul et s'affichera « non renseigné » — le
            // dire est une information, le combler serait une invention.
            'enTete' => [
                'bureau' => $enTete->bureau,
                'voyage' => $enTete->voyage,
                'navire' => $enTete->navire,
                'pavillon' => $enTete->pavillon,
                'immatriculation' => $enTete->immatriculation,
                'transporteur' => $enTete->transporteur,
                'agent' => $enTete->agent,
                'dateDepart' => $enTete->dateDepart,
                'dateArrivee' => $enTete->dateArrivee,
                'portDepart' => $enTete->portDepart,
                'portDestination' => $enTete->portDestination,
            ],
            // Ce que le fichier annonce sur lui-même, et ce qu'il contient
            // vraiment. Les deux se lisent côte à côte : c'est leur écart qui
            // renseigne, pas l'un des deux pris seul.
            'annonces' => $enTete->totauxPresents ? [
                'bls' => $enTete->blsAnnonces,
                'colis' => $enTete->colisAnnonces,
                'conteneurs' => $enTete->conteneursAnnonces,
                'masseKg' => $enTete->masseAnnonceeKg,
            ] : null,
            'contenu' => [
                'bls' => count($lu->bls),
                'conteneurs' => $lu->conteneurs(),
                'poidsKg' => $lu->poidsBrutKg(),
                'volumeM3' => round($lu->volumeM3(), 2),
                'aQualifier' => $lu->aQualifier(),
            ],
            'reserves' => $lu->anomalies,
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    public function store(ImportXmlRequest $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        $this->assureAucunManifeste($escale);

        /** @var User $user */
        $user = $request->user();

        ['manifeste' => $manifeste, 'anomalies' => $anomalies] = $this->importe->handle(
            $escale,
            $request->file('fichier'),
            $user,
        );

        $lignes = $manifeste->bls()->count();

        Inertia::flash('toast', $anomalies === []
            ? [
                'type' => 'success',
                'message' => trans_choice(
                    '{1}Manifeste :numero importé — 1 connaissement déplié.|[2,*]Manifeste :numero importé — :count connaissements dépliés.',
                    $lignes,
                    ['numero' => $manifeste->numero, 'count' => $lignes],
                ),
            ]
            : [
                'type' => 'warning',
                'message' => __('Manifeste :numero importé, avec réserve. :anomalies', [
                    'numero' => $manifeste->numero,
                    'anomalies' => implode(' ', $anomalies),
                ]),
            ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }
}
