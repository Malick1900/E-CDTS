<?php

namespace Database\Seeders;

use App\Actions\Manifeste\ImporteUnManifesteAwmds;
use App\Enums\EtapeDossier;
use App\Enums\ModeSaisieManifeste;
use App\Enums\TypeMarchandise;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\ManifesteConteneur;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Un manifeste de démonstration, avec tous les cas qui font mal.
 *
 * L'intérêt d'un jeu de démonstration n'est pas de remplir un tableau : c'est
 * de mettre sous les yeux les situations que le circuit doit savoir traiter.
 * Celui-ci en contient six, toutes tirées des manifestes réels :
 *
 * - **le pur conteneur**, que la machine qualifie seule (taille + froid) ;
 * - **le froid**, qui ne se lit que dans les mots de la description ;
 * - **le groupage**, où une même boîte figure sous deux connaissements et ne
 *   doit pourtant compter qu'une fois ;
 * - **le pur vrac**, dont l'assiette est au BL et la catégorie au jugement ;
 * - **le RoRo à zéro colis**, qui n'est pas gratuit mais incomplet ;
 * - **le BL mixte**, que la machine détecte sans pouvoir le répartir.
 *
 * Déterministe : la même graine rend le même manifeste, pour qu'une capture
 * d'écran d'aujourd'hui vaille encore demain.
 *
 * @see docs/MANIFESTE-XML.md §Typologie des BL et règle d'or
 */
class ManifesteDemoSeeder extends Seeder
{
    /** Des marchandises conteneurisées, dont trois qui voyagent au froid. */
    private const CONTENEURISEES = [
        'Riz blanc en sacs de 25 kg',
        'Farine de blé en sacs',
        'Carreaux céramiques',
        'Pièces détachées automobiles',
        'Poulet congelé — FROZEN CHICKEN QUARTERS',
        'Textiles et friperie en balles',
        'Conserves alimentaires',
        'Chinchard congelé -18C',
        'Matériel informatique',
        'Pneumatiques',
        'Savons et détergents',
        'Boissons gazeuses en canettes',
        'Lait en poudre',
        'Peintures et vernis',
        'Câbles électriques en touret',
        'REEFER CARGO — produits laitiers',
        'Mobilier en colis',
        'Électroménager',
    ];

    private const VRACS = [
        ['Clinker en vrac', 'vrac_solide'],
        ['Gypse en vrac', 'vrac_solide'],
        ['Blé tendre en vrac', 'vrac_solide'],
        ['Huile de palme brute', 'vrac_liquide'],
        ['Bitume liquide en citerne', 'derives_hydrocarbures'],
    ];

    private const EXPEDITEURS = [
        'COFCO International',
        'Wilmar Trading Pte',
        'Olam International',
        'BASF SE',
        'Holcim Trading SA',
        'Sinotruk Intl Ltd',
        'Nestlé Export SA',
        'ArcelorMittal Intl',
    ];

    private const DESTINATAIRES = [
        'CECA-GADIS',
        'SOBRAGA',
        'CIMAF Gabon',
        'Olam Agri Gabon',
        'SMAG',
        'Prix Import',
        'SOGAFRIC Services',
        'Bernabé Gabon',
    ];

    private const PORTS = [
        ['CNSHA', 'Shanghai'],
        ['NLRTM', 'Rotterdam'],
        ['BEANR', 'Anvers'],
        ['FRLEH', 'Le Havre'],
        ['ESVLC', 'Valence'],
        ['MACAS', 'Casablanca'],
        ['ZADUR', 'Durban'],
        ['AEJEA', 'Jebel Ali'],
    ];

    public function run(): void
    {
        // Les dossiers dont l'étape a l'écran du manifeste et qui n'en portent
        // pas encore. On n'écrase jamais un manifeste existant.
        $escales = Escale::query()
            ->whereIn('etape', [EtapeDossier::Manifeste->value, EtapeDossier::Depouillement->value])
            ->whereDoesntHave('manifeste')
            ->with('port')
            ->orderBy('id')
            ->take(2)
            ->get();

        if ($escales->isEmpty()) {
            $this->command->warn('Aucun dossier à l\'étape manifeste ou dépouillement — rien à alimenter.');

            return;
        }

        foreach ($escales as $index => $escale) {
            mt_srand(4213 + $index);
            $this->pour($escale);
        }

        mt_srand();
    }

