<?php

namespace Database\Seeders;

use App\Models\Pays;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\TypeNavire;
use Illuminate\Database\Seeder;

/**
 * Amorce des référentiels : pays (pavillons / origines fréquents dans le trafic
 * gabonais et grands pavillons de complaisance), les deux ports gérés par le
 * CGC avec leurs postes d'accostage, et les types de navire.
 *
 * Ce sont des DONNÉES MAÎTRES, pas de la démonstration : elles ont vocation à
 * exister en production. Les armements et les navires, eux, appartiennent au
 * client et se saisissent depuis l'UI — un jeu d'exemple séparé vit dans
 * `DemoSeeder`, réservé au développement.
 *
 * Idempotent : `updateOrCreate` sur le `code` — relancer le seed ne duplique
 * rien et n'écrase pas l'état `actif` ajusté depuis l'admin.
 */
class ReferentielsSeeder extends Seeder
{
    public function run(): void
    {
        // ISO 3166-1 alpha-2 => nom. Liste de départ, extensible depuis l'UI.
        $pays = [
            'GA' => 'Gabon',
            'CM' => 'Cameroun',
            'CG' => 'Congo',
            'CD' => 'République démocratique du Congo',
            'GQ' => 'Guinée équatoriale',
            'AO' => 'Angola',
            'NG' => 'Nigéria',
            'CI' => "Côte d'Ivoire",
            'SN' => 'Sénégal',
            'TG' => 'Togo',
            'BJ' => 'Bénin',
            'GH' => 'Ghana',
            'ZA' => 'Afrique du Sud',
            'MA' => 'Maroc',
            'FR' => 'France',
            'BE' => 'Belgique',
            'DK' => 'Danemark',
            'CH' => 'Suisse',
            'NL' => 'Pays-Bas',
            'DE' => 'Allemagne',
            'ES' => 'Espagne',
            'IT' => 'Italie',
            'GB' => 'Royaume-Uni',
            'PT' => 'Portugal',
            'GR' => 'Grèce',
            'TR' => 'Turquie',
            'CN' => 'Chine',
            'SG' => 'Singapour',
            'IN' => 'Inde',
            'JP' => 'Japon',
            'KR' => 'Corée du Sud',
            'US' => 'États-Unis',
            // Grands pavillons de complaisance
            'PA' => 'Panama',
            'LR' => 'Libéria',
            'MH' => 'Îles Marshall',
            'MT' => 'Malte',
            'CY' => 'Chypre',
            'BS' => 'Bahamas',
            'HK' => 'Hong Kong',
        ];

        foreach ($pays as $code => $name) {
            Pays::updateOrCreate(['code' => $code], ['name' => $name, 'actif' => true]);
        }

        // Ports gérés par le CGC (liste exacte à compléter). Rattachés au Gabon.
        $gabon = Pays::where('code', 'GA')->first();

        $ports = [
            ['code' => 'GAOWE', 'name' => 'Owendo'],
            ['code' => 'GAPOG', 'name' => 'Port-Gentil'],
        ];

        foreach ($ports as $port) {
            Port::updateOrCreate(
                ['code' => $port['code']],
                ['name' => $port['name'], 'pays_id' => $gabon?->id, 'actif' => true],
            );
        }

        // Types de navire (référentiel extensible depuis l'UI).
        //
        // La liste couvre volontairement des navires SANS lien CDTS — remorqueur,
        // drague, centrale flottante : la situation portuaire les suit aussi, et
        // le référentiel doit pouvoir les qualifier (CHAMPS-DONNEES.md §4).
        $typesNavire = [
            // Navires de commerce
            'PC' => 'Porte-conteneurs',
            'VRAC' => 'Vraquier',
            'MINE' => 'Minéralier',
            'RORO' => 'Roulier (Ro-Ro)',
            'GRUM' => 'Grumier (bois)',
            'CARG' => 'Cargo polyvalent',
            'CITE' => 'Pétrolier / chimiquier',
            'FRIG' => 'Navire frigorifique',
            'CABO' => 'Caboteur',
            // Navires non commerciaux (situation portuaire uniquement)
            'REMO' => 'Remorqueur',
            'DRAG' => 'Drague',
            'CFLO' => 'Centrale flottante',
        ];

        foreach ($typesNavire as $code => $name) {
            TypeNavire::updateOrCreate(['code' => $code], ['name' => $name, 'actif' => true]);
        }

        // Postes d'accostage, par port. La situation portuaire n'en accepte pas
        // d'autres : c'est cette liste fermée qui permet de dire qu'un poste est
        // déjà occupé.
        //
        // ⚠ Codes repris de la maquette. Le document réel d'Owendo en emploie
        // d'autres (P1–P4, P3/4, OCT, GSEZ 2, ZNE EXPL) — liste à faire
        // confirmer par le CGC (CHAMPS-DONNEES.md §8).
        $postes = [
            'GAOWE' => ['M1', 'M2', 'M3', 'M4', 'Minéralier', 'Bois', 'Pétrolier', 'Conventionnel'],
            'GAPOG' => ['Quai Nord', 'Quai Sud', 'Appontement pétrolier'],
        ];

        foreach ($postes as $codePort => $codes) {
            $port = Port::where('code', $codePort)->first();

            if ($port === null) {
                continue;
            }

            foreach ($codes as $code) {
                PosteQuai::updateOrCreate(
                    ['port_id' => $port->id, 'code' => $code],
                    ['actif' => true],
                );
            }
        }
    }
}
