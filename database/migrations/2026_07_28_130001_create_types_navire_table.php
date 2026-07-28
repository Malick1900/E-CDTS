<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel « Type de navire » — désignation qualifiant un navire
 * (porte-conteneurs, vraquier, RoRo, tanker, remorqueur…). Couvre aussi les
 * unités non commerciales.
 *
 * Un type ne peut être supprimé s'il est utilisé par au moins un navire :
 * on le désactive (`actif`) plutôt que de le supprimer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('types_navire', function (Blueprint $table) {
            $table->id();
            $table->string('name');               // désignation (ex. Porte-conteneurs)
            $table->string('code', 20)->unique(); // code court (ex. PC, TANK)
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('types_navire');
    }
};
