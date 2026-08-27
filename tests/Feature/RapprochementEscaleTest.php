<?php

namespace Tests\Feature;

use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le rapprochement dossier d'escale ↔ situation portuaire (ADR-0009, ADR-0042).
 *
 * Ce que ces tests protègent, dans l'ordre de ce qui coûterait le plus cher :
 *
 * 1. la symétrie — le lien se pose quel que soit l'ordre d'arrivée ; ne tenir
 *    qu'un des deux sens laisserait orphelin le cas le plus courant, celui du
 *    dossier ouvert avant l'annonce du navire ;
 * 2. le refus de deviner — deux lignes homonymes ne se départagent pas seules ;
 *    un dossier rattaché au mauvais navire se liquiderait sur les mauvaises
 *    dates, et rien ne le signalerait ;
 * 3. la frontière rapprochement / verrou — identifier la ligne n'est pas
 *    autoriser la transmission : le lien se pose sur du brouillon, le verrou
 *    ne lit que du publié (ADR-0013) ;
 * 4. l'indifférence au sens — import et export d'un même passage pointent la
 *    MÊME ligne, chacun y lisant sa propre date.
 */
class RapprochementEscaleTest extends TestCase
{
    use RefreshDatabase;

    private Port $port;

    private Navire $navire;

    private Consignataire $societe;

    protected function setUp(): void
    {
        parent::setUp();

        $this->port = Port::factory()->create(['code' => 'GAOWE', 'prefixe_numerotation' => 'OWD']);
        $this->navire = Navire::factory()->create(['name' => 'Maersk Cadiz']);
        $this->societe = Consignataire::factory()->create();
    }

    /** @param  array<string, mixed>  $attributs */
    private function dossier(array $attributs = []): Escale
    {
        return Escale::factory()->create([
            'consignataire_id' => $this->societe->id,
            'navire_id' => $this->navire->id,
            'port_id' => $this->port->id,
            'voyage' => '26-114S',
            'sens' => SensTrafic::Import,
            ...$attributs,
        ]);
    }

    /** @param  array<string, mixed>  $attributs */
    private function ligne(array $attributs = []): MouvementNavire
    {
        return MouvementNavire::factory()->create([
            'port_id' => $this->port->id,
            'navire_id' => $this->navire->id,
            'voyage' => '26-114S',
            ...$attributs,
        ]);
    }

    // ── Les deux sens de l'arrivée ───────────────────────────────────────

    public function test_le_dossier_ouvert_apres_l_annonce_du_navire_se_rapproche_a_sa_creation(): void
    {
        $ligne = $this->ligne();
        $escale = $this->dossier();

        $this->assertSame($ligne->id, $escale->fresh()->mouvement_navire_id);
    }

    public function test_le_navire_annonce_apres_l_ouverture_rapproche_le_dossier_qui_l_attendait(): void
    {
        // Le cas le plus courant : le consignataire anticipe (WF3).
        $escale = $this->dossier();
        $this->assertTrue($escale->enAttenteDeRapprochement());

        $ligne = $this->ligne();

        $this->assertSame($ligne->id, $escale->fresh()->mouvement_navire_id);
    }

    public function test_l_inscription_d_un_navire_rapproche_tous_les_dossiers_en_attente(): void
    {
        $autreSociete = Consignataire::factory()->create();

        // Deux consignataires sur le même passage : chacun a son dossier
        // indépendant (WF3), tous deux pointent la même ligne.
        $sien = $this->dossier();
        $autre = $this->dossier(['consignataire_id' => $autreSociete->id]);

        $ligne = $this->ligne();

        $this->assertSame($ligne->id, $sien->fresh()->mouvement_navire_id);
        $this->assertSame($ligne->id, $autre->fresh()->mouvement_navire_id);
    }

    // ── La clé ───────────────────────────────────────────────────────────

