<?php

namespace Tests\Feature\Admin;

use App\Enums\Profil;
use App\Enums\SensTrafic;
use App\Models\BaremeLigne;
use App\Models\User;
use Database\Seeders\BaremeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Le barème CDTS (ADR-0034).
 *
 * Ce que ces tests protègent : le franc est la seule valeur saisie, l'euro n'en
 * est qu'une lecture, et la grille n'appartient qu'à l'Administrateur. Sans eux,
 * une parité recopiée à la main ou une permission relâchée changerait ce que le
 * port facture sans que rien ne le signale.
 */
class BaremeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function ligne(array $remplace = []): array
    {
        return array_merge([
            'reference' => 'EXP30',
            'sens' => SensTrafic::Export->value,
            'designation' => 'MARCHANDISE DE TEST',
            'nomenclature' => '01',
            'montant_cfa' => 1312,
        ], $remplace);
    }

    // ── La conversion ─────────────────────────────────────────────

    /**
     * Les montants du document officiel, franc puis euro. Si la parité bougeait
     * dans la configuration, ces couples cesseraient de tomber juste.
     *
     * @return array<string, array{float, float}>
     */
    public static function montants(): array
    {
        return [
            'EXP01 — conventionnel' => [1589.51, 2.42],
            'EXP03 — conteneur 20 frigo' => [26605.61, 40.56],
            'EXP11 — conteneur 45 sec' => [35264.0, 53.76],
            'EXP19 — vrac solide cubage' => [655.96, 1.00],
            'IMP012 — conteneur 45 frigo' => [39672.0, 60.48],
            'EXP07 — ligne à zéro' => [0.0, 0.00],
        ];
    }

    #[DataProvider('montants')]
    public function test_l_euro_se_deduit_du_franc_au_centime_pres(float $cfa, float $euro): void
    {
        $ligne = new BaremeLigne(['montant_cfa' => $cfa]);

        $this->assertSame($euro, $ligne->montantEuro());
    }

    public function test_l_euro_n_est_pas_une_colonne(): void
    {
        $this->assertFalse(
            in_array('montant_euro', Schema::getColumnListing('bareme_lignes'), true),
            "L'euro est une lecture du franc, pas une seconde vérité à tenir à jour.",
        );
    }

    // ── Le barème en vigueur ──────────────────────────────────────

    public function test_le_seeder_pose_les_deux_volets_du_document(): void
    {
        $this->seed(BaremeSeeder::class);

        $this->assertSame(30, BaremeLigne::where('sens', SensTrafic::Export)->count());
        $this->assertSame(28, BaremeLigne::where('sens', SensTrafic::Import)->count());
    }

    public function test_le_seeder_est_idempotent_et_ne_perd_pas_les_ajouts(): void
    {
        $this->seed(BaremeSeeder::class);

        $ajoutee = BaremeLigne::create($this->ligne(['reference' => 'EXP99']));
        BaremeLigne::where('reference', 'EXP01')->update(['montant_cfa' => 1]);

        $this->seed(BaremeSeeder::class);

        $this->assertSame(59, BaremeLigne::count());
        $this->assertNotNull($ajoutee->fresh());
        // Le seeder fait autorité sur ce qu'il connaît : le montant bidouillé
        // revient à celui du document.
        $this->assertSame('1589.51', BaremeLigne::firstWhere('reference', 'EXP01')->montant_cfa);
    }

    // ── Qui y touche ──────────────────────────────────────────────

    public function test_le_superviseur_n_atteint_pas_le_bareme(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get(route('admin.bareme'))
            ->assertForbidden();
    }

    public function test_le_superviseur_ne_voit_pas_le_bareme_dans_son_rail(): void
    {
        $this->actingAs($this->interne(Profil::Superviseur))
            ->get(route('admin.utilisateurs.index'))
            ->assertInertia(fn ($page) => $page
                ->where('admin.modules', fn ($modules): bool => ! collect($modules)->contains('bareme'))
                ->where('admin.modules', fn ($modules): bool => collect($modules)->contains('users'))
            );
    }

    public function test_l_administrateur_voit_la_grille_avec_les_deux_montants(): void
    {
        $this->seed(BaremeSeeder::class);

        $this->actingAs($this->interne(Profil::Administrateur))
            ->get(route('admin.bareme'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('lignes', 58)
                ->where('lignes', fn ($lignes): bool => collect($lignes)->firstWhere('reference', 'EXP03')['montant_euro'] === 40.56)
                // Les deux volets sont donnés dans l'ordre du document.
                ->where('sens', fn ($sens): bool => collect($sens)->pluck('value')->all() === ['export', 'import'])
            );
    }

    // ── Les écritures ─────────────────────────────────────────────

    public function test_l_administrateur_ajoute_une_ligne(): void
    {
        $this->actingAs($this->interne(Profil::Administrateur))
            ->post(route('admin.bareme.store'), $this->ligne())
            ->assertRedirect(route('admin.bareme'));

        $this->assertSame(SensTrafic::Export, BaremeLigne::firstWhere('reference', 'EXP30')->sens);
    }

    public function test_la_reference_est_normalisee_en_majuscules(): void
    {
        $this->actingAs($this->interne(Profil::Administrateur))
            ->post(route('admin.bareme.store'), $this->ligne(['reference' => ' exp30 ']))
            ->assertSessionHasNoErrors();

        $this->assertNotNull(BaremeLigne::firstWhere('reference', 'EXP30'));
    }

    public function test_deux_lignes_ne_partagent_pas_une_reference(): void
    {
        BaremeLigne::create($this->ligne());

        $this->actingAs($this->interne(Profil::Administrateur))
            ->post(route('admin.bareme.store'), $this->ligne(['designation' => 'AUTRE CHOSE']))
            ->assertSessionHasErrors('reference');

        $this->assertSame(1, BaremeLigne::count());
    }

    public function test_une_nomenclature_hors_format_est_refusee(): void
    {
        $this->actingAs($this->interne(Profil::Administrateur))
            ->post(route('admin.bareme.store'), $this->ligne(['nomenclature' => '3']))
            ->assertSessionHasErrors('nomenclature');
    }

    public function test_le_montant_change_et_l_euro_suit(): void
    {
        $ligne = BaremeLigne::create($this->ligne());

        $this->actingAs($this->interne(Profil::Administrateur))
            ->patch(route('admin.bareme.update', $ligne), $this->ligne(['montant_cfa' => 26605.61]))
            ->assertRedirect(route('admin.bareme'));

        $this->assertSame(40.56, $ligne->fresh()->montantEuro());
    }

    public function test_modifier_une_ligne_sans_changer_sa_reference_ne_bute_pas_sur_l_unicite(): void
    {
        $ligne = BaremeLigne::create($this->ligne());

        $this->actingAs($this->interne(Profil::Administrateur))
            ->patch(route('admin.bareme.update', $ligne), $this->ligne(['designation' => 'LIBELLE CORRIGE']))
            ->assertSessionHasNoErrors();

        $this->assertSame('LIBELLE CORRIGE', $ligne->fresh()->designation);
    }

    public function test_une_ligne_se_desactive_sans_quitter_la_grille(): void
    {
        $ligne = BaremeLigne::create($this->ligne());
        $administrateur = $this->interne(Profil::Administrateur);

        $this->actingAs($administrateur)
            ->patch(route('admin.bareme.activation', $ligne))
            ->assertRedirect(route('admin.bareme'));

        $this->assertFalse($ligne->fresh()->actif);
        // Elle reste visible du CGC — c'est l'exploitation qui ne la verra plus.
        $this->assertNotNull($ligne->fresh());

        $this->actingAs($administrateur)->patch(route('admin.bareme.activation', $ligne));

        $this->assertTrue($ligne->fresh()->actif);
    }

    public function test_le_seeder_ne_reactive_pas_une_ligne_ecartee_par_le_cgc(): void
    {
        $this->seed(BaremeSeeder::class);
        BaremeLigne::where('reference', 'EXP07')->update(['actif' => false]);

        $this->seed(BaremeSeeder::class);

        $this->assertFalse(BaremeLigne::firstWhere('reference', 'EXP07')->actif);
    }

    public function test_le_superviseur_ne_desactive_pas_une_ligne(): void
    {
        $ligne = BaremeLigne::create($this->ligne());

        $this->actingAs($this->interne(Profil::Superviseur))
            ->patch(route('admin.bareme.activation', $ligne))
            ->assertForbidden();

        $this->assertTrue($ligne->fresh()->actif);
    }

    public function test_l_administrateur_supprime_une_ligne(): void
    {
        $ligne = BaremeLigne::create($this->ligne());

        $this->actingAs($this->interne(Profil::Administrateur))
            ->delete(route('admin.bareme.destroy', $ligne))
            ->assertRedirect(route('admin.bareme'));

        $this->assertNull($ligne->fresh());
    }

    public function test_le_superviseur_n_ecrit_pas_dans_le_bareme(): void
    {
        $ligne = BaremeLigne::create($this->ligne());
        $superviseur = $this->interne(Profil::Superviseur);

        $this->actingAs($superviseur)->post(route('admin.bareme.store'), $this->ligne(['reference' => 'EXP31']))->assertForbidden();
        $this->actingAs($superviseur)->patch(route('admin.bareme.update', $ligne), $this->ligne(['montant_cfa' => 1]))->assertForbidden();
        $this->actingAs($superviseur)->delete(route('admin.bareme.destroy', $ligne))->assertForbidden();

        $this->assertSame('1312.00', $ligne->fresh()->montant_cfa);
    }
}
