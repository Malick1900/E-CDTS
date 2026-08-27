<?php

namespace App\Actions\Manifeste;

use App\DataTransferObjects\BlLu;
use App\DataTransferObjects\ConteneurLu;
use App\Enums\ModeSaisieManifeste;
use App\Enums\TypeMarchandise;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Rattache un manifeste AWMDS à un dossier d'escale (WF4).
 *
 * Le fichier est lu d'abord, écrit ensuite : rien ne part en base tant que les
 * contrôles de comptage n'ont pas passé. L'écriture elle-même est atomique —
 * un manifeste à moitié importé serait pire qu'un import refusé, parce qu'il
 * aurait l'air complet.
 *
 * **Le fichier déposé reste la pièce probante.** En mode XML il joue le rôle
 * que le PDF joue en saisie manuelle : c'est sur lui que l'agent CGC rejouera
 * le dépouillement (WF5). Il ne s'efface pas avec le dossier.
 *
 * **Le numéro est attribué ici**, pas saisi : aucune balise AWMDS ne le porte
 * (ADR-0046). L'import étant un geste unique et complet, le dossier cesse
 * d'être provisoire dès qu'il aboutit — à la différence de la saisie manuelle,
 * qui attend sa transmission.
 *
 * @see docs/WORKFLOWS-METIER.md WF4
 */
final class ImporteUnManifesteAwmds
{
    /** Où vivent les pièces probantes — hors du disque public, sans exception. */
    public const DISQUE = 'local';

    public function __construct(private LitUnManifesteAwmds $lit) {}

    /**
     * @return array{manifeste: Manifeste, anomalies: list<string>}
     */
    public function handle(Escale $escale, UploadedFile $fichier, User $par): array
    {
        $lu = $this->lit->handle((string) $fichier->get(), $escale);

        // Le fichier n'est déposé qu'une fois la lecture acquise : un import
        // refusé ne laisse pas de trace sur le disque.
        $chemin = $fichier->store('manifestes/'.$escale->id, self::DISQUE);

        return DB::transaction(function () use ($escale, $fichier, $par, $lu, $chemin): array {
            $manifeste = Manifeste::query()->create([
                'escale_id' => $escale->id,
                'mode_saisie' => ModeSaisieManifeste::Xml,
                'piece_jointe_chemin' => $chemin === false ? null : $chemin,
                'piece_jointe_nom' => $fichier->getClientOriginalName(),
                'piece_jointe_octets' => $fichier->getSize(),
                'depose_par' => $par->id,
            ]);

            foreach ($lu->bls as $blLu) {
                $this->ecrireLeBl($manifeste, $blLu);
            }

            // Le manifeste est acquis d'un coup : il reçoit son numéro tout de
            // suite, et le dossier cesse d'être provisoire (ADR-0046).
            $manifeste->numeroter();

            return ['manifeste' => $manifeste, 'anomalies' => $lu->anomalies];
        });
    }

    /**
     * Un connaissement et ses boîtes.
     *
     * Les boîtes s'insèrent en lot : un manifeste de porte-conteneurs en porte
     * quelques centaines, et une requête par boîte ferait de l'import une
     * attente. Le lot impose de poser les horodatages à la main — `insert` ne
     * passe pas par le modèle.
     */
    private function ecrireLeBl(Manifeste $manifeste, BlLu $lu): void
    {
        $bl = ManifesteBl::query()->create([
            'manifeste_id' => $manifeste->id,
            'reference' => $lu->reference,
            'ligne_numero' => $lu->ligneNumero,
            'master_reference' => $lu->masterReference,
            'port_chargement' => $lu->portChargement,
            'port_dechargement' => $lu->portDechargement,
            'expediteur' => $lu->expediteur,
            'destinataire' => $lu->destinataire,
            'description' => $lu->description,
            'poids_brut_kg' => $lu->poidsBrutKg,
            'volume_m3' => $lu->volumeM3,
            'colis' => $lu->colis,
            'conteneurs_annonces' => $lu->conteneursAnnonces,
            'hors_conteneur' => $lu->horsConteneur,
        ]);

        if ($lu->conteneurs === []) {
            return;
        }

        $maintenant = now();

        $bl->conteneurs()->insert(array_map(
            static fn (ConteneurLu $c): array => [
                'manifeste_bl_id' => $bl->id,
                'reference' => $c->reference,
                'taille' => $c->taille,
                'colis' => $c->colis,
                'plein' => $c->plein,
                'tare_kg' => $c->tareKg,
                // Toute la pré-qualification automatique tient là : la taille
                // vient du fichier, le froid des mots de la description. Une
                // taille absente laisse la ligne à qualifier plutôt que devinée.
                'type_marchandise' => TypeMarchandise::conteneurDepuis($c->taille, $lu->description)?->value,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ],
            $lu->conteneurs,
        ));
    }
}
