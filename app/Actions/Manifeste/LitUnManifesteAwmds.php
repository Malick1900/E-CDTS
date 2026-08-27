<?php

namespace App\Actions\Manifeste;

use App\DataTransferObjects\BlLu;
use App\DataTransferObjects\ConteneurLu;
use App\DataTransferObjects\EnTeteLu;
use App\DataTransferObjects\ManifesteLu;
use App\Enums\SensTrafic;
use App\Models\Escale;
use Illuminate\Validation\ValidationException;
use SimpleXMLElement;

/**
 * Lit un manifeste AWMDS / ASYCUDA World et le rend sous une forme exploitable.
 *
 * L'action ne touche pas la base : elle lit, contrôle, et rend un arbre de
 * connaissements. C'est ce qui la rend testable sur un fichier seul, sans
 * dossier ni escale — et c'est là que vivent toutes les tolérances de profil.
 *
 * **Aucun manifeste réel n'est conforme au schéma.** `Awmds-SVG.xsd` fait
 * pourtant autorité : c'est le XSD ASYCUDA World distribué par l'UNCTAD. Les
 * transporteurs gabonais en émettent des profils appauvris, hétérogènes entre
 * eux — un même champ change de nom (`Empty_weight` chez MSC, `Goods_weight`
 * chez GINA), une même donnée change de forme (`Type_of_container` vaut « 40 »
 * ou « 20G1 »). Le parseur tolère ces variantes ; il ne les invente pas.
 *
 * **On ne devine jamais.** Ce que le fichier ne dit pas reste nul, et la ligne
 * partira « à qualifier » plutôt que d'être facturée au jugé (ADR-0038). La
 * seule déduction admise est celle qui se lit : la taille d'une boîte donne son
 * forfait, et rien d'autre.
 *
 * @see docs/MANIFESTE-XML.md
 */
final class LitUnManifesteAwmds
{
    /**
     * L'écart de masse qu'on ne relève pas — tranché par le CGC le 2026-08-22.
     *
     * Rapportés au million de kilos que porte un navire, cent kilos sont du
     * bruit de pesée. Au-delà, on signale sans jamais rejeter : un manifeste
     * n'est pas faux parce que ses totaux amont divergent. ⚠ La tolérance porte
     * sur la MASSE SEULE — un colis ou un conteneur manquant est une erreur de
     * comptage, traitée strictement.
     */
    public const TOLERANCE_MASSE_KG = 100;

    /** Les codes de `Bol_nature`, seule source fiable du sens du trafic. */
    private const NATURE_EXPORT = '22';

    private const NATURE_IMPORT = '23';

    /** Les tailles que le barème CDTS connaît. Toute autre valeur est refusée. */
    private const TAILLES = [20, 40, 45];

    /**
     * @param  string  $xml  Le contenu brut du fichier déposé.
     * @param  Escale  $dossier  Le dossier d'accueil — le fichier doit lui correspondre.
     *
     * @throws ValidationException quand le fichier n'est pas un manifeste
     *                             exploitable pour ce dossier.
     */
    public function handle(string $xml, Escale $dossier): ManifesteLu
    {
        $racine = $this->charger($xml);
        $bols = $racine->xpath('//Bol_segment') ?: [];

        if ($bols === []) {
            $this->refuser(__('Ce fichier ne contient aucun connaissement (:balise).', ['balise' => 'Bol_segment']));
        }

        $enTete = $this->enTete($racine);

        $this->assureLaCorrespondance($enTete->voyage, $enTete->navire, $dossier);
        $this->assureLeSens($bols, $dossier->sens);

        $bls = [];
        $numero = 1;

        foreach ($bols as $bol) {
            $bls[] = $this->bl($bol, $numero++);
        }

        return new ManifesteLu(
            enTete: $enTete,
            bls: $bls,
            anomalies: [
                ...$this->controler($enTete, $bls),
                ...$this->reserves($enTete, $dossier),
            ],
        );
    }

