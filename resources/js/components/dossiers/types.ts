/*
 * Formes de données de l'écran « Dossiers d'escale » — miroir de ce que
 * projette `DossierEscaleController::index`.
 *
 * Une ligne ne porte ni pavillon, ni type de navire, ni dates réelles
 * d'accostage : le navire vient du référentiel, les dates de la situation
 * portuaire (ADR-0009). Le serveur aplatit ce qu'il faut pour l'affichage ;
 * tout reste en lecture seule ici.
 */

export type EtapeRef = {
    value: string;
    label: string;
    /** Position sur la frise du circuit, de 1 à 6 — nulle pour « Annulé ». */
    rang: number | null;
};

export type SensRef = { value: string; label: string };

export type PortRef = { id: number; label: string };

export type DossierRow = {
    id: number;
    /** Le n° de manifeste une fois figé, la référence interne avant (ADR-0008). */
    numero: string;
    /** Le numéro affiché est-il encore provisoire, faute de manifeste ? */
    provisoire: boolean;
    navire: string;
    voyage: string;
    sens: string;
    consignataire: string;
    port: string;
    poste: string | null;
    etape: string;
    /** Horodatage ISO de l'ouverture du dossier. */
    ouvertLe: string;
    /** Montant liquidé en francs CFA — nul tant qu'aucun devis n'est émis. */
    montant: number | null;
    /**
     * L'étape du dossier a-t-elle un écran ? Le serveur seul le sait
     * (`EtapeDossier::ecran`) : la ligne s'ouvre au clic, ou reste inerte.
     */
    ouvrable: boolean;
};

export type Filtres = {
    q: string;
    /** « all » ou une valeur de `SensTrafic`. */
    sens: string;
    /** « all » ou une valeur d'`EtapeDossier`. */
    etape: string;
    port: number | null;
};

export type Resume = {
    tous: number;
    ouverts: number;
    enCours: number;
    clotures: number;
};

/*
 * ── Écran d'ouverture (WF3) ──────────────────────────────────────────────
 */

/**
 * Un navire du référentiel CGC. Ses attributs accompagnent le choix pour être
 * montrés en lecture seule : le consignataire vérifie qu'il désigne le bon
 * navire, il ne les modifie pas.
 */
export type NavireRef = {
    id: number;
    name: string;
    imo: string | null;
    pavillon: string | null;
    typeCode: string | null;
    typeLabel: string | null;
    armementId: number | null;
    armement: string | null;
    /** « Ligne régulière » ou « Tramping » — il pèse sur la liquidation. */
    modeExploitation: string | null;
};

export type ArmementRef = { id: number; label: string };

export type PosteRef = { id: number; code: string };

/** Un port et ses postes : le second menu se borne au choix du premier. */
export type PortAvecPostes = PortRef & { postes: PosteRef[] };

/** Le dossier qui vient d'être ouvert, tel que l'écran de confirmation le lit. */
export type DossierOuvert = {
    id: number;
    reference: string;
    numero: string;
    provisoire: boolean;
    consignataire: string;
    navire: string;
    pavillon: string | null;
    typeCode: string | null;
    typeLabel: string | null;
    armement: string | null;
    voyage: string;
    sens: string;
    sensLabel: string;
    port: string;
    poste: string | null;
    etaPrevue: string | null;
    ouvertLe: string;
    etape: string;
};

/*
 * ── Écran du manifeste (WF4 / WF5) ─────────────────────────────────
 */

/**
 * Le dossier tel que la bannière du manifeste le lit.
 *
 * Deux sources s'y croisent, et la distinction compte : ce que le
 * consignataire a déclaré à l'ouverture (`etaAnnoncee`, `posteAnnonce`) et ce
 * que la situation portuaire constate (`eta`, `etd`, `poste`, `posteStatut`).
 * La seconde n'existe qu'une fois le dossier rapproché de sa ligne (ADR-0009)
 * — d'où `rapproche`, qui dit à l'écran laquelle montrer.
 */
