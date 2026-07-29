<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\User;
use App\Notifications\CompteClientOuvert;
use App\Notifications\TitulaireDesigne;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Tests\TestCase;

class ConsignataireManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole(Profil::Administrateur->value);

        return $admin;
    }

    public function test_creation_requires_the_client_accounts_permission(): void
    {
        $consultant = User::factory()->create();
        $consultant->assignRole(Profil::Consultant->value);

        $this->actingAs($consultant)
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'])
            ->assertForbidden();
    }

    /**
     * Le Superviseur gère les comptes internes mais pas le volet client
     * (ADR-0025) : la fiche société engage le CGC vis-à-vis d'un tiers, et
     * c'est elle qui est facturée.
     */
    public function test_a_supervisor_cannot_manage_client_companies(): void
    {
        $superviseur = User::factory()->create();
        $superviseur->assignRole(Profil::Superviseur->value);

        $this->actingAs($superviseur)
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'])
            ->assertForbidden();

        $this->actingAs($superviseur)
            ->patch(route('admin.utilisateurs.consignataires.activation', Consignataire::factory()->create()))
            ->assertForbidden();
    }

    public function test_admin_can_create_a_consignee_with_its_attachments(): void
    {
        // Le code du pays n'est pas la matière du test : l'imposer ferait
        // entrer en collision avec un code tiré au hasard par une autre factory.
        $pays = Pays::factory()->create();
        $armements = Armement::factory()->count(2)->create();
        $port = Port::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.consignataires.store'), [
                'name' => 'SAGA Gabon',
                'sigle' => 'saga',
                'rccm_nif' => 'RCCM LBV 2014 B 00612',
                'pays_immatriculation_id' => $pays->id,
                'telephone' => '+241 11 22 33 44',
                'email' => 'consignation@saga-gabon.ga',
                'armement_ids' => $armements->pluck('id')->all(),
                'port_ids' => [$port->id],
            ])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $consignataire = Consignataire::firstWhere('name', 'SAGA Gabon');

        $this->assertNotNull($consignataire);
        $this->assertSame('SAGA', $consignataire->sigle, 'Le sigle est normalisé en majuscules.');
        $this->assertTrue($consignataire->actif);
        $this->assertNull($consignataire->adresse, 'Un champ facultatif absent reste null, jamais une chaîne vide.');
        $this->assertEqualsCanonicalizing($armements->pluck('id')->all(), $consignataire->armements->pluck('id')->all());
        $this->assertSame([$port->id], $consignataire->ports->pluck('id')->all());
    }

    public function test_update_synchronises_attachments_in_both_directions(): void
    {
        $consignataire = Consignataire::factory()->create();
        [$retire, $conserve, $ajoute] = Armement::factory()->count(3)->create()->all();
        $consignataire->armements()->sync([$retire->id, $conserve->id]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.consignataires.update', $consignataire), [
                'name' => $consignataire->name,
                'armement_ids' => [$conserve->id, $ajoute->id],
                'port_ids' => [],
            ])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertEqualsCanonicalizing(
            [$conserve->id, $ajoute->id],
            $consignataire->fresh()->armements->pluck('id')->all(),
        );
    }

    public function test_admin_can_deactivate_and_reactivate_a_consignee(): void
    {
        $consignataire = Consignataire::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.activation', $consignataire))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertFalse($consignataire->fresh()->actif);

        $this->actingAs($admin)->patch(route('admin.utilisateurs.consignataires.activation', $consignataire));

        $this->assertTrue($consignataire->fresh()->actif);
    }

    public function test_the_users_page_exposes_consignees_and_their_options(): void
    {
        $armement = Armement::factory()->create();
        Armement::factory()->create(['actif' => false]);
        $consignataire = Consignataire::factory()->create();
        $consignataire->armements()->sync([$armement->id]);

        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->where('consignataires.0.name', $consignataire->name)
                ->where('consignataires.0.armement_ids', [$armement->id])
                ->where('consignataires.0.armement_names', [$armement->name])
                ->count('optionsArmements', 1)
            );
    }

    // ── Titulaire du compte (ADR-0010) ────────────────────────────

    /**
     * @return array<string, string>
     */
    private function titulaire(array $surcharge = []): array
    {
        return array_merge([
            'titulaire_first_name' => 'Nadia',
            'titulaire_last_name' => 'Bongo',
            'titulaire_email' => 'n.bongo@saga-gabon.ga',
            'titulaire_phone' => '+241 06 11 22 33',
            'titulaire_job_title' => 'Responsable escale',
        ], $surcharge);
    }

    public function test_creating_a_company_with_its_account_holder_opens_an_active_account(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire())
            ->assertRedirect(route('admin.utilisateurs.index'));

        $consignataire = Consignataire::firstWhere('name', 'SAGA Gabon');
        $titulaire = $consignataire?->titulaire;

        $this->assertNotNull($titulaire);
        $this->assertSame('Nadia Bongo', $titulaire->name, 'Le nom d\'affichage est composé du prénom et du nom.');
        $this->assertSame($consignataire->id, $titulaire->consignataire_id, 'Le titulaire est un compte client rattaché à sa société.');
        $this->assertSame(StatutValidation::Valide, $titulaire->statut_validation);
        $this->assertTrue($titulaire->is_active, 'Ouvert par le CGC, le compte maître n\'a pas à passer par la validation.');
        $this->assertSame($admin->id, $titulaire->valide_par_user_id);
    }

    public function test_the_account_holder_is_a_declaring_agent_like_the_others(): void
    {
        $armement = Armement::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.consignataires.store'), [
                'name' => 'SAGA Gabon',
                'armement_ids' => [$armement->id],
            ] + $this->titulaire());

        $titulaire = Consignataire::firstWhere('name', 'SAGA Gabon')->titulaire;

        // Il apparaît dans l'onglet Agents, marqué comme titulaire...
        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->count('agents', 1)
                ->where('agents.0.est_titulaire', true)
                ->where('agents.0.statut', 'actif')
            );

        // ...et reçoit une portée d'armements comme n'importe quel déclarant.
        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.affectations', $titulaire), ['armement_ids' => [$armement->id]])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertSame([$armement->id], $titulaire->refresh()->armements->pluck('id')->all());
    }

    public function test_a_company_can_be_created_before_its_account_holder_is_named(): void
    {
        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $consignataire = Consignataire::firstWhere('name', 'SAGA Gabon');

        $this->assertNull($consignataire->titulaire_user_id);
        // Aucun compte client n'est créé sur un bloc titulaire vide : seul
        // l'administrateur du test est en base.
        $this->assertDatabaseCount('users', 1);
    }

    public function test_naming_an_account_holder_requires_an_identity_and_a_free_email(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire(['titulaire_first_name' => '']))
            ->assertSessionHasErrors('titulaire_first_name');

        $this->actingAs($admin)
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire(['titulaire_email' => $admin->email]))
            ->assertSessionHasErrors('titulaire_email');

        $this->assertDatabaseMissing('consignataires', ['name' => 'SAGA Gabon']);
    }

    public function test_opening_an_account_mails_a_password_link_to_its_holder(): void
    {
        NotificationFacade::fake();

        $this->actingAs($this->admin())
            ->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire());

        $titulaire = Consignataire::firstWhere('name', 'SAGA Gabon')->titulaire;

        NotificationFacade::assertSentTo($titulaire, CompteClientOuvert::class);

        // Le CGC ne connaît aucun secret : le mot de passe posé à la création
        // est jetable, seul le lien reçu par courriel ouvre le compte.
        $this->assertNotNull($titulaire->password);
    }

    public function test_updating_a_company_does_not_reopen_the_account_of_its_holder(): void
    {
        NotificationFacade::fake();

        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire());

        $consignataire = Consignataire::firstWhere('name', 'SAGA Gabon');

        $this->actingAs($admin)->patch(route('admin.utilisateurs.consignataires.update', $consignataire), [
            'name' => 'SAGA Gabon',
            'armement_ids' => [],
            'port_ids' => [],
        ] + $this->titulaire());

        // Une seule ouverture de compte, donc un seul courriel : modifier la
        // fiche n'annonce pas deux fois la même chose.
        NotificationFacade::assertSentTimes(CompteClientOuvert::class, 1);
    }

    public function test_updating_a_company_edits_its_existing_account_holder_without_touching_the_password(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.utilisateurs.consignataires.store'), ['name' => 'SAGA Gabon'] + $this->titulaire());

        $consignataire = Consignataire::firstWhere('name', 'SAGA Gabon');
        $motDePasse = $consignataire->titulaire->password;

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.update', $consignataire), [
                'name' => 'SAGA Gabon',
                'armement_ids' => [],
                'port_ids' => [],
            ] + $this->titulaire(['titulaire_job_title' => 'Directrice d\'agence']))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $titulaire = $consignataire->fresh()->titulaire;

        $this->assertSame('Directrice d\'agence', $titulaire->job_title);
        $this->assertSame($motDePasse, $titulaire->password, 'Modifier la fiche ne touche jamais au mot de passe du titulaire.');
        // La mise à jour édite le compte existant, elle n'en crée pas un second.
        $this->assertDatabaseCount('users', 2);
    }

    // ── Remplacement du titulaire (ADR-0027) ──────────────────────

    /** Société dotée d'un titulaire et d'un second agent validé. */
    private function societeAvecDeuxAgents(): Consignataire
    {
        $consignataire = Consignataire::factory()->create();

        $titulaire = User::factory()->agentDe($consignataire)->valide($this->admin())->create();
        User::factory()->agentDe($consignataire)->valide($this->admin())->create(['name' => 'Paul Ndong']);

        $consignataire->titulaire()->associate($titulaire)->save();

        return $consignataire->fresh();
    }

    public function test_the_role_can_be_handed_to_another_agent_who_keeps_everything_else(): void
    {
        NotificationFacade::fake();

        $consignataire = $this->societeAvecDeuxAgents();
        $sortant = $consignataire->titulaire;
        $entrant = $consignataire->agents->firstWhere('name', 'Paul Ndong');

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), ['agent_id' => $entrant->id])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertSame($entrant->id, $consignataire->fresh()->titulaire_user_id);

        $sortant->refresh();
        $this->assertSame($consignataire->id, $sortant->consignataire_id, 'Le sortant reste agent de sa société.');
        $this->assertTrue($sortant->is_active, "Perdre la fonction n'est pas perdre l'accès — désactiver est un autre geste.");

        NotificationFacade::assertSentTo($entrant, TitulaireDesigne::class);
    }

    public function test_the_role_can_go_to_someone_who_has_no_account_yet(): void
    {
        NotificationFacade::fake();

        $consignataire = $this->societeAvecDeuxAgents();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), [
                'titulaire_first_name' => 'Estelle',
                'titulaire_last_name' => 'Mengue',
                'titulaire_email' => 'e.mengue@transit-ogooue.ga',
                'titulaire_job_title' => 'Gérante',
            ])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $entrant = $consignataire->fresh()->titulaire;

        $this->assertSame('Estelle Mengue', $entrant->name);
        $this->assertSame(StatutValidation::Valide, $entrant->statut_validation);
        $this->assertTrue($entrant->is_active);

        NotificationFacade::assertSentTo($entrant, CompteClientOuvert::class);
    }

    public function test_the_new_holder_must_be_a_validated_agent_of_that_company(): void
    {
        $consignataire = $this->societeAvecDeuxAgents();
        $etranger = User::factory()->agentDe(Consignataire::factory()->create())->valide($this->admin())->create();
        $enAttente = User::factory()->agentDe($consignataire)->create();

        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), ['agent_id' => $etranger->id])
            ->assertSessionHasErrors('agent_id');

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), ['agent_id' => $enAttente->id])
            ->assertSessionHasErrors('agent_id');
    }

    public function test_replacing_requires_choosing_one_of_the_two_paths(): void
    {
        $consignataire = $this->societeAvecDeuxAgents();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), [])
            ->assertSessionHasErrors('agent_id');

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), [
                'agent_id' => $consignataire->agents->firstWhere('name', 'Paul Ndong')->id,
                'titulaire_first_name' => 'Estelle',
                'titulaire_last_name' => 'Mengue',
                'titulaire_email' => 'e.mengue@transit-ogooue.ga',
            ])
            ->assertSessionHasErrors('titulaire_email');
    }

    public function test_replacing_a_holder_requires_the_client_accounts_permission(): void
    {
        $superviseur = User::factory()->create();
        $superviseur->assignRole(Profil::Superviseur->value);

        $consignataire = $this->societeAvecDeuxAgents();

        $this->actingAs($superviseur)
            ->patch(route('admin.utilisateurs.consignataires.titulaire', $consignataire), [
                'agent_id' => $consignataire->agents->firstWhere('name', 'Paul Ndong')->id,
            ])
            ->assertForbidden();
    }

    public function test_the_page_offers_the_other_validated_agents_as_successors(): void
    {
        $consignataire = $this->societeAvecDeuxAgents();
        User::factory()->agentDe($consignataire)->create(['name' => 'Léon Mbadinga']);

        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                // Le titulaire en place et l'agent en attente sont écartés :
                // on ne se remplace pas soi-même, et on ne promeut pas une
                // demande non tranchée.
                ->count('consignataires.0.agents_eligibles', 1)
                ->where('consignataires.0.agents_eligibles.0.value', $consignataire->agents->firstWhere('name', 'Paul Ndong')->id)
            );
    }
}
