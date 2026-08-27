<?php

namespace App\Http\Controllers;

use App\Concerns\GardeLeManifeste;
use App\Enums\ModeSaisieManifeste;
use App\Enums\TypeMarchandise;
use App\Http\Requests\Manifeste\ConnaissementRequest;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * La saisie manuelle du manifeste — le filet de WF4.
 *
 * Le consignataire dont le transporteur n'émet pas de XML remplit lui-même le
 * tableau, connaissement par connaissement, d'après son manifeste papier. C'est
 * le **même écran de travail** que l'import : deux façons de l'alimenter, un
 * seul tableau de dépouillement à l'arrivée.
 *
 * **La saisie se fait au connaissement, jamais à la ligne du tableau.** Le
 * tableau s'affiche à plat, mais poids, volume et colis appartiennent au BL :
 * les demander par boîte obligerait le consignataire à répartir un tonnage que
 * son manifeste papier ne répartit pas.
 *
 * @see docs/WORKFLOWS-METIER.md WF4
 */
class ManifesteSaisieController extends Controller
{
    use GardeLeManifeste;

    /**
     * Ouvrir le manifeste en saisie manuelle : il naît vide et **sans numéro**.
     *
     * Rien n'est demandé au consignataire — le numéro n'est pas à lui de le
     * fournir, et e-CDTS ne l'attribuera qu'à la transmission, quand la saisie
     * sera close (ADR-0046). Le dossier reste donc sous son numéro provisoire
     * tout le temps du brouillon, ce qui est exactement ce qu'il est.
     */
    public function store(Request $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        abort_if($request->user()?->consignataire_id === null, 403);
        $this->assureAucunManifeste($escale);

        /** @var User $user */
        $user = $request->user();

        Manifeste::query()->create([
            'escale_id' => $escale->id,
            'mode_saisie' => ModeSaisieManifeste::Manuel,
            'depose_par' => $user->id,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Saisie ouverte — déclarez vos connaissements, joignez le PDF, puis transmettez.'),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /** Déclarer un connaissement et ses boîtes. */
    public function storeConnaissement(ConnaissementRequest $request, Escale $escale): RedirectResponse
    {
        $this->assureLeDossier($request, $escale);
        $manifeste = $this->manifesteModifiable($escale);

        $bl = DB::transaction(function () use ($request, $manifeste): ManifesteBl {
            $bl = ManifesteBl::query()->create([
                ...$this->attributs($request),
                'manifeste_id' => $manifeste->id,
                // Le rang de saisie : le tableau se lit dans l'ordre où le
                // consignataire a recopié son manifeste papier.
                'ligne_numero' => ($manifeste->bls()->max('ligne_numero') ?? 0) + 1,
            ]);

            $this->remplacerLesConteneurs($bl, $request);

            return $bl;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Connaissement :reference déclaré.', ['reference' => $bl->reference]),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /** Corriger un connaissement déjà saisi. */
    public function updateConnaissement(
        ConnaissementRequest $request,
        Escale $escale,
        ManifesteBl $connaissement,
    ): RedirectResponse {
        $this->assureLeDossier($request, $escale);
        $manifeste = $this->manifesteModifiable($escale);
        $this->assureQueLeBlEstDeCeManifeste($connaissement, $manifeste);

        DB::transaction(function () use ($request, $connaissement): void {
            $connaissement->update($this->attributs($request));
            $this->remplacerLesConteneurs($connaissement, $request);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Connaissement :reference corrigé.', ['reference' => $connaissement->reference]),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /** Retirer un connaissement — ses boîtes partent avec lui. */
    public function destroyConnaissement(
        Request $request,
        Escale $escale,
        ManifesteBl $connaissement,
    ): RedirectResponse {
        $this->assureLeDossier($request, $escale);
        $manifeste = $this->manifesteModifiable($escale);
        $this->assureQueLeBlEstDeCeManifeste($connaissement, $manifeste);

        $reference = $connaissement->reference;
        $connaissement->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Connaissement :reference retiré.', ['reference' => $reference]),
        ]);

        return redirect()->route('dossiers.manifeste', $escale);
    }

    /**
     * Le connaissement doit être de CE manifeste. Une ligne d'un autre dossier
     * n'est pas interdite : elle n'existe pas ici.
     */
    private function assureQueLeBlEstDeCeManifeste(ManifesteBl $bl, Manifeste $manifeste): void
    {
        abort_unless($bl->manifeste_id === $manifeste->id, 404);
    }

    /**
     * Ce que la saisie écrit sur le connaissement.
     *
     * `conteneurs_annonces` suit ce qui est réellement déclaré : en saisie
     * manuelle il n'y a pas d'écart possible entre l'annonce et la liste,
     * puisque c'est la même main qui les pose. Le champ garde son sens de
     * contrôle pour l'import, où les deux viennent du fichier.
     *
     * @return array<string, mixed>
     */
    private function attributs(ConnaissementRequest $request): array
    {
        /** @var array<int, array<string, mixed>> $conteneurs */
        $conteneurs = $request->input('conteneurs', []);

        return [
            'reference' => $request->string('reference')->trim()->toString(),
            'master_reference' => $request->input('master_reference'),
            'port_chargement' => $request->input('port_chargement'),
            'port_chargement_nom' => $request->input('port_chargement_nom'),
            'port_dechargement' => $request->input('port_dechargement'),
            'port_dechargement_nom' => $request->input('port_dechargement_nom'),
            'expediteur' => $request->input('expediteur'),
            'destinataire' => $request->input('destinataire'),
            'description' => $request->input('description'),
            'poids_brut_kg' => $request->input('poids_brut_kg'),
            'volume_m3' => $request->input('volume_m3'),
            'colis' => $request->input('colis'),
            'conteneurs_annonces' => count($conteneurs),
            'hors_conteneur' => $request->boolean('hors_conteneur'),
        ];
    }

    /**
     * Réécrire le jeu de boîtes du connaissement.
     *
     * Les qualifications déjà posées **survivent au numéro** : corriger le poids
     * d'un BL ne doit pas faire retomber ses trois boîtes en « à qualifier ».
     * Une boîte dont la référence disparaît emporte évidemment la sienne.
     */
    private function remplacerLesConteneurs(ManifesteBl $bl, ConnaissementRequest $request): void
    {
        /** @var array<int, array<string, mixed>> $saisis */
        $saisis = $request->input('conteneurs', []);

        // Le cast rend des enums ; l'insertion en lot veut des chaînes.
        $acquis = $bl->conteneurs()
            ->pluck('type_marchandise', 'reference')
            ->map(static fn (?TypeMarchandise $type): ?string => $type?->value)
            ->all();

        $bl->conteneurs()->delete();

        if ($saisis === []) {
            return;
        }

        $maintenant = now();

        $bl->conteneurs()->insert(array_map(
            static function (array $c) use ($bl, $acquis, $request, $maintenant): array {
                $reference = trim((string) $c['reference']);
                $taille = isset($c['taille']) ? (int) $c['taille'] : null;

                return [
                    'manifeste_bl_id' => $bl->id,
                    'reference' => $reference,
                    'taille' => $taille,
                    'colis' => $c['colis'] ?? null,
                    'plein' => isset($c['plein']) ? (bool) $c['plein'] : null,
                    'tare_kg' => $c['tare_kg'] ?? null,
                    // La qualification acquise d'abord — y compris quand elle
                    // est nulle : remettre une ligne « à qualifier » est un
                    // geste délibéré, pas une case vide à repeupler. Une boîte
                    // nouvelle reçoit la même pré-qualification qu'à l'import.
                    'type_marchandise' => array_key_exists($reference, $acquis)
                        ? $acquis[$reference]
                        : TypeMarchandise::conteneurDepuis($taille, $request->input('description'))?->value,
                    'created_at' => $maintenant,
                    'updated_at' => $maintenant,
                ];
            },
            $saisis,
        ));
    }
}
