<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * La langue de la plateforme.
 *
 * Ces vérifications existent parce que les tests d'authentification comparaient
 * le message d'échec à `__('auth.failed')` : ils passaient au vert quelle que
 * soit la langue rendue. L'écran de connexion a servi de l'anglais à des
 * consignataires gabonais sans qu'aucune suite ne bronche.
 *
 * On compare donc à la phrase française elle-même, jamais au helper de
 * traduction — c'est le rendu qui est en cause, pas la mécanique.
 */
class LangueTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_plateforme_parle_francais(): void
    {
        $this->assertSame('fr', app()->getLocale());
    }

    public function test_un_echec_de_connexion_se_lit_en_francais(): void
    {
        $this->post(route('login.store'), [
            'email' => 'inconnu@example.com',
            'password' => 'peu-importe',
        ])->assertSessionHasErrors([
            'email' => 'Ces identifiants ne correspondent à aucun compte.',
        ]);
    }

    /**
     * Une saisie refusée doit nommer le champ dans les mots de l'écran, pas
     * dans ceux de la table : « adresse de connexion », pas « email ».
     */
    public function test_une_saisie_refusee_se_lit_en_francais(): void
    {
        $this->actingAs(User::factory()->create())
            ->patch('/profil', ['first_name' => '', 'last_name' => 'Bongo', 'phone' => ''])
            ->assertSessionHasErrors([
                'first_name' => 'Le champ prénom est obligatoire.',
                'phone' => 'Le champ téléphone est obligatoire.',
            ]);
    }
}