    private function pour(Escale $escale): void
    {
        // Le fichier déposé vaut pièce probante — c'est sur lui que l'agent CGC
        // rejouera le dépouillement (WF5), et sans lui rien ne se transmet.
        // Le rattachement fige au passage le libellé du dossier (ADR-0008),
        // par le crochet du modèle : le seeder n'a rien à en savoir.
        $chemin = 'manifestes/'.$escale->id.'/'.$escale->id.'-demo.xml';

        Storage::disk(ImporteUnManifesteAwmds::DISQUE)->put($chemin, $this->pieceDeDemonstration($escale));

        $manifeste = Manifeste::query()->create([
            'escale_id' => $escale->id,
            'mode_saisie' => ModeSaisieManifeste::Xml,
            'depose_par' => $escale->ouvert_par,
            'piece_jointe_chemin' => $chemin,
            'piece_jointe_nom' => str_replace(' ', '_', $escale->reference).'.xml',
            'piece_jointe_octets' => Storage::disk(ImporteUnManifesteAwmds::DISQUE)->size($chemin),
        ]);

        // Comme à l'import : le manifeste est acquis d'un coup, donc numéroté
        // tout de suite — et le dossier cesse d'être provisoire (ADR-0046).
        $manifeste->numeroter();

        $ligne = 0;
        $quai = $escale->port->code ?? 'GAOWE';
        $quaiNom = $escale->port->name ?? 'Owendo';

        // ── Le gros du manifeste : des BL purement conteneurisés ─────────
        foreach (self::CONTENEURISEES as $marchandise) {
            $boites = mt_rand(1, 100) <= 70 ? 1 : mt_rand(2, 3);
            $taille = mt_rand(1, 100) <= 58 ? 40 : 20;

            $bl = $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
                'poids_brut_kg' => $boites * mt_rand(8_200, 26_400),
                'volume_m3' => $boites * ($taille === 20 ? mt_rand(24, 33) : mt_rand(48, 67)),
                'colis' => $boites * mt_rand(40, 900),
                'conteneurs_annonces' => $boites,
            ]);

