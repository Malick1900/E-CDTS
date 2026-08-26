<?php

namespace Database\Factories;

use App\Models\Port;
use App\Models\PosteQuai;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PosteQuai>
 */
class PosteQuaiFactory extends Factory
{
    protected $model = PosteQuai::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'port_id' => Port::factory(),
            'code' => 'M'.fake()->unique()->numberBetween(1, 999),
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
