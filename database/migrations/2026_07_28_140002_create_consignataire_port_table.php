<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ports de rattachement d'un consignataire (ADR-0014) : Owendo, Port-Gentil,
 * ou les deux. Une société peut donc opérer sur plusieurs places portuaires.
 *
 * Mêmes conventions que `armement_consignataire` : clé primaire composite,
 * `cascade` explicite des deux côtés.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consignataire_port', function (Blueprint $table) {
            $table->foreignId('consignataire_id')->constrained()->cascadeOnDelete();
            $table->foreignId('port_id')->constrained()->cascadeOnDelete();
            $table->primary(['consignataire_id', 'port_id']);
            $table->index('port_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consignataire_port');
    }
};
