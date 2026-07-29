<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Représentation armement ↔ consignataire (ADR-0014) : un armement est
 * représenté au port par plusieurs consignataires, et un consignataire
 * représente plusieurs armements.
 *
 * Clé primaire composite : le couple est le fait, il ne se répète pas.
 * `cascade` des deux côtés est sans risque — armements et consignataires se
 * désactivent au lieu d'être supprimés (ADR-0012) ; si une suppression a
 * quand même lieu, le lien de représentation n'a plus d'objet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('armement_consignataire', function (Blueprint $table) {
            $table->foreignId('armement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('consignataire_id')->constrained()->cascadeOnDelete();
            $table->primary(['armement_id', 'consignataire_id']);

            // La clé primaire couvre le sens armement → consignataires ; l'index
            // sert le sens inverse, celui de la fiche société (« ses armements »).
            $table->index('consignataire_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('armement_consignataire');
    }
};
