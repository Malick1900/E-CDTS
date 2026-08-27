<?php

use App\Enums\EtapeDossier;
use App\Enums\SensTrafic;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le dossier d'escale — le passage d'un navire vu par un consignataire, pour
 * un sens de trafic. C'est le conteneur de tout le circuit jusqu'à la clôture,
 * et le point de rattachement du manifeste (ENTITES §2).
 *
 * Deux identités cohabitent, comme ADR-0008 l'exige. `reference` est
 * l'identifiant stable : elle naît à l'ouverture, ne change jamais, et c'est
 * elle que le devis, le PV et le journal d'audit citeront. `numero_affiche`
 * est le libellé métier : nul tant que le dossier n'a pas de manifeste — l'UI
 * montre alors la référence marquée « provisoire » — puis figé au n° de
 * manifeste au premier rattachement. Rien ne s'appuie jamais sur ce libellé.
 *
 * `voyage_normalise` porte la clé de rapprochement d'ADR-0009 : MAJUSCULES
 * sans espaces, tirets conservés. C'est par elle que le dossier retrouvera sa
 * ligne de situation portuaire, et donc ses dates réelles — qu'il ne recopie
 * jamais : `mouvement_navire_id` est une référence, pas une copie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escales', function (Blueprint $table) {
            $table->id();

            // Les deux notions d'ADR-0008. La référence est unique par
            // construction ; le libellé affiché ne l'est pas — deux
            // consignataires d'un même navire portent le même n° de manifeste.
            $table->string('reference', 32)->unique();
            $table->string('numero_affiche', 64)->nullable();
            $table->timestampTz('numero_fige_le')->nullable();

            // La société est facturée et règle la CDTS (ENTITES §1) : un
            // consignataire cité par un dossier ne se supprime pas.
            $table->foreignId('consignataire_id')->constrained('consignataires')->restrictOnDelete();
            // Qui a ouvert, pour la trace : le titulaire ou l'un de ses agents.
            // Le dossier appartient à la société, pas à la personne — d'où le
            // périmètre calculé sur `consignataire_id`, jamais sur celui-ci.
            $table->foreignId('ouvert_par')->nullable()->constrained('users')->nullOnDelete();

            $table->foreignId('navire_id')->constrained('navires')->restrictOnDelete();
            // Recopié du navire à l'ouverture, mais porté par le dossier : le
            // consignataire peut représenter un autre armement sur ce passage.
            $table->foreignId('armement_id')->nullable()->constrained('armements')->nullOnDelete();

            // Détenu par le consignataire, saisi une fois puis sélectionné
            // (ADR-0009). La forme normalisée est ce que l'on compare.
            $table->string('voyage', 40);
            $table->string('voyage_normalise', 40);
            $table->enum('sens', SensTrafic::values());

            $table->foreignId('port_id')->constrained('ports')->restrictOnDelete();
            $table->foreignId('poste_quai_id')->nullable()->constrained('postes_quai')->nullOnDelete();

            // La seule date que le dossier détient en propre : l'annonce du
            // consignataire à l'ouverture. Les dates RÉELLES d'accostage et de
            // départ vivent à la situation portuaire et s'y lisent (ADR-0009).
            $table->timestampTz('eta_prevue')->nullable();

            // Le rapprochement d'ADR-0009. Nul tant que le navire n'est pas
            // annoncé à la conférence — le dossier s'ouvre souvent avant.
            $table->foreignId('mouvement_navire_id')->nullable()->constrained('mouvements_navire')->nullOnDelete();

            $table->enum('etape', EtapeDossier::values())->default(EtapeDossier::Ouvert->value);

            // Recopié du navire à la création, modifiable par le seul CGC
            // (ENTITES §2). La facturation bois lit CE champ, jamais celui du
            // navire.
            $table->string('mode_exploitation')->nullable();

            // Posé par le devis (ADR-0006), donc nul jusqu'à son émission. En
            // francs CFA : une devise sans subdivision, d'où l'entier.
            $table->unsignedBigInteger('montant_liquide')->nullable();

            $table->timestampTz('ouvert_le');
            $table->timestamps();

            // Un dossier par sens (WF3) : le même consignataire n'ouvre pas
            // deux fois le même voyage dans le même sens. Sur la forme
            // normalisée — c'est elle qui fait foi pour la comparaison.
            $table->unique(['consignataire_id', 'navire_id', 'voyage_normalise', 'sens'], 'escales_passage_unique');

            // La lecture de l'écran d'accueil : les dossiers d'une société, les
            // plus récents d'abord.
            $table->index(['consignataire_id', 'ouvert_le']);
            // Le rapprochement d'ADR-0009 part du navire et du voyage.
            $table->index(['navire_id', 'voyage_normalise']);
            $table->index(['port_id', 'etape']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escales');
    }
};