    public function test_la_normalisation_joue_des_deux_cotes(): void
    {
        // Le port note « 26-114 s », le consignataire « 26-114S ». C'est le
        // même passage (ADR-0009).
        $ligne = $this->ligne(['voyage' => '26-114 s']);
        $escale = $this->dossier(['voyage' => ' 26-114S ']);

        $this->assertSame('26-114S', $ligne->fresh()->voyage_normalise);
        $this->assertSame($ligne->id, $escale->fresh()->mouvement_navire_id);
    }

    public function test_import_et_export_du_meme_passage_pointent_la_meme_ligne(): void
    {
        $ligne = $this->ligne(['sens' => SensTrafic::Import]);

        $import = $this->dossier(['sens' => SensTrafic::Import]);
        $export = $this->dossier(['sens' => SensTrafic::Export]);

        // Le sens n'entre pas dans la clé : chacun lira sa propre date sur la
        // même ligne (ADR-0009).
        $this->assertSame($ligne->id, $import->fresh()->mouvement_navire_id);
        $this->assertSame($ligne->id, $export->fresh()->mouvement_navire_id);
    }

    public function test_un_voyage_different_ne_rapproche_pas(): void
    {
        $this->ligne(['voyage' => '26-120S']);
        $escale = $this->dossier(['voyage' => '26-114S']);

        $this->assertTrue($escale->fresh()->enAttenteDeRapprochement());
    }

    public function test_un_autre_navire_ne_rapproche_pas(): void
    {
        $this->ligne(['navire_id' => Navire::factory()->create()->id]);
        $escale = $this->dossier();

        $this->assertTrue($escale->fresh()->enAttenteDeRapprochement());
    }

    // ── Le refus de deviner ──────────────────────────────────────────────

    public function test_deux_lignes_homonymes_dans_deux_ports_laissent_le_dossier_en_attente(): void
    {
        $autrePort = Port::factory()->create(['code' => 'GAPOG']);

        $this->ligne();
        $this->ligne(['port_id' => $autrePort->id]);

        $escale = $this->dossier();

        // Mieux vaut un dossier en attente qu'un dossier rattaché au mauvais
        // navire : le filet manuel tranchera (ADR-0009).
        $this->assertTrue($escale->fresh()->enAttenteDeRapprochement());
    }

    public function test_un_rapprochement_acquis_ne_se_rejoue_pas(): void
    {
        $premiere = $this->ligne();
        $escale = $this->dossier();
        $this->assertSame($premiere->id, $escale->fresh()->mouvement_navire_id);

        // Une seconde ligne homonyme apparaît dans un autre port : le dossier
        // déjà instruit ne change pas de ligne sous ses pieds.
        $autrePort = Port::factory()->create(['code' => 'GAPOG']);
        $this->ligne(['port_id' => $autrePort->id]);

        $this->assertSame($premiere->id, $escale->fresh()->mouvement_navire_id);
    }

    // ── Rapprochement ≠ verrou ───────────────────────────────────────────

    public function test_le_lien_se_pose_sur_une_ligne_encore_en_brouillon(): void
    {
        // Identifier la ligne n'est pas l'opposer : c'est `publiee_at` qui
        // commande le verrou de transmission (ADR-0013). Attendre la
        // publication enverrait le consignataire sur l'écran « en attente de
        // rapprochement » pour rien.
        $ligne = $this->ligne(['publiee_at' => null]);
        $escale = $this->dossier();

        $this->assertSame($ligne->id, $escale->fresh()->mouvement_navire_id);
        $this->assertNull($ligne->fresh()->publiee_at);
    }

    // ── L'unicité de la ligne, sur la forme normalisée ───────────────────

    public function test_le_meme_voyage_autrement_ecrit_n_est_pas_une_seconde_escale(): void
    {
        $this->ligne(['voyage' => '26-114S', 'statut' => StatutNavire::Attendu]);

        $this->expectException(QueryException::class);

        // Même port, même navire, même voyage normalisé : c'est la même ligne.
        $this->ligne(['voyage' => '26-114 s']);
    }
}
