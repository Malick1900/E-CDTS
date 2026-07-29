<?php

namespace Database\Factories;

use App\Models\Consignataire;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Consignataire>
 */
class ConsignataireFactory extends Factory
{
    protected $model = Consignataire::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'sigle' => strtoupper(fake()->lexify('???')),
            'rccm_nif' => fake()->numerify('RCCM-######'),
            'pays_immatriculation_id' => null,
            'adresse' => fake()->address(),
            'telephone' => fake()->numerify('+241 ## ## ## ##'),
            'email' => fake()->companyEmail(),
            'titulaire_user_id' => null,
            'actif' => true,
        ];
    }

    public function inactif(): static
    {
        return $this->state(fn (array $attributes) => ['actif' => false]);
    }
}
