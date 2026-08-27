<?php

namespace Database\Factories;

use App\Enums\EtatManifeste;
use App\Enums\ModeSaisieManifeste;
use App\Models\Escale;
use App\Models\Manifeste;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Manifeste>
 */
class ManifesteFactory extends Factory
{
    protected $model = Manifeste::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'escale_id' => Escale::factory(),
            // Sans numéro : e-CDTS l'attribue quand le manifeste est acquis —
            // au dépôt en import, à la transmission en saisie (ADR-0046).
            'numero' => null,
            'mode_saisie' => ModeSaisieManifeste::Xml,
            'etat' => EtatManifeste::Brouillon,
            'piece_jointe_chemin' => null,
            'piece_jointe_nom' => null,
            'piece_jointe_octets' => null,
            'transmis_le' => null,
        ];
    }

    /** Saisi à la main : le PDF probant accompagne alors le manifeste. */
    public function manuel(): static
    {
        return $this->state(fn (array $attributes): array => [
            'mode_saisie' => ModeSaisieManifeste::Manuel,
            'piece_jointe_chemin' => 'manifestes/'.fake()->uuid().'.pdf',
            'piece_jointe_nom' => 'Manifeste_'.fake()->bothify('??####').'.pdf',
            'piece_jointe_octets' => fake()->numberBetween(200_000, 6_000_000),
        ]);
    }

    /**
     * Parti au CGC — plus rien ne bouge côté consignataire, et le numéro est
     * acquis : la forme réelle d'un n° gabonais, « 2026 M 12429 ».
     */
    public function transmis(): static
    {
        return $this->state(fn (array $attributes): array => [
            'etat' => EtatManifeste::Transmis,
            'transmis_le' => now(),
            'numero' => '2026 M '.fake()->unique()->numerify('#####'),
        ]);
    }

    /** Déjà numéroté, sans être parti — l'état d'un manifeste importé. */
    public function numerote(): static
    {
        return $this->state(fn (array $attributes): array => [
            'numero' => '2026 M '.fake()->unique()->numerify('#####'),
        ]);
    }
}
