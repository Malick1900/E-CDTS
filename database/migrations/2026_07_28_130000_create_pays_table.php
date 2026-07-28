<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel « Pays » — source unique du pavillon d'un navire et des pays
 * d'origine / d'immatriculation d'un armement.
 *
 * Nommage : tables et colonnes métier en français (équipe francophone) ; on
 * conserve les colonnes natives / génériques (`id`, `name`, `code`,
 * `created_at`, `updated_at`) — cf. ADR nommage FR.
 *
 * `actif` (jamais de suppression dure, ADR-0012) : un pays désactivé disparaît
 * des menus sans casser l'historique qui le référence.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pays', function (Blueprint $table) {
            $table->id();
            $table->string('name');              // nom du pays (ex. Gabon)
            $table->string('code', 2)->unique(); // ISO 3166-1 alpha-2 (ex. GA)
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pays');
    }
};