    /**
     * Le `General_segment`, lu d'un bloc.
     *
     * Tout se cherche SOUS ce segment : les ports du niveau général sont ceux
     * du navire, ceux du `Bol_segment` sont les ports réels de la marchandise,
     * et les confondre ferait dire au résumé l'inverse de ce que le fichier
     * annonce. Les chemins restent en descendants indifférents (`.//`) parce
     * que les profils n'imbriquent pas de la même façon.
     *
     * Un fichier sans `General_segment` rend un en-tête entièrement nul —
     * l'aperçu le dira, plutôt que d'aller chercher au hasard des balises de
     * même nom une branche plus bas.
     */
    private function enTete(SimpleXMLElement $racine): EnTeteLu
    {
        $general = $racine->xpath('//General_segment');
        $portee = is_array($general) ? ($general[0] ?? null) : null;

        $texte = fn (string $balise): ?string => $portee === null
            ? null
            : $this->texte($portee->xpath('.//'.$balise));

        $entier = fn (string $balise): ?int => $portee === null
            ? null
            : $this->entier($portee->xpath('.//'.$balise));

        return new EnTeteLu(
            bureau: $texte('Customs_office_code'),
            voyage: $texte('Voyage_number'),
            navire: $texte('Identity_of_transporter'),
            pavillon: $texte('Nationality_of_transporter_code'),
            immatriculation: $texte('Registration_number_of_transport_code'),
            transporteur: $texte('Carrier_name'),
            agent: $texte('Shipping_Agent_name'),
            dateDepart: $texte('Date_of_departure'),
            dateArrivee: $texte('Date_of_arrival'),
            portDepart: $texte('Place_of_departure_code'),
            portDestination: $texte('Place_of_destination_code'),
            totauxPresents: $portee !== null && ($portee->xpath('.//Totals_segment') ?: []) !== [],
            blsAnnonces: $entier('Total_number_of_bols'),
            colisAnnonces: $entier('Total_number_of_packages'),
            conteneursAnnonces: $entier('Total_number_of_containers'),
            masseAnnonceeKg: $portee === null
                ? null
                : $this->arrondi($this->decimal($portee->xpath('.//Total_gross_mass'))),
        );
    }

    /**
     * Le fichier doit désigner l'escale du dossier : même navire, même voyage.
     *
     * **Les deux écarts se pèsent ensemble avant de trancher.** S'arrêter au
     * premier laisserait croire à une divergence isolée — « corrigez le voyage »
     * — alors que le fichier est parfois celui d'une tout autre escale, navire
     * compris. Le remède n'est pas le même : on corrige un numéro, on ne corrige
     * pas un fichier déposé sur le mauvais dossier.
     *
     * Le **voyage** se compare sous sa forme normalisée — « 26-114S » et
     * « 26-114 s » sont le même passage (ADR-0009). C'est le plus discriminant
     * des deux : deux escales d'un même navire ne partagent jamais un voyage.
     *
     * Le **navire** se compare sur un préfixe aplati : `Identity_of_transporter`
     * est borné à 27 caractères par le schéma, un nom long y arrive tronqué,
     * alors que le référentiel CGC l'écrit en entier.
     *
     * Une balise absente ne fait jamais refuser : ce serait refuser un profil,
     * pas un manifeste.
     */
    private function assureLaCorrespondance(?string $voyage, ?string $navire, Escale $dossier): void
    {
        $voyageDivergent = $voyage !== null
            && Escale::normaliserVoyage($voyage) !== $dossier->voyage_normalise;

        $navireDivergent = $navire !== null && $this->navireDivergent($navire, $dossier);

        if (! $voyageDivergent && ! $navireDivergent) {
            return;
        }

        $this->refuser(match (true) {
            // Tout diverge : ce n'est pas une faute de saisie, c'est un autre
            // dossier. Le message nomme les deux escales côte à côte.
            $voyageDivergent && $navireDivergent => __(
                'Ce manifeste est celui d’une autre escale : :luNavire · :luVoyage, alors que le dossier est ouvert sur :attenduNavire · :attenduVoyage. Vérifiez le fichier déposé, ou le dossier.',
                [
                    'luNavire' => $navire,
                    'luVoyage' => $voyage,
                    'attenduNavire' => $dossier->navire->name,
                    'attenduVoyage' => $dossier->voyage,
                ],
            ),
            $voyageDivergent => __(
                'Ce manifeste porte le voyage :lu ; le dossier est ouvert sur le voyage :attendu. Vérifiez le fichier déposé, ou le n° de voyage du dossier.',
                ['lu' => $voyage, 'attendu' => $dossier->voyage],
            ),
            default => __(
                'Ce manifeste porte le navire :lu ; le dossier est ouvert sur :attendu. Vérifiez le fichier déposé, ou le navire du dossier.',
                ['lu' => $navire, 'attendu' => $dossier->navire->name],
            ),
        });
    }

