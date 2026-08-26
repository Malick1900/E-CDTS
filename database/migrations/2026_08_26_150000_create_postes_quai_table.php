<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Les postes d'accostage d'un port — liste fermée, propre à chaque port.
 *
 * La question restait ouverte dans CHAMPS-DONNEES.md (liste fermée ou texte
 * libre ?). La maquette tranche : un menu déroulant borné par le port, ce qui
 * seul permet de détecter qu'un poste est déjà occupé. Un poste n'a de sens que
 * dans son port — d'où la cascade : supprimer un port emporte ses postes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postes_quai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('port_id')->constrained('ports')->cascadeOnDelete();
            // Code affiché tel quel dans la situation : M1, Bois, Appontement
            // pétrolier… Ce sont les libellés du document de la conférence.
            $table->string('code', 40);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // Deux postes homonymes dans le même port sont une erreur de saisie.
            $table->unique(['port_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postes_quai');
    }
};
