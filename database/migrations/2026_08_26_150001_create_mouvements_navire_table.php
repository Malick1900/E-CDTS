<?php

use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La situation portuaire : une ligne = le passage d'un navire pour un voyage.
 *
 * La ligne est PERSISTANTE, pas un instantané quotidien : elle naît quand le
 * navire est annoncé et vit jusqu'à sa sortie, en franchissant les six jalons.
 * C'est ce qui permet au dossier d'escale de la référencer et d'y lire ses
 * dates sans jamais les recopier (ADR-0009) — la date vit à un seul endroit.
 *
 * `publiee_at` porte l'état de validation d'ADR-0013 : nulle, la ligne est un
 * brouillon que seul le CGC voit ; datée, elle est publiée et diffusable. Toute
 * écriture la remet à null — une modification non republiée ne s'affiche pas
 * au dehors, et le verrou de transmission ne s'ouvre que sur du publié.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_navire', function (Blueprint $table) {
            $table->id();
            // Restrict des deux côtés : un port ou un navire cité par une
            // situation ne se supprime pas — il se désactive.
            $table->foreignId('port_id')->constrained('ports')->restrictOnDelete();
            $table->foreignId('navire_id')->constrained('navires')->restrictOnDelete();
            // Le n° de voyage n'est connu que du consignataire ; le CGC
            // l'apprend à la conférence (ADR-0009).
            $table->string('voyage', 40);
            $table->enum('sens', SensTrafic::values());
            $table->enum('statut', StatutNavire::values());
            $table->foreignId('poste_quai_id')->nullable()->constrained('postes_quai')->nullOnDelete();
            // Dates RÉELLES d'accostage et de départ, malgré les sigles
            // ETA/ETD que le port emploie par habitude (précisé par le CGC le
            // 2026-08-26) : c'est ce qui autorise le verrou d'ADR-0009 à les
            // lire telles quelles, sans colonne « confirmée » séparée.
            $table->timestampTz('eta')->nullable();
            $table->timestampTz('etd')->nullable();
            // Descriptif : dire qui représente le navire n'attribue aucun droit
            // d'édition sur la ligne, qui appartient au CGC.
            $table->foreignId('consignataire_id')->nullable()->constrained('consignataires')->nullOnDelete();
            $table->timestampTz('publiee_at')->nullable();
            $table->foreignId('publiee_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // L'escale est unique : le même navire ne fait pas deux fois le même
            // voyage dans le même port (contrôle du panneau d'ajout).
            $table->unique(['port_id', 'navire_id', 'voyage']);
            // La seule lecture de cette table : la situation d'un port, filtrée
            // par statut.
            $table->index(['port_id', 'statut']);
            $table->index('consignataire_id');
            $table->index('poste_quai_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_navire');
    }
};