    /** Le navire lu désigne-t-il quelqu'un d'autre que celui du dossier ? */
    private function navireDivergent(string $navire, Escale $dossier): bool
    {
        return ! $this->memePrefixe($navire, $dossier->navire->name);
    }

    /**
     * Deux raisons sociales désignent-elles la même chose ?
     *
     * La comparaison se fait sur le préfixe aplati : le fichier tronque
     * (`Identity_of_transporter` est borné à 27 caractères) et abrège
     * (« MSC GABON SA » pour « MSC Gabon »). Un nom qui ne se réduit à rien ne
     * distingue rien : on s'abstient plutôt que de crier à l'écart.
     */
    private function memePrefixe(string $lu, string $attendu): bool
    {
        $gauche = $this->aplatir($lu);
        $droite = $this->aplatir($attendu);

        if ($gauche === '' || $droite === '') {
            return true;
        }

        return str_starts_with($gauche, $droite) || str_starts_with($droite, $gauche);
    }

    /**
     * Un nom de navire réduit à ce qui le distingue : lettres et chiffres, en
     * majuscules. « MSC LIPSIA III » et « M.S.C. Lipsia-III » désignent le même
     * navire, et la troncature à 27 caractères ne doit pas en faire deux.
     */
    private function aplatir(string $valeur): string
    {
        $sansAccents = iconv('UTF-8', 'ASCII//TRANSLIT', $valeur);

        return preg_replace('/[^A-Z0-9]/', '', mb_strtoupper($sansAccents === false ? $valeur : $sansAccents)) ?? '';
    }

    /**
     * Charger le XML sans lui laisser atteindre le réseau ni le disque.
     *
     * Un manifeste est un fichier reçu d'un tiers : ses entités ne se résolvent
     * pas. `LIBXML_NONET` ferme le réseau, et PHP 8 désactive par défaut le
     * chargement des entités externes — les deux ensemble ferment la porte XXE.
     */
    private function charger(string $xml): SimpleXMLElement
    {
        $anciennes = libxml_use_internal_errors(true);

        try {
            $racine = simplexml_load_string($xml, options: LIBXML_NONET | LIBXML_NOCDATA);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($anciennes);
        }

        if ($racine === false) {
            $this->refuser(__('Ce fichier n’est pas un XML lisible.'));
        }

        return $racine;
    }

    /**
     * Le sens du fichier doit être celui du dossier.
     *
     * `Bol_nature` est la seule source fiable : la corrélation est parfaite sur
     * les six manifestes de référence, y compris pour un même navire pris dans
     * les deux sens. Surtout, on ne lit PAS `Place_of_destination_code` seul —
     * sur un export, c'est la destination étrangère du navire, pas le port
     * gabonais.
     *
     * Un fichier muet passe : le profil peut ne pas renseigner la balise, et ce
     * serait refuser un manifeste sur une absence.
     *
     * @param  array<int, SimpleXMLElement>  $bols
     */
    private function assureLeSens(array $bols, SensTrafic $attendu): void
    {
        $natures = [];

        foreach ($bols as $bol) {
            $nature = $this->texte($bol->xpath('.//Bol_nature'));

            if ($nature !== null) {
                $natures[] = $nature;
            }
        }

        // Les codes sont des chaînes numériques : en faire des clés de tableau
        // les transformerait en entiers, et la comparaison échouerait toujours.
        $distinctes = array_values(array_unique($natures));

        $lu = match (true) {
            $distinctes === [self::NATURE_IMPORT] => SensTrafic::Import,
            $distinctes === [self::NATURE_EXPORT] => SensTrafic::Export,
            default => null,
        };

        if ($lu !== null && $lu !== $attendu) {
            $this->refuser(__('Ce manifeste est un manifeste :lu ; le dossier est un dossier :attendu.', [
                'lu' => mb_strtolower($lu->label()),
                'attendu' => mb_strtolower($attendu->label()),
            ]));
        }
    }

