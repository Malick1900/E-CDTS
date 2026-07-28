<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel « Navire » — entité maîtresse rapprochée du manifeste XML par
 * (nom + voyage) (ADR-0009). Le pavillon vient du référentiel Pays.
 *
 * `imo` : numéro OMI optionnel mais UNIQUE quand renseigné (les NULL restent
 * autorisés en doublon). `mode_exploitation_defaut` : valeur par défaut
 * recopiée sur l'escale (la facturation lit l'escale — cf. ModeExploitation).
 * FK toutes nullable : rattachement souple si l'info manque à la création.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('navires', function (Blueprint $table) {
            $table->id();
            $table->string('name');                    // nom du navire
            $table->string('imo', 20)->nullable()->unique(); // numéro OMI (unique si présent)
            $table->foreignId('pays_id')->nullable()->constrained('pays')->nullOnDelete(); // pavillon
            $table->foreignId('type_navire_id')->nullable()->constrained('types_navire')->nullOnDelete();
            $table->foreignId('armement_id')->nullable()->constrained('armements')->nullOnDelete();
            $table->string('mode_exploitation_defaut')->nullable(); // ligne_reguliere | tramping
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('navires');
    }
};
