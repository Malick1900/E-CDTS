<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Les boîtes d'un connaissement — la maille du FORFAIT.
 *
 * Une ligne ici vaut une ligne du tableau de dépouillement et un forfait au
 * barème. `type_marchandise` y est pré-rempli sans intervention humaine quand
 * c'est possible : la taille vient du manifeste, le froid se déduit des mots
 * de la description. Quand la taille manque, la ligne reste à qualifier plutôt
 * que devinée.
 *
 * ⚠ `reference` n'est PAS unique, et ce n'est pas un oubli : un conteneur
 * groupé se répète à l'identique sous plusieurs BL — le manifeste AWMDS n'a
 * pas de lien explicite pour le dire. D'où la troisième règle de totaux :
 * le « nombre de conteneurs » d'un manifeste se compte en références
 * DISTINCTES, jamais en lignes.
 *
 * `tare_kg` est le poids à VIDE de la boîte (`Empty_weight`), pas celui de la
 * marchandise. Il ne sert qu'd'indice secondaire pour départager un frigo d'un
 * sec quand la description est muette.
 *
 * @see docs/MANIFESTE-XML.md §Groupage, §Points de vigilance parseur
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manifeste_conteneurs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('manifeste_bl_id')->constrained('manifeste_bls')->cascadeOnDelete();

            // ISO 6346 — « GABU 123456-7 ».
            $table->string('reference', 24);
            // La TAILLE seule (20 / 40 / 45) : le profil gabonais ne transmet
            // jamais le code ISO complet. Nulle si le profil est illisible.
            $table->unsignedTinyInteger('taille')->nullable();
            $table->unsignedInteger('colis')->nullable();
            $table->boolean('plein')->nullable();
            $table->unsignedInteger('tare_kg')->nullable();

            $table->string('type_marchandise')->nullable();

            $table->timestamps();

            $table->index('manifeste_bl_id');
            // Le comptage des boîtes distinctes, et la recherche par n°.
            $table->index('reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manifeste_conteneurs');
    }
};
