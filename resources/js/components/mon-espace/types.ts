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
    /** Pavillon de l'armateur, tel que le CGC le détient. */
    pays: string | null;
    /** Un armement désactivé au référentiel ne portera plus d'escale nouvelle. */
    actif: boolean;
};
