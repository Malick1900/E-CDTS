<?php

use App\Enums\SensTrafic;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le barème CDTS du CGC : une ligne = un article tarifé (ADR-0034).
 *
 * Le montant est tenu en francs CFA, comme le document officiel. L'euro n'est
 * pas stocké : il se déduit de la parité fixe (`config('cdts.taux_euro_cfa')`),
 * et deux colonnes pour une seule vérité finiraient par diverger — il suffirait
 * qu'on corrige le franc sans toucher l'euro.
 *
 * Les remises et taux appliqués que porte le document papier ne sont pas repris :
 * la plateforme n'affiche que les montants en vigueur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bareme_lignes', function (Blueprint $table) {
            $table->id();
            // Référence du document officiel : EXP01, EXP02B, IMP011…
            $table->string('reference')->unique();
            $table->enum('sens', SensTrafic::values());
            $table->string('designation');
            $table->decimal('montant_cfa', 12, 2);
            // Une ligne retirée de l'exploitation sans être effacée de la grille
            // — le geste courant, la suppression restant possible.
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // L'écran présente les deux volets séparément, chacun trié par
            // référence : c'est la seule lecture de cette table.
            $table->index(['sens', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bareme_lignes');
    }
};
