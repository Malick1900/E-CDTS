<?php

namespace Database\Seeders;

use App\Models\Pays;
use App\Models\Port;
use App\Models\TypeNavire;
use Illuminate\Database\Seeder;

/**
 * Amorce des référentiels : liste de pays (pavillons / origines fréquents dans
 * le trafic gabonais et grands pavillons de complaisance) + les deux ports
 * gérés par le CGC. Les types de navire, armements et navires sont créés depuis
 * l'UI et ne sont pas amorcés.
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

        // Types de navire courants (référentiel extensible depuis l'UI).
        $typesNavire = [
            'PC' => 'Porte-conteneurs',
            'VRAC' => 'Vraquier',
            'RORO' => 'Roulier (Ro-Ro)',
            'GRUM' => 'Grumier (bois)',
            'CARG' => 'Cargo polyvalent',
            'CITE' => 'Pétrolier / chimiquier',
            'FRIG' => 'Navire frigorifique',
        ];

        foreach ($typesNavire as $code => $name) {
            TypeNavire::updateOrCreate(['code' => $code], ['name' => $name, 'actif' => true]);
        }
    }
}
