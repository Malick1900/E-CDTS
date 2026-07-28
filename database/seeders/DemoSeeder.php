<?php

namespace Database\Seeders;

use App\Enums\ModeExploitation;
use App\Models\Armement;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\TypeNavire;
use Illuminate\Database\Seeder;

/**
 * Jeu d'exemple pour le développement : quelques armements et leurs navires.
 *
 * ⚠ Ce ne sont PAS des données maîtres. Les armements et les navires sont la
 * donnée du client, saisie depuis l'UI ; ce seeder n'existe que pour qu'un
 * environnement fraîchement monté ne présente pas des écrans vides. Il est
 * appelé depuis `DatabaseSeeder`, aux côtés du compte de développement, et n'a
 * pas sa place dans un déploiement réel.
 *
 * Idempotent : `updateOrCreate` sur un identifiant naturel (nom de l'armement,
 * numéro IMO du navire).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $pays = Pays::pluck('id', 'code');
        $types = TypeNavire::pluck('id', 'code');

        // [nom, sigle, pays d'origine, pays d'immatriculation, gérant]
        $armements = [
            ['Maersk Line', 'MSK', 'DK', 'DK', 'Vincent Clerc'],
            ['CMA CGM', 'CMA', 'FR', 'FR', 'Rodolphe Saadé'],
            ['Mediterranean Shipping Company', 'MSC', 'CH', 'CH', 'Soren Toft'],
            ['Pacific International Lines', 'PIL', 'SG', 'SG', 'Lars Kastrup'],
        ];

        foreach ($armements as [$name, $sigle, $origine, $immatriculation, $gerant]) {
            Armement::updateOrCreate(['name' => $name], [
                'sigle' => $sigle,
                'pays_origine_id' => $pays[$origine] ?? null,
                'pays_immatriculation_id' => $pays[$immatriculation] ?? null,
                'gerant' => $gerant,
                'actif' => true,
            ]);
        }

        $sigles = Armement::pluck('id', 'sigle');

        // [nom, IMO, type, armement, pavillon, mode d'exploitation par défaut]
        //
        // Le mode porté ici n'est qu'un DÉFAUT : il sera recopié sur l'escale à
        // sa création, et c'est l'escale qui fait foi pour la facturation.
        $navires = [
            ['Maersk Cadiz', '9525234', 'PC', 'MSK', 'DK', ModeExploitation::LigneReguliere],
            ['Maersk Nuku', '9631401', 'RORO', 'MSK', 'LR', ModeExploitation::LigneReguliere],
            ['CMA CGM Congo', '9764285', 'PC', 'CMA', 'MT', ModeExploitation::LigneReguliere],
            ['Cap San Owendo', '9702631', 'FRIG', 'CMA', 'PA', ModeExploitation::Tramping],
            ['MSC Bilbao', '9304596', 'PC', 'MSC', 'PA', ModeExploitation::LigneReguliere],
            ['Nordic Okume', '9412367', 'GRUM', 'PIL', 'MH', ModeExploitation::Tramping],
            ['Pacific Ozouri', '9188025', 'GRUM', 'PIL', 'LR', ModeExploitation::Tramping],
        ];

        foreach ($navires as [$name, $imo, $type, $armement, $pavillon, $mode]) {
            Navire::updateOrCreate(['imo' => $imo], [
                'name' => $name,
                'type_navire_id' => $types[$type] ?? null,
                'armement_id' => $sigles[$armement] ?? null,
                'pays_id' => $pays[$pavillon] ?? null,
                'mode_exploitation_defaut' => $mode,
                'actif' => true,
            ]);
        }
    }
}
