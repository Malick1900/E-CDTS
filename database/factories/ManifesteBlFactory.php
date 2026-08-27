<?php

namespace Database\Factories;

use App\Models\Manifeste;
use App\Models\ManifesteBl;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ManifesteBl>
 */
class ManifesteBlFactory extends Factory
{
    protected $model = ManifesteBl::class;

    /** Des ports de chargement plausibles, avec leur UN/LOCODE réel. */
    private const PORTS = [
        ['CNSHA', 'Shanghai'],
        ['NLRTM', 'Rotterdam'],
        ['BEANR', 'Anvers'],
        ['FRLEH', 'Le Havre'],
        ['ESVLC', 'Valence'],
        ['MACAS', 'Casablanca'],
        ['ZADUR', 'Durban'],
        ['AEJEA', 'Jebel Ali'],
        ['PTLIS', 'Lisbonne'],
        ['DEHAM', 'Hambourg'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $port = fake()->randomElement(self::PORTS);

        return [
            'manifeste_id' => Manifeste::factory(),
            'reference' => fake()->randomElement(['GABX', 'OCEA', 'ATLW', 'MERX']).'-26'.fake()->unique()->numerify('####'),
            'ligne_numero' => null,
            // Vide par défaut : un BL simple, pas un dégroupage.
            'master_reference' => null,
            'port_chargement' => $port[0],
            'port_chargement_nom' => $port[1],
            'port_dechargement' => 'GAOWE',
            'port_dechargement_nom' => 'Owendo',
            'expediteur' => fake()->randomElement(['COFCO International', 'Wilmar Trading Pte', 'Olam International', 'BASF SE', 'Holcim Trading SA']),
            'destinataire' => fake()->randomElement(['CECA-GADIS', 'SOBRAGA', 'CIMAF Gabon', 'Olam Agri Gabon', 'SMAG']),
            'description' => fake()->randomElement(['Riz blanc en sacs de 25 kg', 'Farine de blé', 'Carreaux céramiques', 'Pièces détachées automobiles', 'Conserves alimentaires']),
            'poids_brut_kg' => fake()->numberBetween(8_000, 120_000),
            'volume_m3' => fake()->numberBetween(20, 160),
            'colis' => fake()->numberBetween(10, 900),
            'conteneurs_annonces' => 0,
            'hors_conteneur' => false,
            'type_marchandise' => null,
        ];
    }

    /** Un BL de vrac : aucune boîte, tout se facture sur l'assiette du BL. */
    public function vrac(): static
    {
        return $this->state(fn (array $attributes): array => [
            'conteneurs_annonces' => 0,
            'hors_conteneur' => true,
        ]);
    }

    /** Un house/dégroupage : le connaissement mère est renseigné. */
    public function groupage(): static
    {
        return $this->state(fn (array $attributes): array => [
            'master_reference' => 'MSTR-26'.fake()->numerify('####'),
        ]);
    }
}
