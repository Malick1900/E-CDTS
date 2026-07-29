<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Portée d'un agent consignataire : les armements sur lesquels il peut opérer
 * (ADR-0009). C'est un filtre de données au niveau ligne, jamais une permission
 * — un agent validé n'agit que sur les armements cochés ici, choisis parmi ceux
 * que sa société représente.
 *
 * Clé primaire composite : l'affectation est un fait, elle ne se répète pas.
 * `cascade` des deux côtés — un armement supprimé ou un compte supprimé rend
 * l'affectation sans objet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('armement_user', function (Blueprint $table) {
            $table->foreignId('armement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['armement_id', 'user_id']);

            // La clé primaire couvre le sens armement → agents ; l'index sert le
            // sens inverse, celui de la ligne d'agent (« ses armements »).
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('armement_user');
    }
};
