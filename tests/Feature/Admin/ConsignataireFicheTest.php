<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fiche d'une société cliente.
 *
 * Ce qu'elle résout, et donc ce que ces tests protègent : une ligne de tableau
 * ne peut pas porter trente armements ni la liste des comptes d'une société. La
 * liste dit *combien*, la fiche dit *lesquels* — d'où deux projections
 * distinctes, dont la cohérence est vérifiée ici.
 *
 * Le second enjeu est la frontière de permission : la fiche se **lit** sous
 * `utilisateurs.gerer` et ne s'**écrit** que sous `comptes-clients.gerer`
 * (ADR-0025). Un Superviseur doit donc consulter le dossier d'un client sans
 * pouvoir l'engager — et le savoir avant de cliquer.
 */
class ConsignataireFicheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function utilisateur(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    // ── Contenu de la fiche ───────────────────────────────────────

    public function test_la_fiche_deplie_les_rattachements_et_les_comptes_de_la_societe(): void
    {
        $admin = $this->utilisateur(Profil::Administrateur);

        $societe = Consignataire::factory()->create(['name' => 'SAGA Gabon']);
        $societe->armements()->attach(Armement::factory()->create(['name' => 'Maersk Line'])->id);
        $societe->ports()->attach(Port::factory()->create(['name' => 'Owendo'])->id);

        $enAttente = User::factory()->agentDe($societe)->create(['name' => 'Nadia Bongo']);
        User::factory()->agentDe($societe)->valide($admin)->create(['name' => 'Paul Ndong']);

        // Un agent d'une autre société ne doit pas apparaître : la fiche est le
        // dossier d'un client, pas la liste de tous les comptes.
        User::factory()->agentDe(Consignataire::factory()->create())->create();

        $this->actingAs($admin)
            ->get(route('admin.utilisateurs.consignataires.show', $societe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/consignataire')
                ->where('consignataire.name', 'SAGA Gabon')
                ->where('peutGerer', true)
                ->has('armements', 1)
                ->where('armements.0.name', 'Maersk Line')
                ->has('ports', 1)
                ->where('ports.0.name', 'Owendo')
                ->has('agents', 2)
                ->where('agents', fn ($agents): bool => collect($agents)
                    ->firstWhere('id', $enAttente->id)['statut'] === 'en_attente')
            );
    }

    /**
     * Le marqueur « partagé » est ce qui distingue un mandat exclusif d'un
     * armement représenté par plusieurs sociétés (ADR-0014). Sans lui, la fiche
     * laisserait croire à une exclusivité qui n'existe pas.
     */
    public function test_un_armement_represente_par_deux_societes_est_signale_comme_partage(): void
    {
        $exclusif = Armement::factory()->create(['name' => 'Exclusif']);
        $partage = Armement::factory()->create(['name' => 'Partagé']);

        $societe = Consignataire::factory()->create();
        $societe->armements()->attach([$exclusif->id, $partage->id]);

        Consignataire::factory()->create()->armements()->attach($partage->id);

        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->get(route('admin.utilisateurs.consignataires.show', $societe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('armements', function ($armements): bool {
                $par = collect($armements)->keyBy('name');

                return $par['Partagé']['partage'] === true && $par['Exclusif']['partage'] === false;
            }));
    }

    public function test_la_fiche_propose_les_successeurs_eligibles_au_titulariat(): void
    {
        $admin = $this->utilisateur(Profil::Administrateur);
        $societe = Consignataire::factory()->create();

        $valide = User::factory()->agentDe($societe)->valide($admin)->create();
        // Ni l'un ni l'autre ne peut succéder : la fonction suppose un compte
        // que le CGC a déjà validé (ADR-0027).
        User::factory()->agentDe($societe)->create();
        User::factory()->agentDe($societe)->refuse($admin)->create();

        $this->actingAs($admin)
            ->get(route('admin.utilisateurs.consignataires.show', $societe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('consignataire.agents_eligibles', 1)
                ->where('consignataire.agents_eligibles.0.value', $valide->id)
            );
    }

    public function test_une_societe_sans_rattachement_ni_compte_rend_une_fiche_vide_mais_valide(): void
    {
        $this->actingAs($this->utilisateur(Profil::Administrateur))
            ->get(route('admin.utilisateurs.consignataires.show', Consignataire::factory()->create()))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('armements', 0)
                ->has('ports', 0)
                ->has('agents', 0)
                ->where('consignataire.titulaire_user_id', null)
            );
    }

    // ── Frontière de permission ───────────────────────────────────

    /**
     * L'écart voulu par ADR-0025 : le Superviseur consulte le dossier d'un
     * client — il en a besoin pour son travail — mais n'écrit rien. Le drapeau
     * lui évite de découvrir la règle par un refus.
     */
    public function test_un_superviseur_lit_la_fiche_sans_pouvoir_l_ecrire(): void
    {
        $superviseur = $this->utilisateur(Profil::Superviseur);
        $societe = Consignataire::factory()->create();

        $this->actingAs($superviseur)
            ->get(route('admin.utilisateurs.consignataires.show', $societe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('peutGerer', false));

        $this->actingAs($superviseur)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $societe))
            ->assertForbidden();
    }

    public function test_la_fiche_est_fermee_a_qui_ne_gere_pas_les_utilisateurs(): void
    {
        $this->actingAs($this->utilisateur(Profil::Consultant))
            ->get(route('admin.utilisateurs.consignataires.show', Consignataire::factory()->create()))
            ->assertForbidden();
    }

    // ── Cohérence avec la liste ───────────────────────────────────

    /**
     * La liste ne montre plus *quels* comptes — c'est le rôle de la fiche — mais
     * elle doit dire combien attendent une décision : c'est le seul chiffre du
     * tableau qui appelle une action du CGC (ADR-0013).
     */
    public function test_la_liste_compte_les_comptes_agents_et_ceux_en_attente(): void
    {
        $admin = $this->utilisateur(Profil::Administrateur);
        $societe = Consignataire::factory()->create();

        User::factory()->count(2)->agentDe($societe)->create();
        User::factory()->agentDe($societe)->valide($admin)->create();
        User::factory()->agentDe($societe)->refuse($admin)->create();

        $this->actingAs($admin)
            ->get(route('admin.utilisateurs.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('consignataires', function ($consignataires) use ($societe): bool {
                $ligne = collect($consignataires)->firstWhere('id', $societe->id);

                return $ligne['agents_count'] === 4 && $ligne['agents_en_attente'] === 2;
            }));
    }
}
