<?php

namespace Tests\Feature;

use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Models\Consignataire;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * La navigation de la coquille d'activité (ADR-0030).
 *
 * Ce que ces tests protègent : une entrée de menu vaut une permission, et la
 * navigation ne promet rien qu'elle ne tienne. Sans eux, une composition de rôle
 * modifiée ailleurs viderait un menu — ou en ouvrirait un — sans que rien ne le
 * signale, l'écran se contentant de ne pas afficher la ligne.
 */
class NavigationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * Les entrées visibles par ce compte, dans l'ordre : clé => destination.
     *
     * @return array<string, string>
     */
    private function nav(User $user): array
    {
        $nav = [];

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(function (AssertableInertia $page) use (&$nav): void {
                $nav = collect($page->toArray()['props']['coquille']['navigation'])
                    ->pluck('href', 'key')
                    ->all();
            });

        return $nav;
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    /**
     * Une société et son compte maître, validé — l'état d'un compte qui navigue.
     */
    private function societe(): Consignataire
    {
        $consignataire = Consignataire::factory()->create();

        $titulaire = User::factory()
            ->agentDe($consignataire)
            ->valide($this->interne(Profil::Administrateur))
            ->create();
        $titulaire->syncRoles([RoleClient::Titulaire->value]);
        $consignataire->titulaire()->associate($titulaire)->save();

        return $consignataire;
    }

    private function agentDe(Consignataire $consignataire): User
    {
        $agent = User::factory()
            ->agentDe($consignataire)
            ->valide($this->interne(Profil::Administrateur))
            ->create();
        $agent->syncRoles([RoleClient::Agent->value]);

        return $agent;
    }

    // ── De la connexion à la navigation ───────────────────────────

    /**
     * Le parcours entier, sans raccourci d'authentification : ADR-0030 ne
     * redirige personne selon son type de compte, c'est la navigation qui
     * change. Un consignataire ouvre la plateforme et il est chez lui.
     */
    public function test_un_titulaire_se_connecte_et_atterrit_sur_sa_propre_navigation(): void
    {
        $consignataire = $this->societe();
        $titulaire = $consignataire->titulaire;

        $this->post(route('login.store'), ['email' => $titulaire->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($titulaire);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('coquille.navigation', 5)
                ->where('coquille.contexte.societe', $consignataire->name)
            );
    }

    public function test_un_agent_se_connecte_et_n_a_que_ses_trois_entrees(): void
    {
        $agent = $this->agentDe($this->societe());

        $this->post(route('login.store'), ['email' => $agent->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('coquille.navigation', 3));
    }

    // ── Comptes clients ───────────────────────────────────────────

    public function test_le_titulaire_voit_les_quatre_ecrans_et_l_espace_de_sa_societe(): void
    {
        $nav = $this->nav($this->societe()->titulaire);

        $this->assertSame(
            ['dashboard', 'situation-portuaire', 'dossiers', 'devis', 'administration'],
            array_keys($nav),
        );
        // Son « Administration », c'est sa société — jamais le panneau du CGC.
        $this->assertSame('/mon-espace', $nav['administration']);
    }

    public function test_l_agent_ne_voit_ni_les_devis_ni_l_administration(): void
    {
        $nav = $this->nav($this->agentDe($this->societe()));

        $this->assertSame(['dashboard', 'situation-portuaire', 'dossiers'], array_keys($nav));
    }

    // ── Comptes internes ──────────────────────────────────────────

    public function test_l_administrateur_va_vers_le_panneau_du_cgc(): void
    {
        $nav = $this->nav($this->interne(Profil::Administrateur));

        $this->assertSame(
            ['dashboard', 'situation-portuaire', 'dossiers', 'devis', 'administration'],
            array_keys($nav),
        );
        $this->assertSame('/admin/utilisateurs', $nav['administration']);
    }

    public function test_le_conferencier_n_a_que_la_situation_portuaire(): void
    {
        $this->assertSame(
            ['dashboard', 'situation-portuaire'],
            array_keys($this->nav($this->interne(Profil::Conferencier))),
        );
    }

    public function test_le_consultant_n_a_que_le_tableau_de_bord(): void
    {
        // Son écran, ce sont les statistiques ; elles n'existent pas encore.
        $this->assertSame(['dashboard'], array_keys($this->nav($this->interne(Profil::Consultant))));
    }

    // ── Contexte et qualité ───────────────────────────────────────

    public function test_la_carte_de_contexte_ne_s_affiche_que_pour_un_compte_client(): void
    {
        $consignataire = $this->societe();

        $this->actingAs($consignataire->titulaire)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('coquille.contexte.societe', $consignataire->name)
                ->where('coquille.qualite', $consignataire->name)
            );

        // Un interne du CGC n'est chez personne : pas de carte. Sa puce annonce
        // son profil, qui lui dit quels écrans lui sont ouverts.
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('coquille.contexte', null)
                ->where('coquille.qualite', 'Superviseur')
            );
    }

    // ── La nav ne promet rien qu'elle ne tienne ───────────────────

    public function test_un_ecran_absent_de_la_nav_est_aussi_refuse_en_direct(): void
    {
        $agent = $this->agentDe($this->societe());

        // Les devis ne figurent pas à son menu ; l'URL tapée à la main est
        // refusée de la même façon (ADR-0030 : le 403 est le filet, pas le mode
        // de fonctionnement normal).
        $this->actingAs($agent)->get('/devis')->assertForbidden();
        $this->actingAs($agent)->get('/mon-espace')->assertForbidden();

        // Ce qu'il voit, il l'atteint.
        $this->actingAs($agent)->get('/dossiers')->assertOk();
    }
}
