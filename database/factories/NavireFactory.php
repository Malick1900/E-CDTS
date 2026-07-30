<?php

namespace Database\Factories;

use App\Enums\ModeExploitation;
use App\Models\Armement;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\TypeNavire;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Navire>
 */
class NavireFactory extends Factory
{
    protected $model = Navire::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucwords(fake()->word().' '.fake()->word()),
            'imo' => (string) fake()->unique()->numerify('9######'),
            'pays_id' => Pays::factory(),
            'type_navire_id' => TypeNavire::factory(),
            'armement_id' => Armement::factory(),
            'mode_exploitation_defaut' => fake()->randomElement(ModeExploitation::cases()),
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
