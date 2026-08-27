<?php

namespace Tests\Feature;

use App\Actions\Liquidation\LiquideUneLigne;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Enums\UniteBareme;
use App\Models\BaremeLigne;
use Database\Seeders\BaremeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le moteur de liquidation : ce qu'une ligne de manifeste coûte (ADR-0044).
 *
 * Ce que ces tests protègent, dans l'ordre de ce qui coûterait le plus cher :
 *
 * 1. la règle de l'unité payante — quand un type ouvre une ligne au métrique
 *    ET une au cubage, retenir la mauvaise fait perdre de l'argent au CGC à
 *    chaque dossier, sans que rien ne le signale ;
 * 2. la règle d'or — une assiette absente ne vaut pas zéro. Facturer à zéro un
 *    BL de véhicules dont le manifeste annonce « 0 colis » serait une perte
 *    silencieuse ; il doit remonter à l'opérateur ;
 * 3. le mode d'exploitation du bois export — ~13 % d'écart entre tramping et
 *    ligne régulière, sur des dossiers qui se comptent en dizaines de millions ;
 * 4. les types mono-sens de la nomenclature — proposer « bois » à l'import
 *    mènerait à une qualification qui ne trouve aucun tarif.
 */
class LiquidationBaremeTest extends TestCase
{
    use RefreshDatabase;

