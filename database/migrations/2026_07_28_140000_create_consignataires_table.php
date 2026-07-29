<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Société consignataire — mandataire de l'armement dans le port (ADR-0014).
 * C'est elle qui est facturée, jamais la personne qui déclare.
 *
 * Elle partage la colonne vertébrale « identité société » de l'armement
 * (raison sociale, sigle, RCCM/NIF, pays d'immatriculation, adresse) et y
 * ajoute ses coordonnées propres.
 *
 * `titulaire_user_id` désigne le **compte maître** (WF1) : la personne qui
 * gère la société sur le portail. Nullable, car la fiche société est créée par
 * le CGC avant que le compte du titulaire n'existe ; unique, car un même
 * compte ne peut être titulaire de deux sociétés. `nullOnDelete` : supprimer
 * un compte ne doit jamais emporter la société facturée.
 *
 * `actif` (ADR-0012) : on désactive, on ne supprime pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consignataires', function (Blueprint $table) {
            $table->id();
            $table->string('name');                  // raison sociale
            $table->string('sigle')->nullable();     // nom court / acronyme
            $table->string('rccm_nif')->nullable();  // registre de commerce / identifiant fiscal
            $table->foreignId('pays_immatriculation_id')->nullable()->constrained('pays')->nullOnDelete();
            $table->string('adresse')->nullable();
            $table->string('telephone', 30)->nullable();
            $table->string('email')->nullable();
            $table->foreignId('titulaire_user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // PostgreSQL n'indexe pas les FK automatiquement ; `titulaire_user_id`
            // l'est déjà par sa contrainte d'unicité.
            $table->index('pays_immatriculation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consignataires');
    }
};
