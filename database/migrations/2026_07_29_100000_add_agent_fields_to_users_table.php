<?php

use App\Enums\StatutValidation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Compte agent consignataire (ADR-0013) : un agent est un compte `users`
 * rattaché à une société, dont l'ouverture passe par une validation du CGC.
 *
 * `consignataire_id` nul = compte interne CGC — c'est ce qui distingue les deux
 * populations dans la même table. `nullOnDelete` : la société se désactive au
 * lieu d'être supprimée (ADR-0012) ; si une suppression a malgré tout lieu, le
 * compte survit sans rattachement plutôt que de disparaître avec ses traces.
 *
 * `statut_validation` porte la décision du CGC, jamais l'activation : celle-ci
 * reste sur `is_active`, seule colonne lue à la connexion. En attente et refusé
 * sont donc inactifs, et rien ne change du côté de l'authentification.
 *
 * `valide_par_user_id` / `valide_le` / `motif_refus` forment la trace opposable
 * exigée par ADR-0024 : une décision refusée reste lisible en base. Elle n'est
 * remplacée que par la décision suivante — une nouvelle soumission ne l'efface
 * pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('consignataire_id')->nullable()->after('job_title')->constrained()->nullOnDelete();
            $table->string('statut_validation', 20)->nullable()->after('consignataire_id');
            $table->foreignId('valide_par_user_id')->nullable()->after('statut_validation')->constrained('users')->nullOnDelete();
            $table->timestamp('valide_le')->nullable()->after('valide_par_user_id');
            $table->text('motif_refus')->nullable()->after('valide_le');

            // PostgreSQL n'indexe pas les FK automatiquement. `statut_validation`
            // est indexé pour le décompte « comptes à valider » du bandeau admin.
            $table->index('consignataire_id');
            $table->index('valide_par_user_id');
            $table->index('statut_validation');
        });

        // Contraintes de cohérence — PostgreSQL uniquement, la suite de tests
        // tournant sur SQLite qui ne sait pas ajouter de CHECK après coup.
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $statuts = implode("', '", StatutValidation::values());

        // Le statut de validation n'a de sens que pour un compte client : les
        // deux colonnes sont nulles ensemble ou renseignées ensemble.
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_statut_validation_coherence CHECK ((consignataire_id IS NULL) = (statut_validation IS NULL))');
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_statut_validation_valide CHECK (statut_validation IS NULL OR statut_validation IN ('{$statuts}'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_statut_validation_valide');
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_statut_validation_coherence');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('valide_par_user_id');
            $table->dropConstrainedForeignId('consignataire_id');
            $table->dropColumn(['statut_validation', 'valide_le', 'motif_refus']);
        });
    }
};