export type DossierManifeste = {
    id: number;
    /** Le n° de manifeste une fois figé, la référence interne avant (ADR-0008). */
    numero: string;
    provisoire: boolean;
    /** La référence interne — libellé d'audit, non communiqué aux tiers. */
    reference: string;
    consignataire: string;
    navire: string;
    armement: string | null;
    pavillon: string | null;
    typeCode: string | null;
    typeLabel: string | null;
    voyage: string;
    sens: string;
    sensLabel: string;
    port: string;
    etape: string;
    etapeLabel: string;
    /** L'ETA annoncée à l'ouverture — la seule date que le dossier détienne. */
    etaAnnoncee: string | null;
    /** Le poste demandé à l'ouverture, avant toute affectation réelle. */
    posteAnnonce: string | null;
    /** Le dossier a-t-il retrouvé sa ligne de situation portuaire ? */
    rapproche: boolean;
    /** Accostage réel, lu à la situation portuaire — jamais recopié ici. */
    eta: string | null;
    /** Départ réel, même provenance. */
    etd: string | null;
    poste: string | null;
    /** « À quai », « En rade »… — l'état du navire au port. */
    posteStatut: string | null;
    /**
     * Boîtes distinctes du manifeste — nul tant qu'aucun manifeste n'est
     * rattaché. Le groupage est déduit : une boîte sous deux connaissements
     * n'en fait pas deux.
     */
    conteneurs: number | null;
};

/**
 * Un type de la nomenclature, borné au sens du dossier : le bois ne se propose
 * pas à l'import, les autres emballages pas à l'export.
 */
export type TypeRef = {
    value: string;
    label: string;
    /** Un type de boîte, facturé au forfait — six sur dix-neuf. */
    conteneur: boolean;
};

/**
 * Une ligne du tableau de dépouillement.
 *
 * Le tableau est à plat — une ligne par conteneur, plus une par part hors
 * conteneur — alors que la facturation reste au BL pour le poids et au
 * conteneur pour le forfait. D'où `poidsKg`, `volumeM3` et `colis` renseignés
 * sur UNE seule ligne par connaissement : les autres les laissent nuls, et le
 * pied de tableau ne compte le tonnage qu'une fois.
 */
export type LigneManifeste = {
    /** « c:12 » pour un conteneur, « v:34 » pour la part vrac d'un BL. */
    cle: string;
    numero: number;
    bl: string;
    /** Le connaissement dont la ligne relève — la maille où l'on corrige. */
    blId: number;
    /** Un house/dégroupage — déduit de la présence d'un connaissement mère. */
    groupage: boolean;
    portChargement: string | null;
    portChargementNom: string | null;
    portDechargement: string | null;
    portDechargementNom: string | null;
    expediteur: string | null;
    destinataire: string | null;
    /** Le n° de boîte — nul sur une ligne de vrac. */
    conteneur: string | null;
    /** 20, 40 ou 45 — la taille seule, jamais le code ISO complet. */
    taille: number | null;
    description: string | null;
    poidsKg: number | null;
    volumeM3: number | null;
    colis: number | null;
    /** La qualification, nulle tant que personne n'a dit ce que c'était. */
    type: string | null;
    /** En francs CFA — nul tant que la ligne n'a ni type ni assiette. */
    montant: number | null;
    /** L'article de barème retenu : « IMP17 », « EXP02B »… */
    reference: string | null;
    /** L'assiette qui l'a emporté : « t », « m³ », « TC », « unité ». */
    unite: string | null;
};

/** Le pied du tableau — sur TOUT le manifeste, jamais sur la page affichée. */
export type TotauxManifeste = {
    lignes: number;
    bls: number;
    /** Références de conteneur distinctes, groupage déduit. */
    conteneurs: number;
    poidsKg: number;
    volumeM3: number;
    montant: number;
    qualifiees: number;
    aQualifier: number;
    /** Pas une ligne en l'air : le manifeste peut partir au CGC. */
    transmissible: boolean;
};

