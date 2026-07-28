<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel « Armement » — compagnie maritime propriétaire / exploitante des
 * navires (= armateur, ADR-0014). Référence centrale ; le lien N-N avec les
 * consignataires est différé (le modèle Consignataire arrive en phase Comptes
 * clients).
 *
 * Champs métier optionnels (sigle, gérant, RCCM/NIF, adresse) : renseignés au
 * fil de l'eau. `pays_origine_id` / `pays_immatriculation_id` pointent vers le
 * référentiel Pays.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('armements', function (Blueprint $table) {
            $table->id();
            $table->string('name');                // raison sociale
            $table->string('sigle')->nullable();   // nom court / acronyme
            $table->foreignId('pays_origine_id')->nullable()->constrained('pays')->nullOnDelete();
            $table->foreignId('pays_immatriculation_id')->nullable()->constrained('pays')->nullOnDelete();
            $table->string('gerant')->nullable();  // nom du gérant / représentant
            $table->string('rccm_nif')->nullable(); // identifiant légal
            $table->string('adresse')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('armements');
    }
};