    /**
     * Un connaissement et ses boîtes.
     *
     * Poids, volume et colis se lisent au `Goods_segment` — donc au niveau du
     * BL — et n'existent nulle part ailleurs. Le `Empty_weight` d'une boîte est
     * sa TARE : la confondre avec le poids de la marchandise ferait facturer un
     * conteneur vide.
     */
    private function bl(SimpleXMLElement $bol, int $rang): BlLu
    {
        $conteneurs = [];

        foreach ($bol->xpath('.//ctn_segment') ?: [] as $ctn) {
            $conteneurs[] = $this->conteneur($ctn);
        }

        $colis = $this->entier($bol->xpath('.//Goods_segment/Number_of_packages'));
        $annonces = $this->entier($bol->xpath('.//Num_of_ctn_for_this_bol')) ?? 0;

        return new BlLu(
            reference: $this->texte($bol->xpath('.//Bol_reference')) ?? __('BL :rang', ['rang' => $rang]),
            ligneNumero: $this->entier($bol->xpath('.//Bol_id/Line_number')) ?? $rang,
            // Le repère du groupage change de nom selon le profil : le XSD dit
            // `Master_information`, les fichiers MSC disent `Master_bol_ref_number`.
            masterReference: $this->texte($bol->xpath('.//Master_bol_ref_number'))
                ?? $this->texte($bol->xpath('.//Master_information')),
            portChargement: $this->texte($bol->xpath('.//Place_of_loading_code')),
            portDechargement: $this->texte($bol->xpath('.//Place_of_unloading_code')),
            expediteur: $this->texte($bol->xpath('.//Exporter_name')),
            destinataire: $this->texte($bol->xpath('.//Consignee_name')),
            description: $this->texte($bol->xpath('.//Goods_description')),
            poidsBrutKg: $this->arrondi($this->decimal($bol->xpath('.//Goods_segment/Gross_mass'))),
            volumeM3: $this->decimal($bol->xpath('.//Volume_in_cubic_meters')),
            colis: $colis,
            conteneursAnnonces: $annonces,
            horsConteneur: $this->porteUnResidu($conteneurs, $colis, $annonces),
            conteneurs: $conteneurs,
        );
    }

    /**
     * Le BL porte-t-il de la marchandise hors de toute boîte ?
     *
     * Deux cas, et un seul est net. **Aucune boîte** : tout le connaissement est
     * hors conteneur — vrac, citerne, roulier. **Un résidu** : les colis annoncés
     * au BL dépassent ceux que les boîtes déclarent, donc quelque chose voyage à
     * côté.
     *
     * Le second cas ne se déclenche que si les boîtes déclarent VRAIMENT leurs
     * colis. Une somme nulle n'est pas « zéro colis », c'est une donnée absente
     * — et la lire comme un résidu enverrait tout un manifeste en qualification
     * manuelle pour un champ que le transporteur ne remplit pas.
     *
     * @param  list<ConteneurLu>  $conteneurs
     */
    private function porteUnResidu(array $conteneurs, ?int $colisDuBl, int $annonces): bool
    {
        if ($conteneurs === [] && $annonces === 0) {
            return true;
        }

        if ($conteneurs === []) {
            // Des boîtes annoncées mais aucune décrite : le fichier se contredit.
            // La part non décrite est de la marchandise dont on ne sait rien.
            return true;
        }

        $colisDesBoites = array_sum(array_map(
            static fn (ConteneurLu $c): int => $c->colis ?? 0,
            $conteneurs,
        ));

        return $colisDesBoites > 0
            && $colisDuBl !== null
            && $colisDuBl > $colisDesBoites;
    }

    /**
     * Une boîte.
     *
     * `Type_of_container` n'est pas homogène : « 40 » chez MSC, « 20G1 » sur un
     * vieux DELMAS. On n'en garde que la taille, et seulement si le barème la
     * connaît — un « 30 » n'est pas arrondi, il est ignoré, et la ligne partira
     * à qualifier. La nature (sec, frigo, citerne) ne se lit nulle part : le
     * profil gabonais ne transmet jamais les quatre caractères ISO 6346.
     */
    private function conteneur(SimpleXMLElement $ctn): ConteneurLu
    {
        $type = $this->texte($ctn->xpath('.//Type_of_container'));
        $taille = $type === null ? null : (int) mb_substr($type, 0, 2);
        $plein = $this->texte($ctn->xpath('.//Empty_Full'));

        return new ConteneurLu(
            reference: $this->texte($ctn->xpath('.//Ctn_reference')) ?? '',
            taille: in_array($taille, self::TAILLES, strict: true) ? $taille : null,
            colis: $this->entier($ctn->xpath('.//Number_of_packages')),
            plein: match ($plein) {
                '1' => true,
                '0' => false,
                default => null,
            },
            // La tare change de nom d'un profil à l'autre — jamais de valeur :
            // c'est le poids À VIDE de la boîte, pas celui de la marchandise.
            tareKg: $this->arrondi(
                $this->decimal($ctn->xpath('.//Empty_weight'))
                ?? $this->decimal($ctn->xpath('.//Goods_weight')),
            ),
        );
    }

