<?php

namespace Database\Factories;

use App\Models\Pays;
use App\Models\Port;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Port>
 */
class PortFactory extends Factory
{
    protected $model = Port::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->city(),
            'code' => strtoupper(fake()->unique()->lexify('?????')),
            'pays_id' => Pays::factory(),
            'prefixe_numerotation' => null,
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
