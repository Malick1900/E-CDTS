<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le connaissement — la MAILLE DE FACTURATION du manifeste.
 *
 * Le tableau s'affiche à plat, une ligne par conteneur ; mais poids et volume
 * vivent ici, au niveau du BL, et ne se répètent jamais par boîte. C'est la
 * première des trois règles de totaux de `MANIFESTE-XML.md` : les confondre
 * ferait exploser le tonnage d'un manifeste conteneurisé.
 *
 * `hors_conteneur` dit si ce BL porte de la marchandise qui n'est dans aucune
 * boîte — un BL de vrac (aucun conteneur annoncé), ou un BL mixte dont le
 * parseur a détecté un résidu. C'est cette part-là que `type_marchandise`
 * qualifie, et elle seule : les conteneurs portent leur propre qualification.
 * Un BL purement conteneurisé laisse les deux à leur valeur nulle.
 *
 * `master_reference` est le repère du groupage : vide sur un BL simple,
 * renseigné sur un house/dégroupage.
 *
 * @see docs/MANIFESTE-XML.md §Maille d'affichage vs maille de facturation
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manifeste_bls', function (Blueprint $table) {
            $table->id();

            // Un BL n'a aucune vie hors de son manifeste : il part avec lui.
            $table->foreignId('manifeste_id')->constrained('manifestes')->cascadeOnDelete();

            $table->string('reference', 64);
            $table->unsignedInteger('ligne_numero')->nullable();
            $table->string('master_reference', 64)->nullable();

            // Les ports RÉELS du BL (transbordement compris), distincts du port
            // gabonais de rattachement que porte le dossier.
            $table->string('port_chargement', 8)->nullable();
            $table->string('port_chargement_nom')->nullable();
            $table->string('port_dechargement', 8)->nullable();
            $table->string('port_dechargement_nom')->nullable();

            $table->string('expediteur')->nullable();
            $table->string('destinataire')->nullable();

            // La description porte la catégorisation, les indices sec/frigo et,
            // selon le profil du transporteur, le BIETC noyé dans le texte.
            $table->text('description')->nullable();

            // Les trois assiettes, au niveau BL. Nulles quand le manifeste ne
            // les donne pas — et une assiette absente n'est pas une assiette à
            // zéro : la ligne reste à qualifier.
            $table->unsignedBigInteger('poids_brut_kg')->nullable();
            $table->decimal('volume_m3', 12, 3)->nullable();
            $table->unsignedInteger('colis')->nullable();

            // Ce que le manifeste ANNONCE, à confronter aux conteneurs
            // réellement listés : l'écart est ce qui trahit un BL mixte.
            $table->unsignedInteger('conteneurs_annonces')->default(0);
            $table->boolean('hors_conteneur')->default(false);

            // La qualification de la part hors conteneur, et d'elle seule.
            $table->string('type_marchandise')->nullable();

            $table->timestamps();

            // La lecture du tableau : les BL d'un manifeste, dans leur ordre.
            $table->index(['manifeste_id', 'ligne_numero']);
            // La recherche par n° de connaissement, depuis la barre d'outils.
            $table->index(['manifeste_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manifeste_bls');
    }
};