            for ($i = 0; $i < $boites; $i++) {
                $this->conteneur($bl, $taille, $marchandise);
            }
        }

        // ── Une boîte groupée, sous deux connaissements ──────────────────
        $partagee = $this->reference();
        $mere = 'MSTR-26'.mt_rand(1000, 9999);

        foreach (['Épices et condiments', 'Ustensiles de cuisine'] as $marchandise) {
            $bl = $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
                'master_reference' => $mere,
                'poids_brut_kg' => mt_rand(4_000, 9_000),
                'volume_m3' => mt_rand(12, 28),
                'colis' => mt_rand(60, 300),
                'conteneurs_annonces' => 1,
            ]);

            ManifesteConteneur::query()->create([
                'manifeste_bl_id' => $bl->id,
                'reference' => $partagee,
                'taille' => 40,
                'colis' => mt_rand(60, 300),
                'plein' => true,
                'tare_kg' => 3_800,
                'type_marchandise' => TypeMarchandise::conteneurDepuis(40, $marchandise),
            ]);
        }

        // ── Du vrac : l'assiette est au BL, la catégorie au jugement ─────
        foreach (self::VRACS as [$marchandise, $type]) {
            $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
                'poids_brut_kg' => mt_rand(180_000, 620_000),
                // Un vrac liquide SAGA n'a pas toujours de cubage déclaré.
                'volume_m3' => str_contains($type, 'liquide') && mt_rand(0, 1) === 0
                    ? null
                    : mt_rand(200, 900),
                'colis' => null,
                'conteneurs_annonces' => 0,
                'hors_conteneur' => true,
                // Laissée à qualifier : c'est le geste que l'écran demande.
                'type_marchandise' => null,
            ]);
        }

        // ── Le RoRo à zéro colis : incomplet, et non gratuit ─────────────
        foreach (['Véhicules de tourisme d\'occasion', 'Camions benne'] as $marchandise) {
            $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
                'poids_brut_kg' => mt_rand(28_000, 96_000),
                'volume_m3' => mt_rand(120, 380),
                // Le manifeste annonce zéro : l'assiette manque.
                'colis' => 0,
                'conteneurs_annonces' => 0,
                'hors_conteneur' => true,
                'type_marchandise' => null,
            ]);
        }

        // ── Un BL mixte : des boîtes ET du hors-conteneur ────────────────
        $marchandise = 'Groupes électrogènes et pièces en caisses';
        $bl = $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
            'poids_brut_kg' => 64_000,
            'volume_m3' => 148,
            'colis' => 36,
            'conteneurs_annonces' => 2,
            // Le parseur a détecté un résidu hors conteneur : il ne répartit
            // pas, il route la ligne vers l'opérateur.
            'hors_conteneur' => true,
            'type_marchandise' => null,
        ]);

        for ($i = 0; $i < 2; $i++) {
            $this->conteneur($bl, 40, $marchandise);
        }

        // ── Une boîte dont le profil ne donne pas la taille ──────────────
        $marchandise = 'Marchandises diverses en conteneur';
        $bl = $this->bl($manifeste, ++$ligne, $marchandise, $quai, $quaiNom, [
            'poids_brut_kg' => 18_400,
            'volume_m3' => 52,
            'colis' => 210,
            'conteneurs_annonces' => 1,
        ]);

        ManifesteConteneur::query()->create([
            'manifeste_bl_id' => $bl->id,
            'reference' => $this->reference(),
            // Profil illisible : sans taille, aucun forfait ne s'applique.
            'taille' => null,
            'colis' => 210,
            'plein' => true,
            'tare_kg' => null,
            'type_marchandise' => null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributs
     */
    private function bl(
        Manifeste $manifeste,
        int $ligne,
        string $marchandise,
        string $quai,
        string $quaiNom,
        array $attributs,
    ): ManifesteBl {
        $port = self::PORTS[array_rand(self::PORTS)];

        return ManifesteBl::query()->create([
            'manifeste_id' => $manifeste->id,
            'reference' => ['GABX', 'OCEA', 'ATLW', 'MERX'][mt_rand(0, 3)].'-26'.mt_rand(1000, 9899),
            'ligne_numero' => $ligne,
            'port_chargement' => $port[0],
            'port_chargement_nom' => $port[1],
            'port_dechargement' => $quai,
            'port_dechargement_nom' => $quaiNom,
            'expediteur' => self::EXPEDITEURS[array_rand(self::EXPEDITEURS)],
            'destinataire' => self::DESTINATAIRES[array_rand(self::DESTINATAIRES)],
            'description' => $marchandise,
            ...$attributs,
        ]);
    }

    private function conteneur(ManifesteBl $bl, int $taille, string $marchandise): void
    {
        ManifesteConteneur::query()->create([
            'manifeste_bl_id' => $bl->id,
            'reference' => $this->reference(),
            'taille' => $taille,
            'colis' => mt_rand(40, 900),
            'plein' => true,
            // Un 40′ frigo pèse ~4 600 kg à vide contre ~3 800 pour un sec.
            'tare_kg' => $taille === 20 ? mt_rand(2_100, 2_400) : mt_rand(3_700, 3_900),
            // La pré-qualification : la taille vient du fichier, le froid des
            // mots de la description. Rien d'autre n'est deviné.
            'type_marchandise' => TypeMarchandise::conteneurDepuis($taille, $marchandise),
        ]);
    }

    /** Une référence ISO 6346 plausible : quatre lettres, six chiffres, une clé. */
    private function reference(): string
    {
        return ['GABU', 'OCLU', 'ATWU', 'MRXU'][mt_rand(0, 3)]
            .str_pad((string) mt_rand(100_000, 999_999), 6, '0', STR_PAD_LEFT)
            .mt_rand(0, 9);
    }

    /**
     * La pièce probante du jeu de démonstration.
     *
     * Elle porte l'en-tête AWMDS, pas les connaissements : la démonstration a
     * besoin d'un fichier téléchargeable et cohérent, pas d'un doublon des
     * lignes que le seeder écrit déjà en base.
     */
    private function pieceDeDemonstration(Escale $escale): string
    {
        return <<<XML
            <?xml version="1.0" encoding="UTF-8"?>
            <!-- Pièce de démonstration e-CDTS — dossier {$escale->reference} -->
            <Awmds>
                <General_segment>
                    <General_segment_id>
                        <Customs_office_code>{$escale->port->code}</Customs_office_code>
                        <Voyage_number>{$escale->voyage}</Voyage_number>
                    </General_segment_id>
                    <Transport_information>
                        <Identity_of_transporter>{$escale->navire->name}</Identity_of_transporter>
                    </Transport_information>
                </General_segment>
            </Awmds>
            XML;
    }
}
