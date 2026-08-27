<?php

use App\Enums\EtatManifeste;
use App\Enums\ModeSaisieManifeste;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le manifeste rattaché à un dossier d'escale (WF4).
 *
 * `numero` est ce qui fige le libellé du dossier : au premier rattachement, le
 * numéro affiché de l'escale cesse d'être provisoire et devient celui-ci
 * (ADR-0008). Il est extrait du XML en mode import, saisi par le consignataire
 * en mode manuel — requis dans les deux cas, sans quoi le dossier n'aurait
 * jamais d'identité opposable.
 *
 * La pièce jointe n'est pas un agrément : en saisie manuelle, le PDF est
 * **obligatoire et bloquant** — pas de PDF, pas de transmission — et il vaut
 * preuve de ce qui a été saisi. L'agent CGC le rejouera ligne par ligne. En
 * mode XML, le fichier déposé joue le même rôle et ces colonnes restent nulles.
 *
 * Un dossier n'a qu'un manifeste tant que le circuit n'est pas allé jusqu'au PV
 * validé — d'où la contrainte d'unicité. Elle tombera quand viendra le régime
 * des manifestes additifs et rectificatifs, qui portent le MÊME numéro et
 * cohabitent sous un dossier rouvert (WF4, §Deux régimes de correction).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manifestes', function (Blueprint $table) {
            $table->id();

            // Le manifeste n'existe que par son dossier : le supprimer sans
            // lui n'aurait pas de sens, mais un dossier cité ne s'efface pas.
            $table->foreignId('escale_id')->unique()->constrained('escales')->restrictOnDelete();

            // Le n° officiel du manifeste — celui que le dossier portera.
            $table->string('numero', 64);

            $table->enum('mode_saisie', ModeSaisieManifeste::values());
            $table->enum('etat', EtatManifeste::values())->default(EtatManifeste::Brouillon->value);

            // La pièce probante du mode manuel. Un seul fichier, multi-pages,
            // qui reste attaché au dossier même après clôture.
            $table->string('piece_jointe_chemin')->nullable();
            $table->string('piece_jointe_nom')->nullable();
            $table->unsignedBigInteger('piece_jointe_octets')->nullable();

            // Qui a déposé, pour la trace. Le manifeste appartient au dossier,
            // donc à la société — pas à la personne.
            $table->foreignId('depose_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('transmis_le')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manifestes');
    }
};
