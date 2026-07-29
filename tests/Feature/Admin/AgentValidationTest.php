<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\User;
use App\Notifications\CompteAgentRefuse;
use App\Notifications\CompteAgentValide;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Tests\TestCase;

/**
 * Circuit de validation des comptes agents consignataires (ADR-0013) : la
 * société crée, le CGC statue. Ce que ces tests protègent avant tout, c'est la
 * trace — un compte refusé reste en base avec qui a décidé, quand et pourquoi
 * (ADR-0024) — et la portée : un agent n'opère que sur les armements de sa
 * propre société (ADR-0009).
 */
class AgentValidationTest extends TestCase
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

    private function agent(?Consignataire $consignataire = null): User
    {
        return User::factory()
            ->agentDe($consignataire ?? Consignataire::factory()->create())
            ->create();
    }

    // ── Validation ────────────────────────────────────────────────

    public function test_validating_an_agent_activates_it_and_records_who_decided(): void
    {
        $agent = $this->agent();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.agents.validation', $agent))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $agent->refresh();

        $this->assertSame(StatutValidation::Valide, $agent->statut_validation);
        $this->assertTrue($agent->is_active, "Un compte validé peut se connecter — c'est `is_active` qui l'autorise.");
        $this->assertSame($admin->id, $agent->valide_par_user_id);
        $this->assertNotNull($agent->valide_le);
    }

    public function test_validating_an_already_validated_agent_is_rejected(): void
    {
        $admin = $this->admin();
        $agent = $this->agent();
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.agents.validation', $agent))
            ->assertSessionHasErrors('statut_validation');
    }

    public function test_deciding_on_a_client_account_requires_the_client_accounts_permission(): void
    {
        $superviseur = User::factory()->create();
        $superviseur->assignRole(Profil::Superviseur->value);

        $this->actingAs($superviseur)
            ->patch(route('admin.utilisateurs.agents.validation', $this->agent()))
            ->assertForbidden();
    }

    public function test_internal_accounts_are_not_reachable_through_the_agent_routes(): void
    {
        $interne = User::factory()->create();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.validation', $interne))
            ->assertNotFound();
    }

    // ── Refus ─────────────────────────────────────────────────────

    public function test_refusing_an_agent_keeps_the_account_with_its_reason(): void
    {
        $agent = $this->agent();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.agents.refus', $agent), [
                'motif_refus' => 'Fonction déclarée sans rapport avec la consignation.',
            ])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $agent->refresh();

        $this->assertSame(StatutValidation::Refuse, $agent->statut_validation);
        $this->assertFalse($agent->is_active);
        $this->assertSame($admin->id, $agent->valide_par_user_id);
        $this->assertSame('Fonction déclarée sans rapport avec la consignation.', $agent->motif_refus);
        // Le compte refusé demeure en base : c'est la trace opposable.
        $this->assertDatabaseHas('users', ['id' => $agent->id]);
    }

    public function test_a_refusal_requires_a_reason(): void
    {
        $agent = $this->agent();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.refus', $agent), ['motif_refus' => ''])
            ->assertSessionHasErrors('motif_refus');

        $this->assertSame(StatutValidation::EnAttente, $agent->refresh()->statut_validation);
    }

    public function test_only_a_pending_request_can_be_refused(): void
    {
        $agent = $this->agent();
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.refus', $agent), ['motif_refus' => 'Trop tard.'])
            ->assertSessionHasErrors('statut_validation');
    }

    // ── Nouvelle soumission ───────────────────────────────────────

    public function test_a_refused_account_can_be_submitted_again_without_losing_the_previous_decision(): void
    {
        $admin = $this->admin();
        $agent = $this->agent();
        $agent->update([
            'statut_validation' => StatutValidation::Refuse,
            'valide_par_user_id' => $admin->id,
            'valide_le' => now(),
            'motif_refus' => 'Pièce justificative manquante.',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.utilisateurs.agents.reexamen', $agent))
            ->assertRedirect(route('admin.utilisateurs.index'));

        $agent->refresh();

        $this->assertSame(StatutValidation::EnAttente, $agent->statut_validation);
        $this->assertFalse($agent->is_active);
        $this->assertSame('Pièce justificative manquante.', $agent->motif_refus, 'La décision précédente reste lisible tant qu\'aucune autre ne la remplace.');
    }

    public function test_validating_after_a_new_submission_clears_the_previous_reason(): void
    {
        $admin = $this->admin();
        $agent = $this->agent();
        $agent->update(['motif_refus' => 'Pièce justificative manquante.']);

        $this->actingAs($admin)->patch(route('admin.utilisateurs.agents.validation', $agent));

        $this->assertNull($agent->refresh()->motif_refus);
    }

    public function test_only_a_refused_account_can_be_submitted_again(): void
    {
        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.reexamen', $this->agent()))
            ->assertSessionHasErrors('statut_validation');
    }

    // ── Suspension ────────────────────────────────────────────────

    public function test_a_validated_account_can_be_suspended_and_resumed(): void
    {
        $admin = $this->admin();
        $agent = $this->agent();
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $this->actingAs($admin)->patch(route('admin.utilisateurs.agents.activation', $agent));
        $this->assertFalse($agent->refresh()->is_active);

        $this->actingAs($admin)->patch(route('admin.utilisateurs.agents.activation', $agent));
        $this->assertTrue($agent->refresh()->is_active);
    }

    public function test_a_pending_account_cannot_be_activated_directly(): void
    {
        $agent = $this->agent();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.activation', $agent))
            ->assertSessionHasErrors('statut_validation');

        $this->assertFalse($agent->refresh()->is_active, "L'activation passe par la validation du CGC, jamais par un raccourci.");
    }

    // ── Portée (ADR-0009) ─────────────────────────────────────────

    public function test_scope_is_limited_to_the_armements_represented_by_the_company(): void
    {
        $consignataire = Consignataire::factory()->create();
        [$represente, $autre] = Armement::factory()->count(2)->create()->all();
        $consignataire->armements()->sync([$represente->id]);

        $agent = $this->agent($consignataire);
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.affectations', $agent), ['armement_ids' => [$represente->id, $autre->id]])
            ->assertSessionHasErrors('armement_ids.1');

        $this->assertCount(0, $agent->refresh()->armements, 'Un identifiant hors périmètre fait échouer la requête entière, il n\'est pas ignoré en silence.');
    }

    public function test_scope_synchronises_in_both_directions(): void
    {
        $consignataire = Consignataire::factory()->create();
        [$retire, $conserve, $ajoute] = Armement::factory()->count(3)->create()->all();
        $consignataire->armements()->sync([$retire->id, $conserve->id, $ajoute->id]);

        $agent = $this->agent($consignataire);
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);
        $agent->armements()->sync([$retire->id, $conserve->id]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.affectations', $agent), ['armement_ids' => [$conserve->id, $ajoute->id]])
            ->assertRedirect(route('admin.utilisateurs.index'));

        $this->assertEqualsCanonicalizing([$conserve->id, $ajoute->id], $agent->refresh()->armements->pluck('id')->all());
    }

    public function test_a_pending_account_receives_no_scope(): void
    {
        $consignataire = Consignataire::factory()->create();
        $armement = Armement::factory()->create();
        $consignataire->armements()->sync([$armement->id]);

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.affectations', $this->agent($consignataire)), ['armement_ids' => [$armement->id]])
            ->assertSessionHasErrors('statut_validation');
    }

    // ── Connexion ─────────────────────────────────────────────────

    public function test_an_agent_awaiting_validation_cannot_log_in(): void
    {
        $agent = $this->agent();

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'password']);

        $this->assertGuest();
    }

    public function test_a_refused_agent_cannot_log_in(): void
    {
        $agent = $this->agent();
        $agent->update(['statut_validation' => StatutValidation::Refuse]);

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'password']);

        $this->assertGuest();
    }

    // ── Information des intéressés ────────────────────────────────

    public function test_a_decision_reaches_the_agent_the_account_holder_and_the_company(): void
    {
        NotificationFacade::fake();

        $consignataire = Consignataire::factory()->create(['email' => 'contact@saga-gabon.ga']);
        $titulaire = $this->agent($consignataire);
        $titulaire->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);
        $consignataire->titulaire()->associate($titulaire)->save();

        $agent = $this->agent($consignataire);

        $this->actingAs($this->admin())->patch(route('admin.utilisateurs.agents.validation', $agent));

        NotificationFacade::assertSentTo($agent, CompteAgentValide::class);
        NotificationFacade::assertSentTo($titulaire, CompteAgentValide::class);
        NotificationFacade::assertSentOnDemand(
            CompteAgentValide::class,
            fn (CompteAgentValide $notification, array $canaux, object $destinataire): bool => $destinataire->routes['mail'] === 'contact@saga-gabon.ga',
        );
    }

    public function test_a_refusal_carries_its_reason_to_the_same_people(): void
    {
        NotificationFacade::fake();

        $agent = $this->agent();

        $this->actingAs($this->admin())
            ->patch(route('admin.utilisateurs.agents.refus', $agent), ['motif_refus' => 'Pièce justificative manquante.']);

        NotificationFacade::assertSentTo($agent, CompteAgentRefuse::class);
    }

    public function test_a_holder_who_is_also_the_company_contact_is_mailed_once(): void
    {
        NotificationFacade::fake();

        $titulaire = $this->agent();
        $titulaire->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $consignataire = $titulaire->consignataire;
        $consignataire->titulaire()->associate($titulaire);
        // Le titulaire est aussi le contact de la société — cas fréquent dans
        // les petites structures.
        $consignataire->update(['email' => $titulaire->email]);

        $agent = $this->agent($consignataire);

        $this->actingAs($this->admin())->patch(route('admin.utilisateurs.agents.validation', $agent));

        NotificationFacade::assertSentTimes(CompteAgentValide::class, 2);
    }

    public function test_a_decision_is_still_notified_when_the_company_has_no_contact_address(): void
    {
        NotificationFacade::fake();

        $consignataire = Consignataire::factory()->create(['email' => null]);
        $agent = $this->agent($consignataire);

        $this->actingAs($this->admin())->patch(route('admin.utilisateurs.agents.validation', $agent));

        NotificationFacade::assertSentTo($agent, CompteAgentValide::class);
        NotificationFacade::assertSentTimes(CompteAgentValide::class, 1);
    }

    // ── Projection et décompte ────────────────────────────────────

    public function test_the_users_page_separates_internal_accounts_from_client_accounts(): void
    {
        $admin = $this->admin();
        $consignataire = Consignataire::factory()->create();
        $armement = Armement::factory()->create();
        $consignataire->armements()->sync([$armement->id]);

        $agent = $this->agent($consignataire);
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);
        $agent->armements()->sync([$armement->id]);

        $this->actingAs($admin)
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->count('agents', 1)
                ->where('agents.0.statut', 'actif')
                ->where('agents.0.consignataire_name', $consignataire->name)
                ->where('agents.0.armements.0.name', $armement->name)
                ->where('agents.0.armements_societe.0.id', $armement->id)
                ->where('users', fn ($users): bool => collect($users)->doesntContain('id', $agent->id))
            );
    }

    public function test_a_suspended_account_is_reported_as_deactivated_not_refused(): void
    {
        $agent = $this->agent();
        $agent->update(['statut_validation' => StatutValidation::Valide, 'is_active' => false]);

        $this->actingAs($this->admin())
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page->where('agents.0.statut', 'desactive'));
    }

    public function test_the_pending_count_is_shared_with_every_admin_screen(): void
    {
        $this->agent();
        $this->agent();
        $validee = $this->agent();
        $validee->update(['statut_validation' => StatutValidation::Valide, 'is_active' => true]);

        $this->actingAs($this->admin())
            ->get(route('admin.referentiels'))
            ->assertInertia(fn ($page) => $page->where('admin.agentsAValider', 2));
    }

    public function test_the_pending_count_stays_at_zero_without_the_client_accounts_permission(): void
    {
        $this->agent();

        $superviseur = User::factory()->create();
        $superviseur->assignRole(Profil::Superviseur->value);

        $this->actingAs($superviseur)
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page->where('admin.agentsAValider', 0));
    }
}
