<?php

namespace Tests\Feature;

use App\Actions\Liquidation\LiquideLeManifeste;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;
use App\Models\Navire;
use App\Models\Port;
use Database\Seeders\BaremeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le dépliage d'un manifeste en lignes de tableau (ADR-0044).
 *
 * Un manifeste est un arbre — des connaissements, et sous chacun ses boîtes ;
 * le tableau de dépouillement est une liste plate. Trois règles gouvernent le
 * passage de l'un à l'autre, et aucune n'est cosmétique :
 *
 * 1. **Poids et volume ne se répètent pas.** Ils sont au niveau du BL. Les
 *    porter sur chaque boîte triplerait le tonnage d'un BL à trois conteneurs
 *    — et le devis avec.
 * 2. **Le montant suit le moteur.** Un forfait se compte par boîte ; une
 *    assiette (tonne, m³, unité) se compte une seule fois, au BL.
 * 3. **Les conteneurs se comptent en références distinctes.** Une boîte
 *    groupée figure sous plusieurs connaissements sans valoir plusieurs boîtes.
 *
 * Une erreur sur l'une de ces trois ne se voit pas à l'écran : elle se voit sur
 * la facture, et trop tard.
 */
class DepliageManifesteTest extends TestCase
{
    use RefreshDatabase;

