<?php

namespace Database\Factories;

use App\Models\TypeNavire;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TypeNavire>
 */
class TypeNavireFactory extends Factory
{
    protected $model = TypeNavire::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement([
                'Porte-conteneurs', 'Vraquier', 'Tanker', 'RoRo',
                'Cargo polyvalent', 'Remorqueur', 'Navire frigorifique',
            ]),
            'code' => strtoupper(fake()->unique()->lexify('????')),
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