/** Le manifeste tel que l'écran le lit — nul tant qu'aucun n'est rattaché. */
export type ManifesteTableau = {
    id: number;
    /** Nul tant que le manifeste n'est pas acquis — e-CDTS l'attribue alors. */
    numero: string | null;
    modeSaisie: string;
    modeLabel: string;
    etat: string;
    etatLabel: string;
    /** Après transmission, plus rien ne bouge côté consignataire. */
    modifiable: boolean;
    /** Le nom d'origine de la pièce probante — nul tant qu'elle manque. */
    pieceJointe: string | null;
    pieceJointeOctets: number | null;
    /**
     * La pièce ne se retire qu'en saisie manuelle : en mode XML, elle EST le
     * fichier qui a produit le tableau.
     */
    pieceRetirable: boolean;
    transmisLe: string | null;
    /**
     * Ce qui empêche encore la transmission, dit en clair. Vide quand la voie
     * est libre. Le dernier motif possible ne dépend pas du consignataire : la
     * situation portuaire doit avoir constaté le jalon de son sens (ADR-0009).
     */
    obstacles: string[];
    lignes: LigneManifeste[];
    page: number;
    parPage: number;
    /** Les pas proposés au sélecteur : 25, 50, 100. */
    pas: number[];
    /** Lignes du filtrage courant, toutes pages confondues. */
    total: number;
    /** Lignes du manifeste entier — sépare « aucune ligne » de « aucun résultat ». */
    totalLignes: number;
    filtres: { q: string; type: string };
    totaux: TotauxManifeste;
};

/**
 * Un connaissement ouvert en correction — la maille de SAISIE.
 *
 * Elle ne se confond pas avec la ligne du tableau, qui est la maille
 * d'AFFICHAGE : poids, volume et colis appartiennent au BL et se corrigent ici,
 * jamais boîte par boîte (MANIFESTE-XML.md, première règle de totaux).
 */
export type ConnaissementSaisi = {
    /** Nul sur une déclaration nouvelle, renseigné sur une correction. */
    id: number | null;
    reference: string;
    master_reference: string | null;
    port_chargement: string | null;
    port_chargement_nom: string | null;
    port_dechargement: string | null;
    port_dechargement_nom: string | null;
    expediteur: string | null;
    destinataire: string | null;
    description: string | null;
    poids_brut_kg: number | null;
    volume_m3: number | null;
    colis: number | null;
    /** Le BL porte-t-il de la marchandise hors de toute boîte ? */
    hors_conteneur: boolean;
    conteneurs: ConteneurSaisi[];
};

/** Une boîte en cours de saisie. */
export type ConteneurSaisi = {
    reference: string;
    /** 20, 40 ou 45 — le barème n'en connaît pas d'autres. */
    taille: number | null;
    colis: number | null;
    tare_kg: number | null;
};

/** Les quatre encres d'une pastille d'état, telles que la charte les fixe. */
export type Teinte = {
    encre: string;
    fond: string;
    bord: string;
    point: string;
};

const INFO: Teinte = {
    encre: '#14509C',
    fond: '#E4F3FC',
    bord: '#B5DFF7',
    point: '#1D3E9C',
};
const ALERTE: Teinte = {
    encre: '#B26200',
    fond: '#FDF1E3',
    bord: '#F0CFA0',
    point: '#E07B00',
};
const PRINCIPALE: Teinte = {
    encre: '#1D3E9C',
    fond: '#E9EEFB',
    bord: '#C3D0F0',
    point: '#1D3E9C',
};
const ACQUISE: Teinte = {
    encre: '#21771F',
    fond: '#E7F5E7',
    bord: '#BFE4BF',
    point: '#2F9E2F',
};
const NEUTRE: Teinte = {
    encre: '#5A6478',
    fond: '#EEF1F7',
    bord: '#D8DEE9',
    point: '#8A93A6',
};

/**
 * La couleur d'une étape. Elle suit l'engagement plutôt que l'avancement :
 * bleu clair tant que le dossier se remplit, orange pendant la navette du
 * dépouillement et le devis — le moment où l'on attend quelque chose de
 * quelqu'un —, bleu franc une fois facturé, vert une fois clos. Gris pour la
 * sortie de route, qui n'est pas une étape.
 */
export function teinteEtape(etape: string): Teinte {
    switch (etape) {
        case 'ouvert':
        case 'manifeste':
            return INFO;
        case 'depouillement':
        case 'devis':
            return ALERTE;
        case 'facture':
            return PRINCIPALE;
        case 'cloture':
            return ACQUISE;
        default:
            return NEUTRE;
    }
}

/** Un sens de trafic se lit d'un coup d'œil : l'import ressort, l'export non. */
export function teinteSens(sens: string): Teinte {
    return sens === 'import' ? INFO : NEUTRE;
}