    private LiquideLeManifeste $deplie;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BaremeSeeder::class);
        $this->deplie = app(LiquideLeManifeste::class);
    }

    private function manifeste(SensTrafic $sens = SensTrafic::Import): Manifeste
    {
        // Un seul port pour tout le fichier : deux manifestes de sens
        // opposes partagent le meme quai, et le code de port est unique.
        $port = Port::query()->firstWhere('code', 'GAOWE')
            ?? Port::factory()->create(['code' => 'GAOWE', 'name' => 'Owendo']);

        $escale = Escale::factory()->create([
            'navire_id' => Navire::factory(),
            'port_id' => $port->id,
            'sens' => $sens,
        ]);

        return Manifeste::factory()->create(['escale_id' => $escale->id]);
    }

    /**
     * Un manifeste d'export sur une escale dont le mode d'exploitation est
     * connu — ce que le bois exige pour se facturer.
     */
    private function manifesteExport(ModeExploitation $mode): Manifeste
    {
        $manifeste = $this->manifeste(SensTrafic::Export);
        $manifeste->escale->update(['mode_exploitation' => $mode]);

        return $manifeste->fresh() ?? $manifeste;
    }

    /**
     * @param  array<string, mixed>  $attributs
     */
    private function bl(Manifeste $manifeste, array $attributs = []): ManifesteBl
    {
        return ManifesteBl::factory()->create([
            'manifeste_id' => $manifeste->id,
            ...$attributs,
        ]);
    }

    // ── Règle 1 : poids et volume ne se répètent pas ─────────────────────

    public function test_un_bl_a_trois_boites_donne_trois_lignes_mais_un_seul_poids(): void
    {
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, ['poids_brut_kg' => 60_000, 'volume_m3' => 90]);

        ManifesteConteneur::factory()->count(3)->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::Conteneur40S,
        ]);

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertCount(3, $lignes);

        $porteuses = array_filter($lignes, fn ($l): bool => $l->poidsKg !== null);
        $this->assertCount(1, $porteuses, 'Le poids du BL ne doit être porté que par une seule ligne.');

        // Le total compte le BL une fois, pas une fois par boîte.
        $this->assertSame(60_000, $totaux->poidsKg);
        $this->assertSame(90.0, $totaux->volumeM3);
        $this->assertSame(1, $totaux->bls);
    }

    public function test_le_tonnage_total_somme_les_bl_et_non_les_lignes(): void
    {
        $manifeste = $this->manifeste();

        foreach ([40_000, 25_000] as $poids) {
            $bl = $this->bl($manifeste, ['poids_brut_kg' => $poids, 'volume_m3' => 50]);
            ManifesteConteneur::factory()->count(2)->create([
                'manifeste_bl_id' => $bl->id,
                'taille' => 20,
                'type_marchandise' => TypeMarchandise::Conteneur20S,
            ]);
        }

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertCount(4, $lignes);
        $this->assertSame(65_000, $totaux->poidsKg);
        $this->assertSame(100.0, $totaux->volumeM3);
    }

    // ── Règle 2 : le montant suit le moteur ──────────────────────────────

    public function test_chaque_boite_porte_son_forfait(): void
    {
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, ['poids_brut_kg' => 60_000]);

        ManifesteConteneur::factory()->count(3)->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::Conteneur40S,
        ]);

        ['totaux' => $totaux] = $this->deplie->handle($manifeste);

        // IMP06 : 30 016,59 F la boîte, trois fois.
        $this->assertSame(3 * 30_017, $totaux->montant);
        $this->assertSame(3, $totaux->qualifiees);
        $this->assertSame(0, $totaux->aQualifier);
    }

    public function test_une_part_vrac_ne_se_facture_qu_une_fois_sur_l_assiette_du_bl(): void
    {
        $manifeste = $this->manifeste();
        $this->bl($manifeste, [
            'poids_brut_kg' => 100_000,
            'volume_m3' => 50,
            'conteneurs_annonces' => 0,
            'hors_conteneur' => true,
            'type_marchandise' => TypeMarchandise::VracSolide,
        ]);

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertCount(1, $lignes);
        $this->assertNull($lignes[0]->conteneur);
        // 100 t à 1 312 F l'emportent sur 50 m³ à 984 F.
        $this->assertSame(131_200, $totaux->montant);
        $this->assertSame('IMP17', $lignes[0]->liquidation?->reference);
    }

    public function test_un_bl_mixte_donne_une_ligne_par_boite_plus_une_ligne_vrac(): void
    {
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, [
            'poids_brut_kg' => 80_000,
            'volume_m3' => 40,
            'colis' => 12,
            'conteneurs_annonces' => 2,
            'hors_conteneur' => true,
            'type_marchandise' => TypeMarchandise::VehiculeTourisme,
        ]);

        ManifesteConteneur::factory()->count(2)->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 20,
            'type_marchandise' => TypeMarchandise::Conteneur20S,
        ]);

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertCount(3, $lignes);

        // Les assiettes se lisent sur la ligne qui les facture — la ligne vrac.
        $this->assertNull($lignes[0]->poidsKg);
        $this->assertNull($lignes[1]->poidsKg);
        $this->assertSame(80_000, $lignes[2]->poidsKg);
        $this->assertNull($lignes[2]->conteneur);

        // Deux forfaits 20′ import (16 372,68) + 12 véhicules (13 643,90).
        $this->assertSame(2 * 16_373 + 163_727, $totaux->montant);
    }

    public function test_une_boite_qualifiee_d_un_type_sans_forfait_facture_l_assiette_du_bl(): void
    {
        // Une boîte qualifiée d'un type qui ne se facture pas au conteneur
        // réclame l'assiette de son connaissement, elle ne génère pas de
        // forfait. Le poids appartient au BL : il se facture une fois.
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, ['poids_brut_kg' => 60_000, 'volume_m3' => null]);

        ManifesteConteneur::factory()->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::VracSolide,
        ]);

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        // 60 t × 1 312 F (IMP17, vrac solide métrique import).
        $this->assertNotNull($lignes[0]->liquidation);
        $this->assertSame('IMP17', $lignes[0]->liquidation->reference);
        $this->assertSame(78_720, $totaux->montant);
        $this->assertSame(0, $totaux->aQualifier);
    }

    public function test_le_bois_en_conteneurs_se_facture_au_metre_cube_une_seule_fois(): void
    {
        // La particularité du bois (CGC, 2026-08-27) : il ne se facture JAMAIS
        // au conteneur. Trois boîtes de bois débité pour 100 m³, ce sont
        // 100 m³ facturés — pas trois forfaits.
        $manifeste = $this->manifesteExport(ModeExploitation::Tramping);
        $bl = $this->bl($manifeste, [
            'poids_brut_kg' => 74_000,
            'volume_m3' => 100.0,
        ]);

        ManifesteConteneur::factory()->count(3)->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::BoisConteneurise,
        ]);

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertCount(3, $lignes);

        // 100 m³ × 1 909 F (EXP17, bois conteneurisé tramping) — UNE fois.
        $this->assertSame(190_900, $totaux->montant);
        $this->assertNotNull($lignes[0]->liquidation);
        $this->assertSame('EXP17', $lignes[0]->liquidation->reference);
        $this->assertSame(190_900, $lignes[0]->liquidation->montant);

        // Les deux autres boîtes sont déclarées, pas facturées séparément :
        // elles ne comptent pas parmi les lignes à qualifier.
        $this->assertNull($lignes[1]->liquidation);
        $this->assertTrue($lignes[1]->porteeParLeBl);
        $this->assertFalse($lignes[1]->aQualifier());
        $this->assertSame(0, $totaux->aQualifier);
        $this->assertSame(3, $totaux->qualifiees);

        // Trois forfaits 40' export auraient fait 81 863 F : plus de deux fois
        // moins. C'est exactement ce que la règle du bois évite.
        $this->assertGreaterThan(3 * 27_288, $totaux->montant);
    }

    public function test_deux_types_qui_reclament_la_meme_assiette_ne_se_facturent_pas(): void
    {
        // Le manifeste donne UN poids et UN volume pour tout le connaissement,
        // sans dire ce qui revient à quoi. Les répartir serait une devinette.
        $manifeste = $this->manifesteExport(ModeExploitation::Tramping);
        $bl = $this->bl($manifeste, ['volume_m3' => 100.0]);

        ManifesteConteneur::factory()->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::BoisConteneurise,
        ]);
        ManifesteConteneur::factory()->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::VracSolide,
        ]);

        ['totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertSame(0, $totaux->montant);
        $this->assertSame(2, $totaux->aQualifier);
    }

    // ── Règle 3 : les boîtes se comptent en références distinctes ────────

    public function test_une_boite_groupee_sous_deux_bl_ne_compte_qu_une_fois(): void
    {
        $manifeste = $this->manifeste();
        $partagee = 'GABU1234567';

        foreach (['GABX-260001', 'GABX-260002'] as $reference) {
            $bl = $this->bl($manifeste, [
                'reference' => $reference,
                'master_reference' => 'MSTR-260001',
                'poids_brut_kg' => 12_000,
            ]);

            ManifesteConteneur::factory()->create([
                'manifeste_bl_id' => $bl->id,
                'reference' => $partagee,
                'taille' => 40,
                'type_marchandise' => TypeMarchandise::Conteneur40S,
            ]);
        }

        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($manifeste);

        // Deux lignes affichées — une par connaissement — mais une seule boîte.
        $this->assertCount(2, $lignes);
        $this->assertSame(2, $totaux->bls);
        $this->assertSame(1, $totaux->conteneurs);
        $this->assertTrue($lignes[0]->groupage);
    }

    // ── La transmission ──────────────────────────────────────────────────

    public function test_une_ligne_non_qualifiee_bloque_la_transmission(): void
    {
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, ['poids_brut_kg' => 60_000]);

        ManifesteConteneur::factory()->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::Conteneur40S,
        ]);
        ManifesteConteneur::factory()->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => null,
            'type_marchandise' => null,
        ]);

        ['totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertSame(1, $totaux->qualifiees);
        $this->assertSame(1, $totaux->aQualifier);
        $this->assertFalse($totaux->transmissible());
    }

    public function test_un_manifeste_entierement_qualifie_est_transmissible(): void
    {
        $manifeste = $this->manifeste();
        $bl = $this->bl($manifeste, ['poids_brut_kg' => 60_000]);

        ManifesteConteneur::factory()->count(2)->create([
            'manifeste_bl_id' => $bl->id,
            'taille' => 40,
            'type_marchandise' => TypeMarchandise::Conteneur40S,
        ]);

        ['totaux' => $totaux] = $this->deplie->handle($manifeste);

        $this->assertSame(0, $totaux->aQualifier);
        $this->assertTrue($totaux->transmissible());
    }

    public function test_un_manifeste_vide_n_est_pas_transmissible(): void
    {
        ['lignes' => $lignes, 'totaux' => $totaux] = $this->deplie->handle($this->manifeste());

        $this->assertSame([], $lignes);
        $this->assertFalse($totaux->transmissible());
    }

    // ── Le sens du dossier commande le tarif ─────────────────────────────

    public function test_le_meme_conteneur_ne_coute_pas_pareil_a_l_import_et_a_l_export(): void
    {
        $montants = [];

        foreach ([SensTrafic::Import, SensTrafic::Export] as $sens) {
            $manifeste = $this->manifeste($sens);
            $bl = $this->bl($manifeste, ['poids_brut_kg' => 20_000]);

            ManifesteConteneur::factory()->create([
                'manifeste_bl_id' => $bl->id,
                'taille' => 40,
                'type_marchandise' => TypeMarchandise::Conteneur40S,
            ]);

            ['totaux' => $totaux] = $this->deplie->handle($manifeste);
            $montants[$sens->value] = $totaux->montant;
        }

        // IMP06 à 30 016,59 contre EXP06 à 27 287,81.
        $this->assertSame(30_017, $montants['import']);
        $this->assertSame(27_288, $montants['export']);
    }
}
