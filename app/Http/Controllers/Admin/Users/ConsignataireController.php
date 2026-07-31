<?php

namespace App\Http\Controllers\Admin\Users;

use App\Enums\Permission;
use App\Enums\RoleClient;
use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\ConsignataireStoreRequest;
use App\Http\Requests\Admin\Users\ConsignataireUpdateRequest;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Port;
use App\Models\User;
use App\Notifications\CompteClientOuvert;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Fiche société consignataire — le mandataire de l'armement au port (ADR-0014).
 * C'est elle qui est facturée, jamais la personne qui déclare ; d'où sa place
 * dans le module « Utilisateurs & habilitations » plutôt qu'aux référentiels.
 *
 * Trois écritures, comme partout dans le panneau : création, mise à jour et
 * bascule d'activation. Pas de suppression dure (ADR-0012) — une société
 * désactivée sort des menus, ses escales et ses factures restent intactes.
 *
 * Les deux rattachements N-N (armements représentés, ports d'exercice) sont
 * enregistrés dans la même transaction que la fiche : une société à moitié
 * rattachée n'a pas de sens métier.
 */
class ConsignataireController extends Controller
{
    /** Colonnes du pivot — écrites par `sync()`, pas par l'assignation de masse. */
    private const RATTACHEMENTS = ['armement_ids', 'port_ids'];

    /** Bloc du compte maître — donne un `User`, pas des colonnes de la société. */
    private const TITULAIRE = [
        'titulaire_first_name',
        'titulaire_last_name',
        'titulaire_email',
        'titulaire_phone',
        'titulaire_job_title',
    ];

    /**
     * Fiche de la société — ce qui ne tient pas dans une ligne de tableau : ses
     * armements, ses ports, et les comptes de ses agents.
     *
     * La **lecture** est ouverte à tout gestionnaire d'utilisateurs (la route la
     * place sous `utilisateurs.gerer`) ; seules les écritures relèvent de
     * `comptes-clients.gerer`. D'où un drapeau de capacité plutôt qu'un second
     * refus : le Superviseur consulte le dossier client sans pouvoir l'engager
     * (ADR-0025).
     *
     * Les décisions sur les comptes agents ne sont **pas** rejouées ici. Valider,
     * refuser, réexaminer et affecter vivent dans l'onglet Agents avec leurs
     * règles d'enchaînement ; les redéployer sur cette fiche ferait deux endroits
     * à tenir d'accord pour un même geste. La fiche montre l'état et y conduit.
     */
    public function show(Request $request, Consignataire $consignataire): Response
    {
        $consignataire->load([
            'paysImmatriculation:id,name',
            'titulaire:id,name,email,phone,job_title',
            'armements.paysOrigine:id,name',
            'ports.pays:id,name',
            'agents.armements:id,name,sigle',
        ]);

        // Combien de sociétés représentent chacun de ces armements : c'est ce qui
        // sépare un mandat exclusif d'un armement partagé (ADR-0014).
        $consignataire->armements->loadCount('consignataires');

        return Inertia::render('admin/consignataire', [
            'consignataire' => [
                'id' => $consignataire->id,
                'name' => $consignataire->name,
                'sigle' => $consignataire->sigle,
                'rccm_nif' => $consignataire->rccm_nif,
                'pays_immatriculation_name' => $consignataire->paysImmatriculation?->name,
                'adresse' => $consignataire->adresse,
                'telephone' => $consignataire->telephone,
                'email' => $consignataire->email,
                'actif' => $consignataire->actif,
                // Le titulaire figure dans l'en-tête et non dans un bloc à part :
                // c'est une propriété de la société, pas une section du dossier.
                'titulaire_user_id' => $consignataire->titulaire_user_id,
                'titulaire_name' => $consignataire->titulaire?->name,
                'titulaire_email' => $consignataire->titulaire?->email,
                'titulaire_job_title' => $consignataire->titulaire?->job_title,
                // Alimente le dialogue de remplacement, ouvert depuis l'en-tête
                // comme depuis la liste (ADR-0027).
                'agents_eligibles' => $consignataire->agentsEligiblesTitulaire()
                    ->map(fn (User $agent): array => ['value' => $agent->id, 'label' => $agent->name.' · '.$agent->email])
                    ->all(),
            ],
            'armements' => $this->armementsRepresentes($consignataire),
            'ports' => $this->portsRattaches($consignataire),
            'agents' => $this->comptesAgents($consignataire),
            'peutGerer' => $request->user()?->can(Permission::ComptesClientsGerer->value) ?? false,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function armementsRepresentes(Consignataire $consignataire): array
    {
        return array_values($consignataire->armements
            ->sortBy('name')
            ->map(fn (Armement $armement): array => [
                'id' => $armement->id,
                'name' => $armement->name,
                'sigle' => $armement->sigle,
                'pays_origine_name' => $armement->paysOrigine?->name,
                // Le pivot compte cette société elle-même : au-delà d'une, le
                // mandat est partagé avec un confrère.
                'partage' => ((int) $armement->consignataires_count) > 1,
            ])
            ->all());
    }

    /** @return list<array<string, mixed>> */
    private function portsRattaches(Consignataire $consignataire): array
    {
        return array_values($consignataire->ports
            ->sortBy('name')
            ->map(fn (Port $port): array => [
                'id' => $port->id,
                'name' => $port->name,
                'code' => $port->code,
                'pays_name' => $port->pays?->name,
            ])
            ->all());
    }

    /**
     * Les comptes de la société, tous statuts confondus — le refusé compris,
     * qui reste la trace opposable d'une décision prise (ADR-0024).
     *
     * @return list<array<string, mixed>>
     */
    private function comptesAgents(Consignataire $consignataire): array
    {
        return array_values($consignataire->agents
            ->sortBy('name')
            ->map(fn (User $agent): array => [
                'id' => $agent->id,
                'name' => $agent->name,
                'email' => $agent->email,
                'job_title' => $agent->job_title,
                // Le titulaire est listé comme les autres : il déclare aussi. Le
                // marqueur dit seulement qu'il gère en plus les comptes.
                'est_titulaire' => $agent->id === $consignataire->titulaire_user_id,
                'statut' => $agent->statutAffiche(),
                'armements' => array_values($agent->armements
                    ->map(fn (Armement $armement): array => [
                        'id' => $armement->id,
                        'name' => $armement->name,
                        'sigle' => $armement->sigle,
                    ])
                    ->all()),
            ])
            ->all());
    }

    public function store(ConsignataireStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($request, $data): void {
            $consignataire = Consignataire::create($this->colonnes($data) + ['actif' => true]);

            $this->syncRattachements($consignataire, $data);
            $this->syncTitulaire($request, $consignataire, $data);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Consignataire ajouté.')]);

        return to_route('admin.utilisateurs.index');
    }

    public function update(ConsignataireUpdateRequest $request, Consignataire $consignataire): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($request, $consignataire, $data): void {
            $consignataire->update($this->colonnes($data));

            $this->syncRattachements($consignataire, $data);
            $this->syncTitulaire($request, $consignataire, $data);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Consignataire mis à jour.')]);

        return to_route('admin.utilisateurs.index');
    }

    public function toggleActive(Consignataire $consignataire): RedirectResponse
    {
        $consignataire->update(['actif' => ! $consignataire->actif]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $consignataire->actif ? __('Consignataire réactivé.') : __('Consignataire désactivé.'),
        ]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Le formulaire envoie toujours les deux listes — une case décochée est donc
     * un retrait, et `sync()` est la bonne primitive.
     *
     * @param  array<string, mixed>  $data
     */
    private function syncRattachements(Consignataire $consignataire, array $data): void
    {
        $consignataire->armements()->sync($data['armement_ids'] ?? []);
        $consignataire->ports()->sync($data['port_ids'] ?? []);
    }

    /**
     * Ce que le formulaire adresse à la table `consignataires` : tout sauf les
     * pivots et le bloc titulaire, qui vivent ailleurs.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function colonnes(array $data): array
    {
        return Arr::except($data, [...self::RATTACHEMENTS, ...self::TITULAIRE]);
    }

    /**
     * Compte maître de la société (ADR-0010 : le CGC ouvre les comptes clients).
     *
     * Créé par le CGC, il est **validé d'emblée** — le circuit de validation
     * d'ADR-0013 protège des comptes que la société ouvre elle-même ; ici c'est
     * le CGC qui saisit, il n'a pas à se valider lui-même. C'est un agent
     * déclarant comme les autres : il porte une portée d'armements, gérée depuis
     * l'onglet Agents.
     *
     * Bloc vide = rien à faire. On ne dénomme jamais un titulaire par omission :
     * le remplacer passe par un geste explicite (`TitulaireController`).
     *
     * @param  array<string, mixed>  $data
     */
    private function syncTitulaire(Request $request, Consignataire $consignataire, array $data): void
    {
        if (($data['titulaire_email'] ?? null) === null) {
            return;
        }

        $ouverture = $consignataire->titulaire === null;

        $titulaire = $consignataire->titulaire ?? new User([
            'consignataire_id' => $consignataire->id,
            'statut_validation' => StatutValidation::Valide,
            'is_active' => true,
            'valide_par_user_id' => $request->user()?->id,
            'valide_le' => now(),
            // Secret jetable : personne ne le connaît et il ne sert jamais. Le
            // titulaire définit le sien depuis le lien reçu par courriel.
            'password' => Str::password(32),
        ]);

        $titulaire->fill([
            'name' => trim($data['titulaire_first_name'].' '.$data['titulaire_last_name']),
            'first_name' => $data['titulaire_first_name'],
            'last_name' => $data['titulaire_last_name'],
            'email' => $data['titulaire_email'],
            'phone' => $data['titulaire_phone'] ?? null,
            'job_title' => $data['titulaire_job_title'] ?? null,
        ]);

        // Changer l'adresse d'un compte existant remet sa vérification à zéro.
        if ($titulaire->exists && $titulaire->isDirty('email')) {
            $titulaire->email_verified_at = null;
        }

        $titulaire->save();

        $consignataire->titulaire()->associate($titulaire)->save();

        // Un compte client ne porte qu'un rôle, celui de sa position dans la
        // société (ADR-0031) : syncRoles, pas assignRole.
        $titulaire->syncRoles([RoleClient::Titulaire->value]);

        // Après commit : un courriel parti sur une transaction qui échoue
        // annoncerait un compte qui n'existe pas.
        if ($ouverture) {
            DB::afterCommit(fn () => $titulaire->notify(new CompteClientOuvert($consignataire)));
        }
    }
}
