<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le n° de manifeste n'est plus saisi : e-CDTS l'attribue (ADR-0046).
 *
 * Il devient donc nullable, parce qu'il n'existe pas dès la création. Un
 * manifeste en cours de saisie manuelle n'a pas encore de numéro — le dossier
 * reste sous son **numéro provisoire** tant que la saisie n'est pas transmise.
 * En import XML, le numéro est attribué au dépôt : le manifeste est acquis d'un
 * coup.
 *
 * Attendre pour numéroter n'est pas une commodité : c'est ce qui empêche un
 * brouillon abandonné de trouer la séquence. Un numéro attribué est un numéro
 * qui a circulé.
 *
 * L'unicité est posée au passage. Elle ne l'était pas quand le numéro venait
 * du consignataire — deux dossiers pouvaient légitimement recopier le même
 * n° papier. Maintenant que la séquence est nôtre, un doublon serait un bug.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manifestes', function (Blueprint $table) {
            $table->string('numero', 64)->nullable()->change();
            $table->unique('numero');
        });
    }

    public function down(): void
    {
        Schema::table('manifestes', function (Blueprint $table) {
            $table->dropUnique(['numero']);
            $table->string('numero', 64)->nullable(false)->change();
        });
    }
};
