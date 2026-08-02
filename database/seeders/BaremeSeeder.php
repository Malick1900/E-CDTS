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
 * ⚠ Relevé à la transcription : EXP07 (minerais et vrac liquide export) et
 * IMP02 (bois import) sont à 0,00 sur le document. Repris tel quel.
 */
class BaremeSeeder extends Seeder
{
    /**
     * reference, désignation, montant CFA.
     *
     * @var list<array{string, string, float}>
     */
    private const EXPORT = [
        ['EXP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', 1589.51],
        ['EXP02', 'BOIS EN GRUME ET PRODUITS DERIVES', 1773.70],
        ['EXP02B', 'BOIS EN GRUME ET PRODUITS DERIVES (LIGNE REGULIERE)', 1569.04],
        ['EXP03', 'CONTENEUR 20 PIEDS REFRIGERE', 26605.61],
        ['EXP04', 'CONTENEUR 20 PIEDS SEC (DRY)', 14326.10],
        ['EXP05', 'CONTENEUR 40 PIEDS REFRIGERE', 31380.98],
        ['EXP06', 'CONTENEUR 40 PIEDS SEC (DRY)', 27287.81],
        ['EXP07', 'MINERAIS ET VRAC LIQUIDE', 0.00],
        ['EXP08', 'SACHERIE, SUCRE, FARINE, CEREALES', 682.19],
        ['EXP09', 'VEHICULE DE TOURISME', 10915.12],
        ['EXP10', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN CUBAGE', 1569.04],
        ['EXP11', 'CONTENEUR 45 PIEDS SEC', 35264.00],
        ['EXP12', 'CONTENEUR 45 PIEDS REFRIGERE', 42506.00],
        ['EXP13', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN METRIQUE', 1968.00],
        ['EXP14', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN PIECE DETACHEE (UN SEUL ENGIN)', 1968.00],
        ['EXP15', 'BOIS EN GRUME ET PRODUITS DERIVES (TRAMPING)', 1909.00],
        ['EXP16', 'BOIS EN GRUMES PRODUIT DERIVE SEMI-FINI ET FINI CONTENEURISE (LIGNE REGULIERE)', 1692.00],
        ['EXP17', 'BOIS EN GRUMES PRODUITS DERIVES SEMI-FINI ET FINI CONTENEURISE (TRAMPING)', 1909.00],
        ['EXP18', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', 984.00],
        ['EXP19', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', 655.96],
        ['EXP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', 984.00],
        ['EXP21', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', 984.00],
        ['EXP22', 'VRAC LIQUIDE DECLARE EN METRIQUE (PRODUITS DERIVES DES HYDROCARBURES)', 984.00],
        ['EXP23', 'VRAC LIQUIDE DECLARE EN CUBAGE (PRODUITS DERIVES DES HYDROCARBURES)', 655.96],
        ['EXP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', 984.00],
        ['EXP25', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', 655.96],
        ['EXP26', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', 984.00],
        ['EXP27', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', 655.96],
        ['EXP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', 984.00],
        ['EXP29', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', 655.96],
    ];

    /**
     * @var list<array{string, string, float}>
     */
    private const IMPORT = [
        ['IMP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', 1705.48],
        ['IMP011', 'CONTENEUR 45 PIEDS SEC', 35264.00],
        ['IMP012', 'CONTENEUR 45 PIEDS REFRIGERE', 39672.00],
        ['IMP02', 'BOIS EN GRUME ET PRODUITS DERIVES', 0.00],
        ['IMP03', 'CONTENEUR 20 PIEDS REFRIGERE', 28652.19],
        ['IMP04', 'CONTENEUR 20 PIEDS SEC (DRY)', 16372.68],
        ['IMP05', 'CONTENEUR 40 PIEDS REFRIGERE', 34109.76],
        ['IMP06', 'CONTENEUR 40 PIEDS SEC (DRY)', 30016.59],
        ['IMP07', 'MINERAIS ET VRAC LIQUIDE', 1312.00],
        ['IMP08', 'SACHERIE, SUCRE, FARINE, CEREALES', 1023.29],
        ['IMP09', 'VEHICULE DE TOURISME', 13643.90],
        ['IMP10', 'VEHICULE UTILITAIRE ET AUTRES', 1705.48],
        ['IMP13', 'AUTRES EMBALLAGES', 1837.00],
        ['IMP14', 'UTILITAIRE ET AUTRES DECLARE EN CUBAGE', 1837.00],
        ['IMP15', 'UTILITAIRE ET AUTRE DECLARE EN METRIQUE', 2624.00],
        ['IMP16', 'UTILITAIRE ET AUTRE DECLARE EN PIECES DETACHEES ET UN SEUL ENGIN', 2624.00],
        ['IMP17', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', 1312.00],
        ['IMP18', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', 984.00],
        ['IMP19', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', 1312.00],
        ['IMP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', 984.00],
        ['IMP21', 'VRAC LIQUIDE DECLARE EN METRIQUE (DERIVES DES HYDROCARBURES)', 1312.00],
        ['IMP22', 'VRAC LIQUIDE DECLARE EN CUBAGE (DERIVES DES HYDROCARBURES)', 984.00],
        ['IMP23', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', 1312.00],
        ['IMP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', 984.00],
        ['IMP25', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', 1312.00],
        ['IMP26', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', 984.00],
        ['IMP27', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', 1312.00],
        ['IMP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', 984.00],
    ];

    public function run(): void
    {
        foreach ([SensTrafic::Export->value => self::EXPORT, SensTrafic::Import->value => self::IMPORT] as $sens => $lignes) {
            foreach ($lignes as [$reference, $designation, $montant]) {
                BaremeLigne::updateOrCreate(
                    ['reference' => $reference],
                    [
                        'sens' => $sens,
                        'designation' => $designation,
                        'montant_cfa' => $montant,
                    ],
                );
            }
        }
    }
}
