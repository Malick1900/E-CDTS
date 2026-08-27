<?php

namespace App\Http\Controllers;

use App\Actions\Manifeste\ImporteUnManifesteAwmds;
use App\Concerns\GardeLeManifeste;
use App\Http\Requests\Manifeste\PieceProbanteRequest;
use App\Models\Escale;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * La pièce probante d'un manifeste (WF4/WF5).
 *
 * Un seul fichier par manifeste, multi-pages : le PDF recopié en saisie
 * manuelle, ou le XML déposé à l'import. L'un et l'autre valent **preuve de ce
 * qui a été déclaré** — l'agent CGC les télécharge et rejoue le dépouillement
 * ligne par ligne pour vérifier la conformité de la saisie à la pièce.
 *
 * Le téléchargement est ouvert aux deux côtés : le consignataire vérifie ce
 * qu'il a joint, le CGC contrôle sur pièce. Le dépôt et le retrait, eux,
 * appartiennent au seul consignataire, et seulement avant transmission.
 *
 * Le fichier vit sur le disque privé : servi par cette route et par elle seule,
 * jamais par une URL publique devinable.
 */
class ManifestePieceController extends Controller
{
    use GardeLeManifeste;

    /** Déposer — ou remplacer — la pièce probante. */
    public function store(PieceProbanteRequest $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        $manifeste = $this->manifesteModifiable($escale);

        /** @var User $user */
        $user = $request->user();
        $fichier = $request->file('fichier');
        $chemin = $fichier->store('manifestes/'.$escale->id, ImporteUnManifesteAwmds::DISQUE);

        // La pièce précédente ne sert plus à rien : une seule fait foi.
        $ancienne = $manifeste->piece_jointe_chemin;

        $manifeste->update([
            'piece_jointe_chemin' => $chemin === false ? null : $chemin,
            'piece_jointe_nom' => $fichier->getClientOriginalName(),
            'piece_jointe_octets' => $fichier->getSize(),
            'depose_par' => $user->id,
        ]);

        if ($ancienne !== null && $chemin !== false) {
            Storage::disk(ImporteUnManifesteAwmds::DISQUE)->delete($ancienne);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Manifeste justificatif joint au dossier.'),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /**
     * Consulter la pièce.
     *
     * Le nom d'origine est rendu au téléchargement : l'agent CGC classe des
     * pièces, il n'a pas à recevoir un chemin de stockage pour nom de fichier.
     */
    public function show(Request $request, Escale $escale): StreamedResponse
    {
        $this->assureLeDossier($request, $escale);

        /** @var User $user */
        $user = $request->user();
        abort_unless($escale->estVisiblePar($user), 404);

        $manifeste = $escale->manifeste;

        abort_if($manifeste?->piece_jointe_chemin === null, 404);

        $disque = Storage::disk(ImporteUnManifesteAwmds::DISQUE);

        abort_unless($disque->exists($manifeste->piece_jointe_chemin), 404);

        return $disque->download(
            $manifeste->piece_jointe_chemin,
            // Le manifeste n'a pas toujours de numéro : en saisie manuelle il
            // ne l'obtient qu'à la transmission (ADR-0046).
            $manifeste->piece_jointe_nom ?? $escale->libelle(),
        );
    }

    /**
     * Retirer la pièce.
     *
     * Elle n'est retirable qu'en saisie manuelle : en mode XML, la pièce EST le
     * fichier qui a produit le tableau — la retirer laisserait un manifeste
     * déplié sans rien qui l'atteste. Le consignataire qui s'est trompé de
     * fichier reprend son manifeste à zéro.
     */
    public function destroy(Request $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        $manifeste = $this->manifesteModifiable($escale);

        abort_unless($manifeste->mode_saisie->exigeUnePieceJointe(), 403);
        abort_if($manifeste->piece_jointe_chemin === null, 404);

        Storage::disk(ImporteUnManifesteAwmds::DISQUE)->delete($manifeste->piece_jointe_chemin);

        $manifeste->update([
            'piece_jointe_chemin' => null,
            'piece_jointe_nom' => null,
            'piece_jointe_octets' => null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Manifeste justificatif retiré.'),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }
}
