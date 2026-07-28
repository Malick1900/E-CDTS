<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profil d'un utilisateur interne CGC : identité détaillée (prénom / nom),
 * coordonnées et poste occupé, + état d'activation.
 *
 * `is_active` (ADR-0012) : on désactive au lieu de supprimer — un compte
 * inactif ne peut plus se connecter, la traçabilité est préservée.
 * Le champ `name` du starter kit est conservé (affichage / initiales) et
 * composé « Prénom Nom » par l'application.
 *
 * Colonnes ajoutées en nullable : la table peut déjà contenir des comptes ;
 * le caractère obligatoire est porté par la validation applicative.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone', 30)->nullable()->after('last_name');
            $table->string('job_title', 120)->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'phone', 'job_title', 'is_active']);
        });
    }
};
