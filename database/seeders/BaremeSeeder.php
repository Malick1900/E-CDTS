<?php

namespace Database\Seeders;

use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Enums\UniteBareme;
use App\Models\BaremeLigne;
use Illuminate\Database\Seeder;

/**
 * Le barème CDTS en vigueur, transcrit du document officiel du CGC (ADR-0034),
 * et qualifié pour la liquidation (ADR-0044).
 *
 * Les montants sont en francs CFA, tels qu'ils figurent sur le document. Les
 * colonnes « -4 % » et « taux appliqué » du papier ne sont pas reprises : les
 * remises ne sont pas gérées par la plateforme.
 *
 * Idempotent : relancer le seeder remet les montants d'origine sans dupliquer
 * les lignes ni perdre celles qui ont été ajoutées depuis l'écran. Il fait
 * autorité sur les **tarifs**, jamais sur les **décisions d'exploitation** du
 * CGC : l'état actif/inactif n'est posé qu'à la création (ADR-0034).
 *
 * ⚠ Relevé à la transcription : EXP07 (minerais et vrac liquide export) et
 * IMP02 (bois import) sont à 0,00 sur le document. Repris tel quel.
 *
 * ⚠ Cinq lignes restent SANS type de marchandise : la nomenclature des 19 types
 * ne les réclame pas. Elles figurent dans la grille et aucune qualification ne
 * les atteint. Ce sont les quatre variantes « conditionnement conteneurisé »
 * des produits dérivés des hydrocarbures (EXP28, EXP29, IMP27, IMP28) et le
 * bois import (IMP02, que la nomenclature réserve à l'export).
 */
class BaremeSeeder extends Seeder
{
    /**
     * Les références qui naissent DÉSACTIVÉES : le document officiel les porte,
     * mais elles ne peuvent pas facturer en l'état.
     *
     * `EXP02` est une transcription incomplète, confirmée par le CGC le
     * 2026-08-27 : il y manque la mention du mode d'exploitation, et son montant
     * ne coïncide avec aucune des deux lignes qui portent ce mode. La laisser
     * active reviendrait à facturer le bois à un tarif que personne n'a arrêté.
     *
     * Elles restent dans la grille, où l'Administrateur les corrigera, les
     * supprimera ou les réactivera d'un clic (ADR-0034).
     *
     * Les huit suivantes sont d'un autre ordre : le CGC **ne facture pas les
     * hydrocarbures** pour l'instant (2026-08-27). Ce sont les quatre lignes du
     * type « produits dérivés des hydrocarbures » et leurs quatre variantes en
     * conditionnement conteneurisé. Le vrac liquide général reste actif : une
     * huile de palme ou une mélasse n'est pas un hydrocarbure, et continue de
     * se facturer.
     *
     * @var list<string>
     */
    private const DESACTIVEES_A_LA_CREATION = [
        'EXP02',
        'EXP24', 'EXP25', 'IMP23', 'IMP24',
        'EXP28', 'EXP29', 'IMP27', 'IMP28',
    ];

