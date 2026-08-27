<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La clé de rapprochement d'ADR-0009, côté situation portuaire.
 *
 * Le dossier d'escale portait déjà sa forme normalisée ; la ligne de situation
 * ne l'avait pas. Comparer imposait donc un `UPPER(REPLACE(...))` sur toute la
 * table à chaque rapprochement — non indexable, et surtout : une seule des deux
 * moitiés de la règle était écrite quelque part (ADR-0042).
 *
 * L'unicité de l'escale passe du voyage brut à sa forme normalisée : dans un
 * même port, « 26-114S » et « 26-114 s » ne sont pas deux escales du même
 * navire, c'est la même écrite deux fois.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mouvements_navire', function (Blueprint $table) {
            $table->string('voyage_normalise', 40)->nullable()->after('voyage');
        });

        $this->remplir();

        Schema::table('mouvements_navire', function (Blueprint $table) {
            $table->string('voyage_normalise', 40)->nullable(false)->change();
            $table->dropUnique('mouvements_navire_port_id_navire_id_voyage_unique');
            $table->unique(['port_id', 'navire_id', 'voyage_normalise'], 'mouvements_navire_escale_unique');
            // Le rapprochement part du navire et du voyage, sans le port : un
            // voyage ne dessert qu'un port (ADR-0009).
            $table->index(['navire_id', 'voyage_normalise']);
        });
    }

    public function down(): void
    {
        Schema::table('mouvements_navire', function (Blueprint $table) {
            $table->dropIndex(['navire_id', 'voyage_normalise']);
            $table->dropUnique('mouvements_navire_escale_unique');
            $table->unique(['port_id', 'navire_id', 'voyage'], 'mouvements_navire_port_id_navire_id_voyage_unique');
            $table->dropColumn('voyage_normalise');
        });
    }

    /**
     * Reprise des lignes déjà inscrites. La règle est recopiée ici plutôt
     * qu'appelée sur le modèle : une migration est un fait daté, elle doit
     * continuer de rejouer à l'identique même si le code évolue. Elle est le
     * miroir de `NormaliseLeVoyage::normaliserVoyage()` au 2026-08-27.
     */
    private function remplir(): void
    {
        DB::table('mouvements_navire')
            ->select('id', 'voyage')
            ->orderBy('id')
            ->chunk(500, function ($lignes): void {
                foreach ($lignes as $ligne) {
                    DB::table('mouvements_navire')
                        ->where('id', $ligne->id)
                        ->update([
                            'voyage_normalise' => preg_replace('/\s+/u', '', mb_strtoupper(trim((string) $ligne->voyage))) ?? '',
                        ]);
                }
            });
    }
};