    /**
     * Confronter le fichier à ses propres totaux.
     *
     * Le `Totals_segment` est un contrôle amont : s'il ne retombe pas sur nos
     * comptes, quelque chose s'est perdu en route. Un BL ou une boîte manquants
     * font **refuser** le fichier — facturer un manifeste tronqué en silence
     * serait pire que de le rendre. La masse, elle, ne fait jamais rejeter :
     * elle se signale au-delà de la tolérance et le consignataire tranche.
     *
     * @param  list<BlLu>  $bls
     * @return list<string>
     */
    private function controler(EnTeteLu $enTete, array $bls): array
    {
        if (! $enTete->totauxPresents) {
            return [__('Le fichier ne porte pas de totaux de contrôle : les comptes n’ont pas pu être vérifiés.')];
        }

        $anomalies = [];
        $totalBls = $enTete->blsAnnonces;
        $totalBoites = $enTete->conteneursAnnonces;
        $totalMasse = $enTete->masseAnnonceeKg;

        if ($totalBls !== null && $totalBls !== count($bls)) {
            $this->refuser(__('Le fichier annonce :annonce connaissements et en contient :reel.', [
                'annonce' => $totalBls,
                'reel' => count($bls),
            ]));
        }

        // Une boîte groupée figure sous plusieurs BL sans valoir plusieurs
        // boîtes : le compte se fait en références DISTINCTES.
        $boites = [];

        foreach ($bls as $bl) {
            foreach ($bl->conteneurs as $conteneur) {
                $boites[$conteneur->reference] = true;
            }
        }

        if ($totalBoites !== null && $totalBoites !== count($boites)) {
            $this->refuser(__('Le fichier annonce :annonce conteneurs et en contient :reel.', [
                'annonce' => $totalBoites,
                'reel' => count($boites),
            ]));
        }

        $masse = array_sum(array_map(static fn (BlLu $bl): int => $bl->poidsBrutKg ?? 0, $bls));

        if ($totalMasse !== null && abs($totalMasse - $masse) > self::TOLERANCE_MASSE_KG) {
            $anomalies[] = __('Masse brute : :annonce kg annoncés pour :reel kg cumulés (écart de :ecart kg).', [
                'annonce' => $totalMasse,
                'reel' => $masse,
                'ecart' => abs($totalMasse - $masse),
            ]);
        }

        return $anomalies;
    }

