import type {
    AgentStatut,
    ArmementBadge,
} from '@/components/admin/users/types';

/*
 * Formes de données de l'espace d'une société consignataire — miroir de ce que
 * projette `MonEspaceController::index`.
 *
 * Les quatre statuts et la pastille d'armement sont ceux du module CGC : c'est
 * le même compte agent, vu depuis l'autre bord. Les redéfinir ici les ferait
 * diverger au premier changement.
 */

export type MonAgentRow = {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    job_title: string | null;
    email: string;
    statut: AgentStatut;
    /** Ce que le CGC a répondu en cas de refus — ce qu'il faut corriger (ADR-0024). */
    motif_refus: string | null;
    last_login_at: string | null;
    /** Portée de l'agent (ADR-0009), pilotée depuis l'onglet Affectations. */
    armements: ArmementBadge[];
    /** La ligne du titulaire lui-même : présente, mais sans prise (ADR-0012). */
    est_moi: boolean;
    /** Vrai tant que le CGC n'a jamais statué sur cette demande. */
    peut_supprimer: boolean;
};

/**
 * Un armement que la société représente (ADR-0014) — la pastille du module CGC,
 * augmentée de ce qui n'a de sens qu'ici. Reste assignable à `ArmementBadge`,
 * ce qui laisse la matrice d'affectation s'en servir telle quelle.
 */
export type MonArmementRow = ArmementBadge & {
    /** Pavillon de l'armateur — le pays d'où il opère. */
    pays_origine: string | null;
    /** Pays où la compagnie est immatriculée ; souvent distinct du pavillon. */
    pays_immatriculation: string | null;
    gerant: string | null;
    rccm_nif: string | null;
    adresse: string | null;
    /** Un armement désactivé au référentiel ne portera plus d'escale nouvelle. */
    actif: boolean;
};

/** Un port où la société est habilitée à exercer (ADR-0014). */
export type MonPortRow = {
    id: number;
    name: string;
    code: string;
    pays: string | null;
};

/**
 * La fiche de la société, telle que le CGC la détient. Sans identifiant : cet
 * écran ne s'adresse qu'à une seule société, celle du compte connecté, et
 * n'écrit rien.
 */
export type MonSocieteFiche = {
    name: string;
    sigle: string | null;
    rccm_nif: string | null;
    pays_immatriculation: string | null;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
    ports: MonPortRow[];
};