    private LiquideUneLigne $liquide;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BaremeSeeder::class);
        $this->liquide = app(LiquideUneLigne::class);
    }

    // ── Le forfait conteneur ─────────────────────────────────────────────

    public function test_un_conteneur_se_facture_au_forfait_de_sa_taille(): void
    {
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::Conteneur40S,
            sens: SensTrafic::Import,
            conteneurs: 1,
        );

        $this->assertNotNull($liquidation);
        $this->assertSame('IMP06', $liquidation->reference);
        $this->assertSame(UniteBareme::Forfait, $liquidation->unite);
        // 30 016,59 F la boîte — le franc n'a pas de subdivision.
        $this->assertSame(30_017, $liquidation->montant);
    }

    public function test_le_forfait_ne_regarde_ni_le_poids_ni_le_volume(): void
    {
        $legere = $this->liquide->handle(
            type: TypeMarchandise::Conteneur20S,
            sens: SensTrafic::Export,
            conteneurs: 1,
            poidsKg: 2_000,
            volumeM3: 4.0,
        );
        $lourde = $this->liquide->handle(
            type: TypeMarchandise::Conteneur20S,
            sens: SensTrafic::Export,
            conteneurs: 1,
            poidsKg: 26_000,
            volumeM3: 33.0,
        );

        $this->assertNotNull($legere);
        $this->assertNotNull($lourde);
        $this->assertSame($legere->montant, $lourde->montant);
    }

    // ── L'unité payante ──────────────────────────────────────────────────

    public function test_l_unite_payante_retient_le_cubage_quand_il_rapporte_plus(): void
    {
        // Vrac solide import : IMP17 à 1 312 F/t, IMP18 à 984 F/m³.
        // 100 t donnent 131 200 F ; 200 m³ donnent 196 800 F.
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::VracSolide,
            sens: SensTrafic::Import,
            poidsKg: 100_000,
            volumeM3: 200.0,
        );

        $this->assertNotNull($liquidation);
        $this->assertSame('IMP18', $liquidation->reference);
        $this->assertSame(UniteBareme::MetreCube, $liquidation->unite);
        $this->assertSame(196_800, $liquidation->montant);
    }

    public function test_l_unite_payante_retient_le_metrique_quand_il_rapporte_plus(): void
    {
        // Même barème, autre chargement : 100 t donnent 131 200 F ; 50 m³ en
        // donnent 49 200.
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::VracSolide,
            sens: SensTrafic::Import,
            poidsKg: 100_000,
            volumeM3: 50.0,
        );

        $this->assertNotNull($liquidation);
        $this->assertSame('IMP17', $liquidation->reference);
        $this->assertSame(131_200, $liquidation->montant);
    }

    public function test_une_seule_assiette_disponible_suffit(): void
    {
        // Le cas des vracs liquides SAGA : Gross_mass renseigné, pas de volume.
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::VracLiquide,
            sens: SensTrafic::Import,
            poidsKg: 340_000,
        );

        $this->assertNotNull($liquidation);
        $this->assertSame('IMP21', $liquidation->reference);
        $this->assertSame(446_080, $liquidation->montant);
    }

    // ── La règle d'or : on ne devine jamais ──────────────────────────────

    public function test_sans_assiette_la_ligne_reste_a_qualifier(): void
    {
        $this->assertNull($this->liquide->handle(
            type: TypeMarchandise::VracSolide,
            sens: SensTrafic::Import,
        ));
    }

    public function test_une_assiette_a_zero_vaut_absence_et_non_gratuite(): void
    {
        // Le cas RoRo : véhicules de tourisme, Number_of_packages à zéro. Les
        // facturer à zéro serait une perte silencieuse pour le CGC.
        $this->assertNull($this->liquide->handle(
            type: TypeMarchandise::VehiculeTourisme,
            sens: SensTrafic::Import,
            unites: 0,
        ));
    }

    public function test_un_vehicule_de_tourisme_se_facture_a_la_piece(): void
    {
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::VehiculeTourisme,
            sens: SensTrafic::Import,
            unites: 4,
        );

        $this->assertNotNull($liquidation);
        $this->assertSame('IMP09', $liquidation->reference);
        $this->assertSame(UniteBareme::Unite, $liquidation->unite);
        $this->assertSame(54_576, $liquidation->montant);
    }

    // ── Le mode d'exploitation, pour le seul bois export ─────────────────

    public function test_le_bois_export_suit_le_mode_d_exploitation_de_l_escale(): void
    {
        $reguliere = $this->liquide->handle(
            type: TypeMarchandise::BoisConventionnel,
            sens: SensTrafic::Export,
            volumeM3: 100.0,
            mode: ModeExploitation::LigneReguliere,
        );
        $tramping = $this->liquide->handle(
            type: TypeMarchandise::BoisConventionnel,
            sens: SensTrafic::Export,
            volumeM3: 100.0,
            mode: ModeExploitation::Tramping,
        );

        $this->assertNotNull($reguliere);
        $this->assertNotNull($tramping);
        $this->assertSame('EXP02B', $reguliere->reference);
        $this->assertSame('EXP15', $tramping->reference);
        $this->assertSame(156_904, $reguliere->montant);
        $this->assertSame(190_900, $tramping->montant);
        // Environ 13 % d'écart : c'est tout l'enjeu de lire le mode de l'ESCALE.
        $this->assertGreaterThan($reguliere->montant, $tramping->montant);
    }

    public function test_sans_mode_declare_le_bois_ne_se_facture_pas(): void
    {
        // Le document ne porte aucun tarif bois « par défaut » : EXP02, qu'on
        // avait pris pour tel, est une transcription incomplète (CGC,
        // 2026-08-27). Le moteur ne choisit donc rien quand le mode manque.
        //
        // C'est un filet de dernier recours, et non le cas courant : une escale
        // naît toujours avec un mode — celui du navire, ou la ligne régulière à
        // défaut (`Escale::heriteLeModeDExploitation`). Ne restent exposés que
        // les dossiers antérieurs à cette règle.
        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::BoisConventionnel,
            sens: SensTrafic::Export,
            volumeM3: 100.0,
        );

        $this->assertNull($liquidation);
    }

    public function test_les_hydrocarbures_ne_se_facturent_pas(): void
    {
        // Le CGC ne les facture pas pour l'instant (2026-08-27) : les quatre
        // lignes du type et leurs quatre variantes conteneurisées naissent
        // hors exploitation.
        $ecartees = ['EXP24', 'EXP25', 'IMP23', 'IMP24', 'EXP28', 'EXP29', 'IMP27', 'IMP28'];

        foreach ($ecartees as $reference) {
            $this->assertFalse(
                BaremeLigne::query()->where('reference', $reference)->firstOrFail()->actif,
                "La ligne {$reference} devrait être hors exploitation.",
            );
        }

        $this->assertNull($this->liquide->handle(
            type: TypeMarchandise::DerivesHydrocarbures,
            sens: SensTrafic::Import,
            poidsKg: 100_000,
            volumeM3: 120.0,
        ));
    }

    public function test_un_type_sans_ligne_en_exploitation_n_est_plus_propose(): void
    {
        // Un type qu'on ne peut plus facturer ne doit pas s'afficher à la
        // qualification : il resterait à qualifier indéfiniment, sans qu'on
        // comprenne pourquoi.
        foreach ([SensTrafic::Import, SensTrafic::Export] as $sens) {
            $this->assertNotContains(
                TypeMarchandise::DerivesHydrocarbures,
                BaremeLigne::typesFacturables($sens),
            );
        }

        // Le vrac liquide général, lui, reste offert : une huile de palme
        // n'est pas un hydrocarbure.
        $this->assertContains(
            TypeMarchandise::VracLiquide,
            BaremeLigne::typesFacturables(SensTrafic::Import),
        );

        // Et le bois reste offert à l'export malgré EXP02 écartée : EXP02B et
        // EXP15 le portent, chacune pour son mode d'exploitation.
        $this->assertContains(
            TypeMarchandise::BoisConventionnel,
            BaremeLigne::typesFacturables(SensTrafic::Export),
        );
    }

    public function test_la_ligne_de_bois_sans_mode_est_hors_exploitation(): void
    {
        $ligne = BaremeLigne::query()->where('reference', 'EXP02')->firstOrFail();

        // Elle reste dans la grille — le CGC la corrigera ou la supprimera —
        // mais ne facture rien : même réactivée, aucune escale ne l'atteindrait,
        // puisque le bois exige désormais un mode d'exploitation.
        $this->assertFalse($ligne->actif);
    }

    public function test_le_mode_ne_change_rien_a_un_type_qui_n_y_est_pas_sensible(): void
    {
        $sans = $this->liquide->handle(
            type: TypeMarchandise::Sacherie,
            sens: SensTrafic::Export,
            poidsKg: 50_000,
        );
        $avec = $this->liquide->handle(
            type: TypeMarchandise::Sacherie,
            sens: SensTrafic::Export,
            poidsKg: 50_000,
            mode: ModeExploitation::Tramping,
        );

        $this->assertNotNull($sans);
        $this->assertNotNull($avec);
        $this->assertSame($sans->reference, $avec->reference);
        $this->assertSame($sans->montant, $avec->montant);
    }

    // ── La nomenclature ──────────────────────────────────────────────────

    public function test_le_bois_ne_se_propose_qu_a_l_export(): void
    {
        $this->assertNotContains(TypeMarchandise::BoisConventionnel, TypeMarchandise::pour(SensTrafic::Import));
        $this->assertNotContains(TypeMarchandise::BoisConteneurise, TypeMarchandise::pour(SensTrafic::Import));
        $this->assertContains(TypeMarchandise::BoisConventionnel, TypeMarchandise::pour(SensTrafic::Export));
    }

    public function test_les_autres_emballages_ne_se_proposent_qu_a_l_import(): void
    {
        $this->assertNotContains(TypeMarchandise::AutresEmballages, TypeMarchandise::pour(SensTrafic::Export));
        $this->assertContains(TypeMarchandise::AutresEmballages, TypeMarchandise::pour(SensTrafic::Import));
    }

    public function test_chaque_type_propose_trouve_au_moins_une_ligne_facturable(): void
    {
        // Le filet : un type offert à la qualification sans tarif derrière
        // produirait une ligne qualifiée mais non facturable — invisible à
        // l'écran et fausse au devis. C'est `typesFacturables` qui décide de
        // la liste proposée, pas la nomenclature seule : un type dont toutes
        // les lignes sont écartées n'y figure plus.
        foreach (SensTrafic::cases() as $sens) {
            foreach (BaremeLigne::typesFacturables($sens) as $type) {
                $facturables = BaremeLigne::query()
                    ->where('type_marchandise', $type)
                    ->where('sens', $sens)
                    ->where('actif', true)
                    ->whereNotNull('unite')
                    ->count();

                $this->assertGreaterThan(
                    0,
                    $facturables,
                    "Le type {$type->label()} est proposé en {$sens->value} sans ligne de barème facturable.",
                );
            }
        }
    }

    // ── La pré-qualification des boîtes ──────────────────────────

    /**
     * Le froid ne se lit que dans les mots. Le profil gabonais ne transmet que
     * la taille (20 / 40 / 45), jamais le code ISO 6346 frigo — et l'écart
     * tarifaire est du simple au double : 28 652 F contre 16 373 F le 20 pieds.
     */
    public function test_le_froid_se_deduit_des_mots_de_la_description(): void
    {
        foreach (self::descriptions() as [$description, $froid]) {
            $this->assertSame(
                $froid,
                TypeMarchandise::sentLeFroid($description),
                "La description « {$description} » est mal classée.",
            );
        }
    }

    /**
     * @return list<array{string, bool}>
     */
    private static function descriptions(): array
    {
        return [
            ['Poulet congelé en cartons', true],
            ['Filets de poisson congeles', true],
            ['FROZEN CHICKEN QUARTERS', true],
            ['REEFER CARGO — produits laitiers', true],
            ['Chinchard 40 RF', true],
            ['Viande refrigeree', true],
            ['Bananes -18C', true],
            ['Crèmes glacées -18°C', true],
            // Les faux amis : deux mots qui contiennent « RF » sans rien devoir
            // au froid. Les prendre pour des frigos doublerait leur tarif.
            ['RFID tags et lecteurs', false],
            ['SURF BOARDS et accessoires', false],
            ['Riz blanc en sacs de 25 kg', false],
            ['Carreaux céramiques', false],
            ['', false],
        ];
    }

    public function test_sans_taille_aucune_boite_ne_se_pre_qualifie(): void
    {
        // Un profil transporteur illisible ne doit pas produire un forfait au
        // hasard : la ligne remonte à l'opérateur.
        $this->assertNull(TypeMarchandise::conteneurDepuis(null, 'FROZEN CHICKEN'));
        $this->assertNull(TypeMarchandise::conteneurDepuis(30, 'Riz blanc'));
    }

    public function test_la_taille_et_le_froid_designent_le_type_de_la_boite(): void
    {
        $this->assertSame(
            TypeMarchandise::Conteneur40F,
            TypeMarchandise::conteneurDepuis(40, 'Poulet congelé'),
        );
        $this->assertSame(
            TypeMarchandise::Conteneur20S,
            TypeMarchandise::conteneurDepuis(20, 'Riz blanc en sacs'),
        );
        $this->assertSame(
            TypeMarchandise::Conteneur45S,
            TypeMarchandise::conteneurDepuis(45, 'Mobilier en colis'),
        );
    }

    public function test_un_conteneur_refrigere_coute_bien_plus_qu_un_sec(): void
    {
        $sec = $this->liquide->handle(
            type: TypeMarchandise::Conteneur20S,
            sens: SensTrafic::Import,
            conteneurs: 1,
        );
        $frigo = $this->liquide->handle(
            type: TypeMarchandise::Conteneur20F,
            sens: SensTrafic::Import,
            conteneurs: 1,
        );

        $this->assertNotNull($sec);
        $this->assertNotNull($frigo);
        $this->assertSame(16_373, $sec->montant);
        $this->assertSame(28_652, $frigo->montant);
    }

    public function test_une_ligne_desactivee_ne_facture_plus(): void
    {
        BaremeLigne::query()->where('reference', 'IMP18')->update(['actif' => false]);

        $liquidation = $this->liquide->handle(
            type: TypeMarchandise::VracSolide,
            sens: SensTrafic::Import,
            poidsKg: 100_000,
            volumeM3: 200.0,
        );

        // Le cubage l'emportait ; il disparaît, le métrique reprend la main.
        $this->assertNotNull($liquidation);
        $this->assertSame('IMP17', $liquidation->reference);
    }

    public function test_le_vehicule_utilitaire_import_se_compte_aussi_en_engins(): void
    {
        // IMP10 se facture au nombre d'engins (précisé par le CGC le
        // 2026-08-27) : le document ne le disait pas, IMP14 et IMP15 ne
        // couvrant que le cubage et le métrique.
        $ligne = BaremeLigne::query()->where('reference', 'IMP10')->firstOrFail();

        $this->assertSame(UniteBareme::Unite, $ligne->unite);
        $this->assertTrue($ligne->facturable());
    }

    public function test_une_ligne_sans_unite_ne_facture_pas(): void
    {
        // Une ligne ajoutée depuis l'écran d'administration naît sans
        // qualification : elle figure dans la grille et ne facture rien tant
        // que personne n'a dit ce qu'elle tarife (ADR-0044).
        $ligne = BaremeLigne::query()->create([
            'reference' => 'IMP99',
            'sens' => SensTrafic::Import,
            'designation' => 'LIGNE AJOUTEE DEPUIS L ECRAN',
            'montant_cfa' => 1500.00,
            'actif' => true,
        ]);

        $this->assertNull($ligne->unite);
        $this->assertNull($ligne->type_marchandise);
        $this->assertFalse($ligne->facturable());
    }
}
