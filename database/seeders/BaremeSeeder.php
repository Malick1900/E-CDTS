<?php

namespace Database\Seeders;

use App\Enums\SensTrafic;
use App\Models\BaremeLigne;
use Illuminate\Database\Seeder;

/**
 * Le barème CDTS en vigueur, transcrit du document officiel du CGC (ADR-0034).
 *
 * Les montants sont en francs CFA, tels qu'ils figurent sur le document. Les
 * colonnes « -4 % » et « taux appliqué » du papier ne sont pas reprises : les
 * remises ne sont pas gérées par la plateforme.
 *
 * Idempotent (`updateOrCreate` sur la référence) : relancer le seeder remet les
 * montants d'origine sans dupliquer les lignes ni perdre celles qui ont été
 * ajoutées depuis l'écran.
 *
 * ⚠ Deux points relevés à la transcription, à trancher par le CGC :
 *  - IMP25 à IMP28 portent la nomenclature 03, là où leurs équivalents export
 *    (EXP26 à EXP29) portent 04. Repris tel quel — on ne corrige pas un
 *    document officiel de sa propre initiative.
 *  - EXP07 (minerais et vrac liquide export) et IMP02 (bois import) sont à 0.
 */
class BaremeSeeder extends Seeder
{
    /**
     * reference, désignation, nomenclature, montant CFA.
     *
     * @var list<array{string, string, string, float}>
     */
    private const EXPORT = [
        ['EXP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', '01', 1589.51],
        ['EXP02', 'BOIS EN GRUME ET PRODUITS DERIVES', '02', 1773.70],
        ['EXP02B', 'BOIS EN GRUME ET PRODUITS DERIVES (LIGNE REGULIERE)', '02', 1569.04],
        ['EXP03', 'CONTENEUR 20 PIEDS REFRIGERE', '03', 26605.61],
        ['EXP04', 'CONTENEUR 20 PIEDS SEC (DRY)', '03', 14326.10],
        ['EXP05', 'CONTENEUR 40 PIEDS REFRIGERE', '03', 31380.98],
        ['EXP06', 'CONTENEUR 40 PIEDS SEC (DRY)', '03', 27287.81],
        ['EXP07', 'MINERAIS ET VRAC LIQUIDE', '04', 0.00],
        ['EXP08', 'SACHERIE, SUCRE, FARINE, CEREALES', '05', 682.19],
        ['EXP09', 'VEHICULE DE TOURISME', '06', 10915.12],
        ['EXP10', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN CUBAGE', '07', 1569.04],
        ['EXP11', 'CONTENEUR 45 PIEDS SEC', '03', 35264.00],
        ['EXP12', 'CONTENEUR 45 PIEDS REFRIGERE', '03', 42506.00],
        ['EXP13', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN METRIQUE', '07', 1968.00],
        ['EXP14', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN PIECE DETACHEE (UN SEUL ENGIN)', '07', 1968.00],
        ['EXP15', 'BOIS EN GRUME ET PRODUITS DERIVES (TRAMPING)', '02', 1909.00],
        ['EXP16', 'BOIS EN GRUMES PRODUIT DERIVE SEMI-FINI ET FINI CONTENEURISE (LIGNE REGULIERE)', '02', 1692.00],
        ['EXP17', 'BOIS EN GRUMES PRODUITS DERIVES SEMI-FINI ET FINI CONTENEURISE (TRAMPING)', '02', 1909.00],
        ['EXP18', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', '04', 984.00],
        ['EXP19', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', '04', 655.96],
        ['EXP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', '04', 984.00],
        ['EXP21', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', '04', 984.00],
        ['EXP22', 'VRAC LIQUIDE DECLARE EN METRIQUE (PRODUITS DERIVES DES HYDROCARBURES)', '04', 984.00],
        ['EXP23', 'VRAC LIQUIDE DECLARE EN CUBAGE (PRODUITS DERIVES DES HYDROCARBURES)', '04', 655.96],
        ['EXP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', '04', 984.00],
        ['EXP25', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', '04', 655.96],
        ['EXP26', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', '04', 984.00],
        ['EXP27', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', '04', 655.96],
        ['EXP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', '04', 984.00],
        ['EXP29', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', '04', 655.96],
    ];

    /**
     * @var list<array{string, string, string, float}>
     */
    private const IMPORT = [
        ['IMP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', '01', 1705.48],
        ['IMP011', 'CONTENEUR 45 PIEDS SEC', '03', 35264.00],
        ['IMP012', 'CONTENEUR 45 PIEDS REFRIGERE', '03', 39672.00],
        ['IMP02', 'BOIS EN GRUME ET PRODUITS DERIVES', '02', 0.00],
        ['IMP03', 'CONTENEUR 20 PIEDS REFRIGERE', '03', 28652.19],
        ['IMP04', 'CONTENEUR 20 PIEDS SEC (DRY)', '03', 16372.68],
        ['IMP05', 'CONTENEUR 40 PIEDS REFRIGERE', '03', 34109.76],
        ['IMP06', 'CONTENEUR 40 PIEDS SEC (DRY)', '03', 30016.59],
        ['IMP07', 'MINERAIS ET VRAC LIQUIDE', '04', 1312.00],
        ['IMP08', 'SACHERIE, SUCRE, FARINE, CEREALES', '05', 1023.29],
        ['IMP09', 'VEHICULE DE TOURISME', '06', 13643.90],
        ['IMP10', 'VEHICULE UTILITAIRE ET AUTRES', '07', 1705.48],
        ['IMP13', 'AUTRES EMBALLAGES', '05', 1837.00],
        ['IMP14', 'UTILITAIRE ET AUTRES DECLARE EN CUBAGE', '07', 1837.00],
        ['IMP15', 'UTILITAIRE ET AUTRE DECLARE EN METRIQUE', '07', 2624.00],
        ['IMP16', 'UTILITAIRE ET AUTRE DECLARE EN PIECES DETACHEES ET UN SEUL ENGIN', '07', 2624.00],
        ['IMP17', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', '04', 1312.00],
        ['IMP18', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', '04', 984.00],
        ['IMP19', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', '04', 1312.00],
        ['IMP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', '04', 984.00],
        ['IMP21', 'VRAC LIQUIDE DECLARE EN METRIQUE (DERIVES DES HYDROCARBURES)', '04', 1312.00],
        ['IMP22', 'VRAC LIQUIDE DECLARE EN CUBAGE (DERIVES DES HYDROCARBURES)', '04', 984.00],
        ['IMP23', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', '04', 1312.00],
        ['IMP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', '04', 984.00],
        ['IMP25', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', '03', 1312.00],
        ['IMP26', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', '03', 984.00],
        ['IMP27', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', '03', 1312.00],
        ['IMP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', '03', 984.00],
    ];

    public function run(): void
    {
        foreach ([SensTrafic::Export->value => self::EXPORT, SensTrafic::Import->value => self::IMPORT] as $sens => $lignes) {
            foreach ($lignes as [$reference, $designation, $nomenclature, $montant]) {
                BaremeLigne::updateOrCreate(
                    ['reference' => $reference],
                    [
                        'sens' => $sens,
                        'designation' => $designation,
                        'nomenclature' => $nomenclature,
                        'montant_cfa' => $montant,
                    ],
                );
            }
        }
    }
}
