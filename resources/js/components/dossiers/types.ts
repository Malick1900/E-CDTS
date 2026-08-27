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
