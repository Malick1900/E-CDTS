<?php

namespace App\Enums;

/**
 * La nomenclature des marchandises — les 19 types que l'on qualifie ligne par
 * ligne au manifeste (arrêtée avec le porteur du projet le 2026-08-26).
 *
 * **Un type n'est pas une ligne de barème.** C'est ce que l'on désigne ; le
 * tarif se résout ensuite par `type × sens × unité déclarée`, plus le mode
 * d'exploitation pour le seul bois export. Un même type ouvre donc jusqu'à
 * quatre lignes de barème selon le sens et l'assiette — c'est la règle de
 * l'unité payante qui tranche entre elles.
 *
 * L'ordre des cas est celui du document et sert à l'affichage : c'est la liste
 * que le consignataire déroule à la qualification. On ne le réordonne pas sans
 * y regarder à deux fois.
 *
 * **Trois types sont mono-sens** : le bois (16, 17) ne se facture qu'à
 * l'export, les autres emballages (18) qu'à l'import. La liste proposée se
 * filtre donc par le sens du dossier — un type sans ligne dans le sens courant
 * ne s'affiche pas, plutôt que de s'afficher à 0 F et d'être choisi par erreur.
 *
 * @see docs/BAREME-CDTS.md §Nomenclature des types de marchandise
 * @see docs/DECISIONS.md ADR-0044
 */
enum TypeMarchandise: string
{
    case Sacherie = 'sacherie';
    case VehiculeTourisme = 'vehicule_tourisme';
    case VehiculeUtilitaire = 'vua';
    case Conventionnel = 'conventionnel';
    case LiquideConteneurise = 'liquide_conteneurise';
    case VracLiquide = 'vrac_liquide';
    case DerivesHydrocarbures = 'derives_hydrocarbures';
    case VracSolide = 'vrac_solide';
    case DerivesMinerais = 'derives_minerais';
    case Conteneur20S = 'conteneur_20s';
    case Conteneur40S = 'conteneur_40s';
    case Conteneur20F = 'conteneur_20f';
    case Conteneur40F = 'conteneur_40f';
    case Conteneur45S = 'conteneur_45s';
    case Conteneur45F = 'conteneur_45f';
    case BoisConventionnel = 'bois_conventionnel';
    case BoisConteneurise = 'bois_conteneurise';
    case AutresEmballages = 'autres_emballages';
    case MineraisVracLiquide = 'minerais_vrac_liquide';

    /** Le libellé que l'agent a sous les yeux à la qualification. */
    public function label(): string
    {
        return match ($this) {
            self::Sacherie => 'Sacherie — sucre, farine, céréales',
            self::VehiculeTourisme => 'Véhicule de tourisme',
            self::VehiculeUtilitaire => 'Véhicule utilitaire et autres',
            self::Conventionnel => 'Autres marchandises en conventionnel',
            self::LiquideConteneurise => 'Liquide conteneurisé',
            self::VracLiquide => 'Vrac liquide',
            self::DerivesHydrocarbures => 'Produits dérivés des hydrocarbures',
            self::VracSolide => 'Vrac solide',
            self::DerivesMinerais => 'Produits dérivés des minerais',
            self::Conteneur20S => 'Conteneur 20′ sec',
            self::Conteneur40S => 'Conteneur 40′ sec',
            self::Conteneur20F => 'Conteneur 20′ réfrigéré',
            self::Conteneur40F => 'Conteneur 40′ réfrigéré',
            self::Conteneur45S => 'Conteneur 45′ sec',
            self::Conteneur45F => 'Conteneur 45′ réfrigéré',
            self::BoisConventionnel => 'Bois et produits dérivés en conventionnel',
            self::BoisConteneurise => 'Bois et produits dérivés conteneurisés',
            self::AutresEmballages => 'Autres emballages',
            self::MineraisVracLiquide => 'Minerais et vrac liquide',
        };
    }

    /**
     * Les sens où ce type se facture. Le bois n'existe qu'à l'export (un
     * contreplaqué importé tombe en « autres marchandises en conventionnel »),
     * les autres emballages qu'à l'import.
     *
     * @return list<SensTrafic>
     */
    public function sens(): array
    {
        return match ($this) {
            self::BoisConventionnel, self::BoisConteneurise => [SensTrafic::Export],
            self::AutresEmballages => [SensTrafic::Import],
            default => [SensTrafic::Export, SensTrafic::Import],
        };
    }

    public function existeEn(SensTrafic $sens): bool
    {
        return in_array($sens, $this->sens(), strict: true);
    }