/** « 05/07/2026 » — la date d'ouverture, comme le dossier papier l'écrit. */
export function formatDate(iso: string): string {
    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
}

/** « 05/07/2026 à 09h05 » — l'horodatage d'ouverture d'un dossier. */
export function formatDateHeure(iso: string | null): string {
    if (iso === null) {
        return '—';
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return iso;
    }

    const heure = `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;

    return `${d.toLocaleDateString('fr-FR')} à ${heure}`;
}

/** Espace insécable : un montant ne se coupe pas en fin de ligne. */
const INSECABLE = '\u00a0';

/**
 * « 4 320 000 FCFA ». Le franc CFA n'a pas de subdivision — jamais de décimale.
 */
/** « 12,5 » — un tonnage, toujours à la décimale près. */
export function formatTonnes(kg: number): string {
    return (kg / 1000).toLocaleString('fr-FR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

/** « 1 240 » — un compte, groupé par milliers. */
export function formatNombre(valeur: number): string {
    return valeur.toLocaleString('fr-FR');
}

/**
 * « 1 ligne », « 5 lignes » — un compte et son mot, accordés.
 *
 * Le pluriel se déduit du singulier tant qu'un `s` suffit ; il se donne quand
 * l'accord porte sur plus d'un mot (« ligne qualifiée » → « lignes
 * qualifiées », mais « ligne à qualifier » → « lignes à qualifier »).
 */
export function accorde(
    nombre: number,
    singulier: string,
    pluriel = `${singulier}s`,
): string {
    return `${formatNombre(nombre)} ${nombre > 1 ? pluriel : singulier}`;
}

export function formatFCFA(montant: number): string {
    const groupe = montant
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, INSECABLE);

    return `${groupe}${INSECABLE}FCFA`;
}

/** « 1,4 Mo » — la taille d'une pièce jointe, à l'échelle qui se lit. */
export function formatOctets(octets: number | null): string {
    if (octets === null) {
        return '—';
    }

    if (octets < 1024) {
        return `${octets} o`;
    }

    const ko = octets / 1024;

    return ko < 1024
        ? `${ko.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`
        : `${(ko / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

/*
 * L'aperçu d'un manifeste XML — miroir de ce que flashe
 * `ManifesteImportController::apercu`.
 *
 * Rien n'est encore enregistré quand cette forme arrive : c'est la lecture du
 * fichier déposé, pas un manifeste. D'où les champs presque tous nullables —
 * un profil de transporteur renseigne ce qu'il veut, et l'écran doit pouvoir
 * dire « non renseigné » plutôt que de combler.
 */

/** Le `General_segment` : ce que le fichier dit de l'escale. */
export type EnTeteManifeste = {
    /** Le bureau de douane émetteur — OW100, OW110, GAPOG. Pas un port. */
    bureau: string | null;
    voyage: string | null;
    navire: string | null;
    /** Code pays du pavillon, sur deux ou trois lettres selon le profil. */
    pavillon: string | null;
    /** N° OMI ou indicatif d'appel, selon le transporteur. */
    immatriculation: string | null;
    transporteur: string | null;
    agent: string | null;
    /** Dates du fichier, au format ISO court — celle d'arrivée est RÉELLE. */
    dateDepart: string | null;
    dateArrivee: string | null;
    /** UN/LOCODE du port d'où part le navire, et de celui qu'il dessert. */
    portDepart: string | null;
    portDestination: string | null;
};

export type ApercuManifeste = {
    fichier: { nom: string | null; octets: number | null };
    enTete: EnTeteManifeste;
    /** Les totaux que le fichier annonce — nuls s'il n'en porte pas. */
    annonces: {
        bls: number | null;
        colis: number | null;
        conteneurs: number | null;
        masseKg: number | null;
    } | null;
    /** Ce que le fichier contient vraiment, recompté à la lecture. */
    contenu: {
        bls: number;
        conteneurs: number;
        poidsKg: number;
        volumeM3: number;
        /** Combien de lignes l'import laissera à qualifier. */
        aQualifier: number;
    };
    /** Les écarts relevés qui ne ferment pas la porte. */
    reserves: string[];
};
