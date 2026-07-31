<?php

namespace Tests\Feature\Auth;

use App\Enums\StatutValidation;
use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get(route('login'));

        $response->assertOk();
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('logout'));

        $response->assertRedirect(route('home'));

        $this->assertGuest();
    }

    // ── Ce que la connexion révèle de l'état du compte (ADR-0032) ──

    private function agent(): User
    {
        return User::factory()->agentDe(Consignataire::factory()->create())->create();
    }

    public function test_un_compte_en_attente_apprend_qu_il_est_en_attente()
    {
        $agent = $this->agent();

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => 'Votre compte est en cours de validation par le CGC. Vous recevrez un e-mail dès qu’il sera actif.']);

        $this->assertGuest();
    }

    public function test_un_compte_refuse_apprend_qu_il_est_refuse()
    {
        $agent = $this->agent();
        $agent->forceFill(['statut_validation' => StatutValidation::Refuse])->save();

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => 'Votre demande d’accès n’a pas été retenue. Rapprochez-vous du CGC.']);

        $this->assertGuest();
    }

    public function test_un_compte_desactive_apprend_qu_il_est_desactive()
    {
        $user = User::factory()->inactive()->create();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => 'Votre compte a été désactivé. Contactez votre administrateur.']);

        $this->assertGuest();
    }

    /**
     * Le cœur d'ADR-0032 : sans le mot de passe, le formulaire ne dit rien de
     * l'état du compte — ni même qu'il existe. Sinon il devient un annuaire.
     */
    public function test_sans_le_mot_de_passe_l_etat_du_compte_reste_tu()
    {
        $agent = $this->agent();

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'wrong-password'])
            ->assertSessionHasErrors(['email' => __('auth.failed')]);

        $this->post(route('login.store'), ['email' => 'inconnu@example.com', 'password' => 'password'])
            ->assertSessionHasErrors(['email' => __('auth.failed')]);

        $this->assertGuest();
    }

    public function test_users_are_rate_limited()
    {
        $user = User::factory()->create();

        RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertTooManyRequests();
    }
}
