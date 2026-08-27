<?php

use App\Enums\ModeExploitation;
use App\Enums\UniteBareme;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ce qu'une ligne de barème tarife, et à quelle assiette (ADR-0044).
 *
 * ADR-0034 avait volontairement laissé la table nue — « pas d'unité, pas de
 * code de nomenclature » — en notant que « le sujet reviendra au
 * dépouillement ». Nous y sommes : sans ces trois colonnes, une ligne de
 * manifeste qualifiée « vrac solide » n'a aucun moyen de retrouver son tarif
 * autrement qu'en recopiant la grille dans le code, ce qui ferait deux vérités.
 *
 * Les trois sont NULLABLES, et c'est délibéré :
 *
 * - `type_marchandise` reste nul pour les lignes que la nomenclature des 19
 *   types ne réclame pas (les variantes « conditionnement conteneurisé » des
 *   produits dérivés, le bois import à 0,00). Elles restent dans la grille —
 *   ADR-0034 : « aucune ligne n'est désactivée » — mais ne sont atteintes par
 *   aucune qualification.
 * - `unite` reste nulle pour une ligne dont le document ne dit pas l'assiette
 *   (`IMP10`). Elle s'affiche à l'écran du barème et le calcul l'ignore : mieux
 *   vaut une ligne non calculable qu'une assiette inventée.
 * - `mode_exploitation` ne concerne que le bois export. Nul ailleurs, et nul
 *   aussi sur la ligne de repli qui s'applique quand l'escale ne déclare aucun
 *   mode.
 *
 * Une ligne ajoutée depuis l'écran d'administration naît sans qualification :
 * elle figure dans la grille et n'est facturable qu'une fois qualifiée. C'est
 * le comportement voulu — on ne facture pas sur une ligne dont personne n'a dit
 * ce qu'elle tarife.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bareme_lignes', function (Blueprint $table) {
            $table->string('type_marchandise')->nullable()->after('sens');
            $table->enum('unite', UniteBareme::values())->nullable()->after('type_marchandise');
            $table->enum('mode_exploitation', ModeExploitation::values())->nullable()->after('unite');

            // La seule lecture de la liquidation : « les lignes de ce type,
            // dans ce sens ». Le tri final entre elles (unité payante, mode)
            // porte sur une poignée de lignes et se fait en mémoire.
            $table->index(['type_marchandise', 'sens'], 'bareme_lignes_qualification_index');
        });
    }

    public function down(): void
    {
        Schema::table('bareme_lignes', function (Blueprint $table) {
            $table->dropIndex('bareme_lignes_qualification_index');
            $table->dropColumn(['type_marchandise', 'unite', 'mode_exploitation']);
        });
    }
};