    /**
     * Ce que l'en-tête dit de l'escale, confronté au référentiel — sans jamais
     * refuser.
     *
     * Le navire et le voyage font foi et rejettent (`assureLaCorrespondance`) :
     * eux désignent le dossier. Le reste — pavillon, immatriculation, émetteur,
     * date d'arrivée — se **signale et laisse passer** (arbitrage du porteur,
     * 2026-08-27). Ces champs décrivent une escale que le référentiel CGC
     * connaît parfois mal, et bloquer sur une fiche navire incomplète punirait
     * le déclarant d'un manque interne. L'incohérence doit se voir, pas fermer
     * la porte.
     *
     * **Rien ne se compare contre du vide** : une donnée absente d'un côté ou
     * de l'autre n'est pas un écart, c'est une comparaison qui n'a pas lieu.
     *
     * @return list<string>
     */
    private function reserves(EnTeteLu $enTete, Escale $dossier): array
    {
        $reserves = [];
        $navire = $dossier->navire;
        $pavillon = $navire->pays?->code;

        // Le pavillon ne se compare qu'à alphabet égal. Le schéma autorise
        // deux OU trois lettres — « LR » chez MSC, « LBR » ailleurs — quand le
        // référentiel ne connaît que l'alpha-2 : opposer « LBR » à « LR »
        // signalerait un désaccord là où il n'y a qu'une notation.
        if ($enTete->pavillon !== null && $pavillon !== null
            && mb_strlen($enTete->pavillon) === 2
            && mb_strtoupper($enTete->pavillon) !== mb_strtoupper($pavillon)) {
            $reserves[] = __('Pavillon : le fichier annonce :lu, la fiche du navire porte :attendu.', [
                'lu' => $enTete->pavillon,
                'attendu' => $pavillon,
            ]);
        }

        // L'immatriculation ne se compare que lorsqu'elle EST un n° OMI. Le
        // même champ porte l'indicatif d'appel chez certains transporteurs
        // (« 5LCQ4 » chez MSC, « 9403360 » chez GINA) : confronter un indicatif
        // à un OMI ne signalerait qu'une différence de nature.
        $omi = $navire->imo === null ? null : preg_replace('/\D/', '', $navire->imo);

        if ($enTete->immatriculation !== null && $omi !== null && $omi !== ''
            && preg_match('/^\d{7}$/', $enTete->immatriculation) === 1
            && $enTete->immatriculation !== $omi) {
            $reserves[] = __('N° OMI : le fichier annonce :lu, la fiche du navire porte :attendu.', [
                'lu' => $enTete->immatriculation,
                'attendu' => $navire->imo,
            ]);
        }

        // Qui a émis le manifeste : l'agent maritime quand le profil le nomme,
        // le transporteur sinon — c'est la même société vue de deux balises.
        $emetteur = $enTete->agent ?? $enTete->transporteur;
        $societe = $dossier->consignataire;

        if ($emetteur !== null && $societe !== null
            && ! $this->memePrefixe($emetteur, $societe->name)
            && ! ($societe->sigle !== null && $this->memePrefixe($emetteur, $societe->sigle))) {
            $reserves[] = __('Émetteur : le manifeste est émis par :lu ; le dossier appartient à :attendu.', [
                'lu' => $emetteur,
                'attendu' => $societe->name,
            ]);
        }

        // `Date_of_arrival` est la date RÉELLE d'arrivée (précisé par le CGC le
        // 2026-08-27). Elle se confronte donc à l'accostage de la situation
        // portuaire — deux faits — et jamais à l'`eta_prevue` du dossier, qui
        // n'est qu'une annonce : l'écart y serait la règle, pas l'anomalie.
        $accostage = $dossier->mouvementNavire?->eta;
        $arrivee = $enTete->dateArrivee;

        if ($arrivee !== null && $accostage !== null
            && preg_match('/^\d{4}-\d{2}-\d{2}/', $arrivee) === 1
            && mb_substr($arrivee, 0, 10) !== $accostage->toDateString()) {
            $reserves[] = __('Arrivée : le fichier annonce le :lu ; la situation portuaire donne le :attendu.', [
                'lu' => $this->jour($arrivee),
                'attendu' => $accostage->format('d/m/Y'),
            ]);
        }

        return $reserves;
    }

    /** Une date ISO du fichier, écrite comme le port l'écrit. */
    private function jour(string $iso): string
    {
        return implode('/', array_reverse(explode('-', mb_substr($iso, 0, 10))));
    }

    /**
     * @param  array<int, SimpleXMLElement>|false|null  $noeuds
     *
     * @throws ValidationException
     */
    private function texte(array|false|null $noeuds): ?string
    {
        if ($noeuds === false || $noeuds === null || $noeuds === []) {
            return null;
        }

        $valeur = trim((string) $noeuds[0]);

        return $valeur === '' ? null : $valeur;
    }

    /** @param  array<int, SimpleXMLElement>|false|null  $noeuds */
    private function entier(array|false|null $noeuds): ?int
    {
        $valeur = $this->decimal($noeuds);

        return $valeur === null ? null : (int) $valeur;
    }

    /**
     * Les quantités arrivent en décimal — « 0.00 », « 108.86 » — même sur des
     * champs typés entiers. Les caster en `int` trop tôt tronque le cubage.
     *
     * @param  array<int, SimpleXMLElement>|false|null  $noeuds
     */
    private function decimal(array|false|null $noeuds): ?float
    {
        $valeur = $this->texte($noeuds);

        return $valeur === null || ! is_numeric($valeur) ? null : (float) $valeur;
    }

    /** Le poids se stocke au kilo : la balance du port ne pèse pas les grammes. */
    private function arrondi(?float $valeur): ?int
    {
        return $valeur === null ? null : (int) round($valeur);
    }

    /**
     * @phpstan-return never
     *
     * @throws ValidationException
     */
    private function refuser(string $motif): void
    {
        throw ValidationException::withMessages(['fichier' => $motif]);
    }
}