    /**
     * Les types proposés à la qualification dans un sens donné, dans l'ordre
     * du document.
     *
     * @return list<self>
     */
    public static function pour(SensTrafic $sens): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $type): bool => $type->existeEn($sens),
        ));
    }

    /**
     * Ce type désigne-t-il une boîte, facturée au forfait ?
     *
     * Six types sur dix-neuf, et eux seuls, se facturent au conteneur. C'est la
     * frontière entre ce que la machine qualifie seule — la taille est dans le
     * XML — et ce qui relève du jugement.
     */
    public function estConteneur(): bool
    {
        return $this->taille() !== null;
    }

    /** La taille de la boîte en pieds — nulle si le type n'en désigne pas une. */
    public function taille(): ?int
    {
        return match ($this) {
            self::Conteneur20S, self::Conteneur20F => 20,
            self::Conteneur40S, self::Conteneur40F => 40,
            self::Conteneur45S, self::Conteneur45F => 45,
            default => null,
        };
    }

    /**
     * Le type conteneur correspondant à une taille et à un état.
     *
     * C'est toute la pré-qualification automatique : la taille vient du XML,
     * le froid se déduit de la description (MANIFESTE-XML.md — le profil
     * gabonais ne transmet jamais le code ISO frigo). Une taille inconnue rend
     * null : la ligne restera à qualifier plutôt que d'être devinée.
     */
    public static function conteneur(int $taille, bool $frigo): ?self
    {
        return match ([$taille, $frigo]) {
            [20, false] => self::Conteneur20S,
            [20, true] => self::Conteneur20F,
            [40, false] => self::Conteneur40S,
            [40, true] => self::Conteneur40F,
            [45, false] => self::Conteneur45S,
            [45, true] => self::Conteneur45F,
            default => null,
        };
    }

    /**
     * Le type d'une boîte, déduit de ce que le manifeste en dit.
     *
     * C'est toute la pré-qualification automatique, et elle s'arrête là : la
     * taille vient du fichier, le froid des mots de la description. Une taille
     * absente rend null — la ligne restera à qualifier plutôt que devinée.
     */
    public static function conteneurDepuis(?int $taille, ?string $description): ?self
    {
        return $taille === null
            ? null
            : self::conteneur($taille, self::sentLeFroid($description));
    }

    /**
     * La marchandise voyage-t-elle au froid ?
     *
     * ⚠ Cela ne se déduit PAS du type de conteneur : le profil gabonais ne
     * transmet que la taille (20 / 40 / 45), jamais le code ISO 6346 frigo. La
     * distinction se fait donc aux mots de la description — et l'écart tarifaire
     * est considérable : un 20' réfrigéré import coûte 28 652 F contre 16 373 F
     * pour un sec.
     *
     * Les motifs sont bornés par des frontières de mot : « RF » seul désigne un
     * reefer, mais « RFID » ou « SURF » ne disent rien du froid.
     *
     * @see docs/MANIFESTE-XML.md §Règles de codage (sec / réfrigéré)
     */
    public static function sentLeFroid(?string $description): bool
    {
        if ($description === null || trim($description) === '') {
            return false;
        }

        $motifs = [
            'FROZEN', 'REEFER', 'RF', 'CONGELE', 'CONGELÉ',
            'REFRIGERE', 'RÉFRIGÉRÉ', 'SURGELE', 'SURGELÉ', 'CHILLED',
        ];

        $texte = mb_strtoupper($description);

        foreach ($motifs as $motif) {
            // Les sigles courts se bornent des deux côtés — sans quoi « RF »
            // ferait passer un conteneur de puces « RFID » pour un frigo. Les
            // mots longs gardent leur fin libre, pour attraper les pluriels et
            // les formes accordées (« CONGELES », « REFRIGEREE »).
            $borne = mb_strlen($motif) <= 3 ? '\\b' : '';

            if (preg_match('/\\b'.preg_quote($motif, '/').$borne.'/u', $texte) === 1) {
                return true;
            }
        }

        // « -18C », « -18°C », « - 18 °C » : la température de consigne, qui ne
        // s'écrit jamais deux fois pareil d'un transporteur à l'autre.
        return preg_match('/-\\s?\\d{1,2}\\s?°?\\s?C\\b/u', $texte) === 1;
    }

    /**
     * Le tarif de ce type dépend-il du mode d'exploitation du navire ?
     *
     * Le bois export seul : une grume part ~13 % plus cher en tramping qu'en
     * ligne régulière. La valeur lue est celle de l'ESCALE, jamais celle du
     * navire (BAREME-CDTS.md §Notes de gestion).
     */
    public function suitLeModeDExploitation(): bool
    {
        return in_array($this, [self::BoisConventionnel, self::BoisConteneurise], strict: true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $t): string => $t->value, self::cases());
    }
}
