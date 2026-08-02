<?php

namespace App\Http\Controllers;

use App\Concerns\BorneASaSociete;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Port;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * L'espace d'administration d'une société consignataire — le pendant client du
 * panneau CGC (ADR-0030). Le titulaire y gère ses agents, leurs affectations et
 * consulte la fiche de sa société.
 *
 * Tout ce que cet écran expose est borné à la société dont le compte est
 * titulaire : la société n'est jamais lue depuis la requête, elle se déduit du
 * compte connecté (voir `BorneASaSociete`). Un titulaire ne peut donc pas
 * désigner celle d'un concurrent — dont il verrait les armements représentés,
 * information commercialement sensible.
 */
class MonEspaceController extends Controller
{
    use BorneASaSociete;

    public function index(Request $request): Response
    {
        $societe = $this->societe($request);
        $societe->load(['paysImmatriculation:id,name', 'ports.pays:id,name']);

        $armements = $this->armements($societe);

        return Inertia::render('activite/mon-espace', [
            // L'en-tête « Espace de … » vient déjà de la coquille (ADR-0030) ;
            // il ne reste ici que ce que la barre d'onglets annonce.
            'compteurs' => [
                'agents' => $societe->agents()->count(),
                'armements' => count($armements),
            ],
            'agents' => $this->agents($request, $societe),
            'armements' => $armements,
            'societe' => $this->fiche($societe),
        ]);
    }

    /**
     * La fiche de la société, telle que le CGC la détient — en lecture seule.
     *
     * Elle n'est pas modifiable ici, et ce n'est pas un manque : la raison
     * sociale, le RCCM · NIF et les ports desservis sont ce sur quoi le CGC a
     * ouvert le compte, sur pièces. Les laisser corriger côté client rendrait
     * le dossier divergent de ce qui a été vérifié. Le titulaire constate, et
     * signale ce qui a changé.
     *
     * @return array<string, mixed>
     */
    private function fiche(Consignataire $societe): array
    {
        return [
            'name' => $societe->name,
            'sigle' => $societe->sigle,
            'rccm_nif' => $societe->rccm_nif,
            'pays_immatriculation' => $societe->paysImmatriculation?->name,
            'adresse' => $societe->adresse,
            'telephone' => $societe->telephone,
            'email' => $societe->email,
            // Les ports où la société exerce (ADR-0014). Ce ne sont pas des
            // décorations : ils bornent les escales qu'elle pourra déclarer.
            'ports' => array_values($societe->ports
                ->sortBy('name')
                ->map(fn (Port $port): array => [
                    'id' => $port->id,
                    'name' => $port->name,
                    'code' => $port->code,
                    'pays' => $port->pays?->name,
                ])
                ->all()),
        ];
    }

    /**
     * Les comptes de la société, quel que soit leur état — y compris refusés :
     * sans eux le titulaire verrait sa demande disparaître sans jamais savoir
     * pourquoi, et la resoumettrait à l'aveugle (ADR-0024).
     *
     * @return list<array<string, mixed>>
     */
    private function agents(Request $request, Consignataire $societe): array
    {
        return array_values($societe->agents()
            ->with('armements:id,name,sigle')
            ->orderBy('name')
            ->get()
            ->map(fn (User $agent): array => [
                'id' => $agent->id,
                'name' => $agent->name,
                'first_name' => $agent->first_name,
                'last_name' => $agent->last_name,
                'phone' => $agent->phone,
                'job_title' => $agent->job_title,
                'email' => $agent->email,
                'statut' => $agent->statutAffiche(),
                'motif_refus' => $agent->motif_refus,
                'last_login_at' => $agent->last_login_at?->toIso8601String(),
                // Portée de l'agent (ADR-0009), affectée depuis l'onglet voisin.
                'armements' => $agent->armements
                    ->map(fn (Armement $armement): array => [
                        'id' => $armement->id,
                        'name' => $armement->name,
                        'sigle' => $armement->sigle,
                    ])
                    ->all(),
                // Le titulaire est agent de sa propre société : sa ligne est là,
                // mais les actions n'ont pas de prise sur elle (ADR-0012).
                'est_moi' => $request->user()?->is($agent) ?? false,
                // Une demande que le CGC n'a jamais examinée s'efface encore ;
                // dès qu'il a statué, elle se suspend (ADR-0024).
                'peut_supprimer' => $agent->valide_le === null
                    && $agent->statut_validation === StatutValidation::EnAttente,
            ])
            ->all());
    }

    /**
     * Les armements que la société représente (ADR-0014). Le CGC les rattache à
     * sa fiche ; elle n'en choisit pas la liste, elle en répartit la charge
     * entre ses agents. C'est donc à la fois les colonnes de la matrice
     * d'affectation et le contenu de l'onglet qui les recense.
     *
     * La fiche de l'armement est projetée en entier — pavillon, immatriculation,
     * gérant, siège. Ce n'est pas de l'ornement : le consignataire est le
     * mandataire de cette compagnie au port, et c'est à partir de ces mentions
     * qu'il correspond avec elle et qu'il l'engage. Les lui masquer l'obligerait
     * à tenir sa propre copie du dossier à côté de la plateforme.
     *
     * @return list<array<string, mixed>>
     */
    private function armements(Consignataire $societe): array
    {
        return array_values($societe->armements()
            ->with(['paysOrigine:id,name', 'paysImmatriculation:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (Armement $armement): array => [
                'id' => $armement->id,
                'name' => $armement->name,
                'sigle' => $armement->sigle,
                'pays_origine' => $armement->paysOrigine?->name,
                'pays_immatriculation' => $armement->paysImmatriculation?->name,
                'gerant' => $armement->gerant,
                'rccm_nif' => $armement->rccm_nif,
                'adresse' => $armement->adresse,
                // Un armement que le CGC a désactivé au référentiel reste
                // rattaché à la société : le dire vaut mieux que le masquer,
                // sinon la disparition d'une ligne resterait inexpliquée.
                'actif' => $armement->actif,
            ])
            ->all());
    }
}