    /**
     * reference, désignation, montant CFA, type de marchandise, unité, mode.
     *
     * @var list<array{string, string, float, TypeMarchandise|null, UniteBareme|null, ModeExploitation|null}>
     */
    private const EXPORT = [
        ['EXP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', 1589.51, TypeMarchandise::Conventionnel, UniteBareme::Tonne, null],
        // ⚠ Transcription incomplète, confirmée par le CGC le 2026-08-27 : il
        // manque la mention du mode d'exploitation, et son montant ne coïncide
        // avec aucun des deux autres. La ligne naît donc DÉSACTIVÉE — elle
        // reste dans la grille, où le CGC la corrigera ou la supprimera, et ne
        // facture rien en attendant (ADR-0044).
        ['EXP02', 'BOIS EN GRUME ET PRODUITS DERIVES', 1773.70, TypeMarchandise::BoisConventionnel, UniteBareme::MetreCube, null],
        ['EXP02B', 'BOIS EN GRUME ET PRODUITS DERIVES (LIGNE REGULIERE)', 1569.04, TypeMarchandise::BoisConventionnel, UniteBareme::MetreCube, ModeExploitation::LigneReguliere],
        ['EXP03', 'CONTENEUR 20 PIEDS REFRIGERE', 26605.61, TypeMarchandise::Conteneur20F, UniteBareme::Forfait, null],
        ['EXP04', 'CONTENEUR 20 PIEDS SEC (DRY)', 14326.10, TypeMarchandise::Conteneur20S, UniteBareme::Forfait, null],
        ['EXP05', 'CONTENEUR 40 PIEDS REFRIGERE', 31380.98, TypeMarchandise::Conteneur40F, UniteBareme::Forfait, null],
        ['EXP06', 'CONTENEUR 40 PIEDS SEC (DRY)', 27287.81, TypeMarchandise::Conteneur40S, UniteBareme::Forfait, null],
        ['EXP07', 'MINERAIS ET VRAC LIQUIDE', 0.00, TypeMarchandise::MineraisVracLiquide, UniteBareme::Tonne, null],
        ['EXP08', 'SACHERIE, SUCRE, FARINE, CEREALES', 682.19, TypeMarchandise::Sacherie, UniteBareme::Tonne, null],
        ['EXP09', 'VEHICULE DE TOURISME', 10915.12, TypeMarchandise::VehiculeTourisme, UniteBareme::Unite, null],
        ['EXP10', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN CUBAGE', 1569.04, TypeMarchandise::VehiculeUtilitaire, UniteBareme::MetreCube, null],
        ['EXP11', 'CONTENEUR 45 PIEDS SEC', 35264.00, TypeMarchandise::Conteneur45S, UniteBareme::Forfait, null],
        ['EXP12', 'CONTENEUR 45 PIEDS REFRIGERE', 42506.00, TypeMarchandise::Conteneur45F, UniteBareme::Forfait, null],
        ['EXP13', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN METRIQUE', 1968.00, TypeMarchandise::VehiculeUtilitaire, UniteBareme::Tonne, null],
        ['EXP14', 'VEHICULE UTILITAIRE ET AUTRE DECLARE EN PIECE DETACHEE (UN SEUL ENGIN)', 1968.00, TypeMarchandise::VehiculeUtilitaire, UniteBareme::Unite, null],
        ['EXP15', 'BOIS EN GRUME ET PRODUITS DERIVES (TRAMPING)', 1909.00, TypeMarchandise::BoisConventionnel, UniteBareme::MetreCube, ModeExploitation::Tramping],
        ['EXP16', 'BOIS EN GRUMES PRODUIT DERIVE SEMI-FINI ET FINI CONTENEURISE (LIGNE REGULIERE)', 1692.00, TypeMarchandise::BoisConteneurise, UniteBareme::MetreCube, ModeExploitation::LigneReguliere],
        ['EXP17', 'BOIS EN GRUMES PRODUITS DERIVES SEMI-FINI ET FINI CONTENEURISE (TRAMPING)', 1909.00, TypeMarchandise::BoisConteneurise, UniteBareme::MetreCube, ModeExploitation::Tramping],
        ['EXP18', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', 984.00, TypeMarchandise::VracSolide, UniteBareme::Tonne, null],
        ['EXP19', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', 655.96, TypeMarchandise::VracSolide, UniteBareme::MetreCube, null],
        ['EXP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', 984.00, TypeMarchandise::DerivesMinerais, UniteBareme::Tonne, null],
        ['EXP21', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', 984.00, TypeMarchandise::DerivesMinerais, UniteBareme::MetreCube, null],
        ['EXP22', 'VRAC LIQUIDE DECLARE EN METRIQUE (PRODUITS DERIVES DES HYDROCARBURES)', 984.00, TypeMarchandise::VracLiquide, UniteBareme::Tonne, null],
        ['EXP23', 'VRAC LIQUIDE DECLARE EN CUBAGE (PRODUITS DERIVES DES HYDROCARBURES)', 655.96, TypeMarchandise::VracLiquide, UniteBareme::MetreCube, null],
        ['EXP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', 984.00, TypeMarchandise::DerivesHydrocarbures, UniteBareme::Tonne, null],
        ['EXP25', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', 655.96, TypeMarchandise::DerivesHydrocarbures, UniteBareme::MetreCube, null],
        ['EXP26', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', 984.00, TypeMarchandise::LiquideConteneurise, UniteBareme::Tonne, null],
        ['EXP27', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', 655.96, TypeMarchandise::LiquideConteneurise, UniteBareme::MetreCube, null],
        // Écartées : le CGC ne facture pas les hydrocarbures pour l'instant.
        // Elles n'avaient de toute façon pas de type dans la nomenclature —
        // les 19 types ne prévoient pas de variante conteneurisée aux produits
        // dérivés des hydrocarbures.
        ['EXP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', 984.00, null, UniteBareme::Tonne, null],
        ['EXP29', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', 655.96, null, UniteBareme::MetreCube, null],
    ];

    /**
     * @var list<array{string, string, float, TypeMarchandise|null, UniteBareme|null, ModeExploitation|null}>
     */
    private const IMPORT = [
        ['IMP01', 'AUTRES MARCHANDISES EN CONVENTIONNEL', 1705.48, TypeMarchandise::Conventionnel, UniteBareme::Tonne, null],
        ['IMP011', 'CONTENEUR 45 PIEDS SEC', 35264.00, TypeMarchandise::Conteneur45S, UniteBareme::Forfait, null],
        ['IMP012', 'CONTENEUR 45 PIEDS REFRIGERE', 39672.00, TypeMarchandise::Conteneur45F, UniteBareme::Forfait, null],
        // Sans type : la nomenclature ne facture le bois qu'à l'export. Un
        // contreplaqué importé tombe en « autres marchandises en conventionnel ».
        ['IMP02', 'BOIS EN GRUME ET PRODUITS DERIVES', 0.00, null, UniteBareme::MetreCube, null],
        ['IMP03', 'CONTENEUR 20 PIEDS REFRIGERE', 28652.19, TypeMarchandise::Conteneur20F, UniteBareme::Forfait, null],
        ['IMP04', 'CONTENEUR 20 PIEDS SEC (DRY)', 16372.68, TypeMarchandise::Conteneur20S, UniteBareme::Forfait, null],
        ['IMP05', 'CONTENEUR 40 PIEDS REFRIGERE', 34109.76, TypeMarchandise::Conteneur40F, UniteBareme::Forfait, null],
        ['IMP06', 'CONTENEUR 40 PIEDS SEC (DRY)', 30016.59, TypeMarchandise::Conteneur40S, UniteBareme::Forfait, null],
        ['IMP07', 'MINERAIS ET VRAC LIQUIDE', 1312.00, TypeMarchandise::MineraisVracLiquide, UniteBareme::Tonne, null],
        ['IMP08', 'SACHERIE, SUCRE, FARINE, CEREALES', 1023.29, TypeMarchandise::Sacherie, UniteBareme::Tonne, null],
        ['IMP09', 'VEHICULE DE TOURISME', 13643.90, TypeMarchandise::VehiculeTourisme, UniteBareme::Unite, null],
        // Au nombre d'engins (précisé par le CGC le 2026-08-27) : le document
        // ne le disait pas, IMP14 et IMP15 couvrant le cubage et le métrique.
        ['IMP10', 'VEHICULE UTILITAIRE ET AUTRES', 1705.48, TypeMarchandise::VehiculeUtilitaire, UniteBareme::Unite, null],
        ['IMP13', 'AUTRES EMBALLAGES', 1837.00, TypeMarchandise::AutresEmballages, UniteBareme::Tonne, null],
        ['IMP14', 'UTILITAIRE ET AUTRES DECLARE EN CUBAGE', 1837.00, TypeMarchandise::VehiculeUtilitaire, UniteBareme::MetreCube, null],
        ['IMP15', 'UTILITAIRE ET AUTRE DECLARE EN METRIQUE', 2624.00, TypeMarchandise::VehiculeUtilitaire, UniteBareme::Tonne, null],
        ['IMP16', 'UTILITAIRE ET AUTRE DECLARE EN PIECES DETACHEES ET UN SEUL ENGIN', 2624.00, TypeMarchandise::VehiculeUtilitaire, UniteBareme::Unite, null],
        ['IMP17', 'VRAC SOLIDE DECLARE EN METRIQUE (DERIVE DES MINERAIS)', 1312.00, TypeMarchandise::VracSolide, UniteBareme::Tonne, null],
        ['IMP18', 'VRAC SOLIDE DECLARE EN CUBAGE (DERIVE DES MINERAIS)', 984.00, TypeMarchandise::VracSolide, UniteBareme::MetreCube, null],
        ['IMP19', 'PRODUITS DERIVES DES MINERAIS DECLARES EN METRIQUE', 1312.00, TypeMarchandise::DerivesMinerais, UniteBareme::Tonne, null],
        ['IMP20', 'PRODUITS DERIVES DES MINERAIS DECLARES EN CUBAGE', 984.00, TypeMarchandise::DerivesMinerais, UniteBareme::MetreCube, null],
        ['IMP21', 'VRAC LIQUIDE DECLARE EN METRIQUE (DERIVES DES HYDROCARBURES)', 1312.00, TypeMarchandise::VracLiquide, UniteBareme::Tonne, null],
        ['IMP22', 'VRAC LIQUIDE DECLARE EN CUBAGE (DERIVES DES HYDROCARBURES)', 984.00, TypeMarchandise::VracLiquide, UniteBareme::MetreCube, null],
        ['IMP23', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE', 1312.00, TypeMarchandise::DerivesHydrocarbures, UniteBareme::Tonne, null],
        ['IMP24', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE', 984.00, TypeMarchandise::DerivesHydrocarbures, UniteBareme::MetreCube, null],
        ['IMP25', 'VRAC LIQUIDE DECLARE EN METRIQUE (CONDITIONNEMENT CONTENEURISE)', 1312.00, TypeMarchandise::LiquideConteneurise, UniteBareme::Tonne, null],
        ['IMP26', 'VRAC LIQUIDE DECLARE EN CUBAGE (CONDITIONNEMENT CONTENEURISE)', 984.00, TypeMarchandise::LiquideConteneurise, UniteBareme::MetreCube, null],
        // Écartées, comme leurs jumelles à l'export.
        ['IMP27', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN METRIQUE (COND CONT)', 1312.00, null, UniteBareme::Tonne, null],
        ['IMP28', 'PRODUITS DERIVES DES HYDROCARBURES DECLARES EN CUBAGE (COND CONT)', 984.00, null, UniteBareme::MetreCube, null],
    ];

    public function run(): void
    {
        foreach ([SensTrafic::Export->value => self::EXPORT, SensTrafic::Import->value => self::IMPORT] as $sens => $lignes) {
            foreach ($lignes as [$reference, $designation, $montant, $type, $unite, $mode]) {
                $modele = BaremeLigne::firstOrNew(['reference' => $reference]);
                $nouvelle = ! $modele->exists;

                $modele->fill([
                    'sens' => $sens,
                    'designation' => $designation,
                    'montant_cfa' => $montant,
                    'type_marchandise' => $type,
                    'unite' => $unite,
                    'mode_exploitation' => $mode,
                ]);

                // L'état n'est posé qu'à la création : le seeder fait autorité
                // sur les tarifs, jamais sur les décisions d'exploitation du CGC
                // (ADR-0034). Une ligne réactivée depuis l'écran le reste.
                if ($nouvelle) {
                    $modele->actif = ! in_array($reference, self::DESACTIVEES_A_LA_CREATION, true);
                }

                $modele->save();
            }
        }
    }
}
