<?php

namespace Database\Factories;

use App\Models\Armement;
use App\Models\Pays;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Armement>
 */
class ArmementFactory extends Factory
{
    protected $model = Armement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'sigle' => strtoupper(fake()->lexify('???')),
            'pays_origine_id' => Pays::factory(),
            'pays_immatriculation_id' => null,
            'gerant' => fake()->name(),
            'rccm_nif' => fake()->numerify('RCCM-######'),
            'adresse' => fake()->address(),
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
