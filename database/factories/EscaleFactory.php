<?php

namespace Database\Factories;

use App\Enums\EtapeDossier;
use App\Enums\SensTrafic;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\Navire;
use App\Models\Port;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Escale>
 */
class EscaleFactory extends Factory
{
    protected $model = Escale::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // La référence d'ADR-0008, dans sa forme réelle : le préfixe de test
            // évite de dépendre du port tiré, dont le préfixe peut être nul.
            'reference' => 'ESC-TST-26-'.fake()->unique()->numerify('####'),
            // Pas encore de manifeste : le numéro affiché reste provisoire.
            'numero_affiche' => null,
            'consignataire_id' => Consignataire::factory(),
            'navire_id' => Navire::factory(),
            'voyage' => fake()->unique()->numerify('26-###').fake()->randomElement(['N', 'S', '']),
            'sens' => fake()->randomElement(SensTrafic::cases()),
            'port_id' => Port::factory(),
            'poste_quai_id' => null,
            'eta_prevue' => null,
            'mouvement_navire_id' => null,
            'etape' => EtapeDossier::Ouvert,
            'montant_liquide' => null,
            'ouvert_le' => now(),
        ];
    }

    /**
     * Un dossier arrivé au bout du circuit : il porte son n° de manifeste figé
     * et son montant liquidé, les deux seules choses qui distinguent vraiment
     * un dossier clos d'un dossier qui s'ouvre.
     */
    public function cloture(): static
    {
        return $this->state(fn (array $attributes): array => [
            'etape' => EtapeDossier::Cloture,
            'numero_affiche' => fake()->unique()->numerify('2026 M #####'),
            'numero_fige_le' => now()->subDays(3),
            'montant_liquide' => fake()->numberBetween(800, 9000) * 1000,
        ]);
    }

    /** À l'étape que l'on veut regarder — les filtres et pastilles s'y prêtent. */
    public function etape(EtapeDossier $etape): static
    {
        return $this->state(fn (array $attributes): array => ['etape' => $etape]);
    }
}
