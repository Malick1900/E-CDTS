<?php

namespace Database\Factories;

use App\Enums\StatutValidation;
use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'name' => trim($firstName.' '.$lastName),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => fake()->numerify('+241 0# ## ## ##'),
            'job_title' => fake()->jobTitle(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'is_active' => true,
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Compte désactivé (ne peut plus se connecter).
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Compte agent d'une société consignataire, à son état d'entrée : en
     * attente de la validation du CGC, donc inactif (ADR-0013).
     */
    public function agentDe(Consignataire $consignataire): static
    {
        return $this->state(fn (array $attributes) => [
            'consignataire_id' => $consignataire->id,
            'statut_validation' => StatutValidation::EnAttente,
            'is_active' => false,
        ]);
    }

    /**
     * Compte agent validé par le CGC — à combiner avec `agentDe()`.
     */
    public function valide(User $valideur): static
    {
        return $this->state(fn (array $attributes) => [
            'statut_validation' => StatutValidation::Valide,
            'is_active' => true,
            'valide_par_user_id' => $valideur->id,
            'valide_le' => now(),
            'motif_refus' => null,
        ]);
    }

    /**
     * Compte agent refusé — à combiner avec `agentDe()`. Le compte demeure en
     * base : c'est la trace opposable d'ADR-0024.
     */
    public function refuse(User $valideur, string $motif = 'Fonction non justifiée par la société.'): static
    {
        return $this->state(fn (array $attributes) => [
            'statut_validation' => StatutValidation::Refuse,
            'is_active' => false,
            'valide_par_user_id' => $valideur->id,
            'valide_le' => now(),
            'motif_refus' => $motif,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
