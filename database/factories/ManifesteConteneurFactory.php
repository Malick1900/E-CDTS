<?php

namespace Database\Factories;

use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ManifesteConteneur>
 */
class ManifesteConteneurFactory extends Factory
{
    protected $model = ManifesteConteneur::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $taille = fake()->randomElement([20, 40, 40, 45]);

        return [
            'manifeste_bl_id' => ManifesteBl::factory(),
            // Forme ISO 6346 : quatre lettres, six chiffres, une clé.
            'reference' => fake()->randomElement(['GABU', 'OCLU', 'ATWU', 'MRXU']).fake()->unique()->numerify('######').fake()->numberBetween(0, 9),
            'taille' => $taille,
            'colis' => fake()->numberBetween(1, 400),
            'plein' => true,
            // Un 40′ sec pèse ~3 800 kg à vide, un frigo ~4 600.
            'tare_kg' => $taille === 20 ? fake()->numberBetween(2_100, 2_400) : fake()->numberBetween(3_700, 3_900),
            'type_marchandise' => null,
        ];
    }
}
