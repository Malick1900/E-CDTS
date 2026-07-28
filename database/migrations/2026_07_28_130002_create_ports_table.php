<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel « Port » — ports d'escale gérés par le CGC (Owendo GAOWE,
 * Port-Gentil GAPOG…). `code` = UN/LOCODE (identifiant international stable).
 *
 * `prefixe_numerotation` : préfixe optionnel appliqué à la numérotation des
 * pièces émises pour ce port (laissé libre tant que la règle n'est pas figée).
 * `pays_id` nullable : rattachement souple (les ports gérés sont gabonais, mais
 * on n'impose pas le lien).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ports', function (Blueprint $table) {
            $table->id();
            $table->string('name');               // nom du port (ex. Owendo)
            $table->string('code', 10)->unique(); // UN/LOCODE (ex. GAOWE)
            $table->foreignId('pays_id')->nullable()->constrained('pays')->nullOnDelete();
            $table->string('prefixe_numerotation', 10)->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ports');
    }
};
