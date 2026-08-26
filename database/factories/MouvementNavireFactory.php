<?php

namespace Database\Factories;

use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MouvementNavire>
 */
class MouvementNavireFactory extends Factory
{
    protected $model = MouvementNavire::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'port_id' => Port::factory(),
            'navire_id' => Navire::factory(),
            'voyage' => fake()->unique()->numerify('26-###').fake()->randomElement(['N', 'S', '']),
            'sens' => fake()->randomElement(SensTrafic::cases()),
            // Le jalon d'entrée : aucune date n'est encore due, la ligne est
            // cohérente sans qu'on ait à lui en fournir.
            'statut' => StatutNavire::Attendu,
            'poste_quai_id' => null,
            'eta' => null,
            'etd' => null,
            'consignataire_id' => null,
            'publiee_at' => null,
            'publiee_par' => null,
        ];
    }

    /** Un navire à quai : la date d'accostage est due, elle accompagne l'état. */
    public function aQuai(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutNavire::Quai,
            'eta' => now()->subDay(),
        ]);
    }

    /** Une escale terminée — le verrou export est ouvert. */
    public function sorti(): static
    {
        return $this->state(fn (array $attributes) => [
            'statut' => StatutNavire::Sorti,
            'eta' => now()->subDays(3),
            'etd' => now()->subHours(6),
        ]);
    }

    /** Déjà validée par un supérieur, donc visible du dehors (ADR-0013). */
    public function publiee(): static
    {
        return $this->state(fn (array $attributes) => ['publiee_at' => now()]);
    }
}
