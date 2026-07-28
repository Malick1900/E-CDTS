<?php

namespace Database\Factories;

use App\Models\Pays;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pays>
 */
class PaysFactory extends Factory
{
    protected $model = Pays::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->country(),
            'code' => strtoupper(fake()->unique()->lexify('??')),
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
