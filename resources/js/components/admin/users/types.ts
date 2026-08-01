import type { LigneAdmin, Option } from '../types';

/*
 * Formes de données du module Utilisateurs & habilitations — miroir de ce que
 * projette `UserController::index`.
 *
 * Même convention qu'aux référentiels : le formulaire manipule les clés `*_id`
 * (ce qu'on renvoie au serveur), les clés `*_name` sont les libellés déjà
 * résolus côté serveur, en lecture seule.
 */

/**
 * Le minimum dont le dialogue de remplacement du titulaire a besoin (ADR-0027).
 * Une ligne de liste comme une fiche satisfont cette forme — le dialogue sert
 * donc les deux écrans sans être dupliqué.
 */
export type CibleTitulaire = {
    id: number;
    name: string;
    titulaire_name: string | null;
    /** Successeurs possibles : les agents validés de la société. */
    agents_eligibles: Option[];
};

export type ConsignataireRow = LigneAdmin & {
    /** Raison sociale. Colonne `name`, comme sur l'armement (ADR-0023). */
    name: string;
    sigle: string | null;
    rccm_nif: string | null;
    pays_immatriculation_id: number | null;
    pays_immatriculation_name: string | null;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
    /** Armements représentés (N-N, ADR-0014). */
    armement_ids: number[];
    armement_names: string[];
    /** Ports où la société exerce (N-N, ADR-0014). */
    port_ids: number[];
    port_names: string[];
    /**
     * Compte maître de la société (ADR-0010) : la personne qui crée les comptes
     * de ses agents — et qui déclare elle aussi. Nul tant que le CGC ne l'a pas
     * ouvert ; les champs alimentent directement le tiroir.
     */
    titulaire_user_id: number | null;
    titulaire_name: string | null;
    titulaire_first_name: string | null;
    titulaire_last_name: string | null;
    titulaire_email: string | null;
    titulaire_phone: string | null;
    titulaire_job_title: string | null;
    /** Successeurs possibles : les agents validés de la société, titulaire exclu. */
    agents_eligibles: Option[];
    /** La liste dit combien de comptes ; la fiche dit lesquels. */
    agents_count: number;
    /** Le seul chiffre qui appelle une décision du CGC (ADR-0013). */
    agents_en_attente: number;
};

/**
 * Les quatre états d'un compte agent, tels que le serveur les calcule : la
 * décision du CGC (`statut_validation`) croisée avec l'activation du compte.
 * « Désactivé » n'est donc pas un refus — c'est un accès accordé puis suspendu.
 */
export type AgentStatut = 'actif' | 'en_attente' | 'desactive' | 'refuse';

/** Armement tel qu'affiché en pastille ou proposé au tiroir d'affectation. */
export type ArmementBadge = {
    id: number;
    name: string;
    sigle: string | null;
};

export type AgentRow = {
    id: number;
    name: string;
    email: string;
    job_title: string | null;
    consignataire_id: number | null;
    consignataire_name: string | null;
    /** Titulaire du compte de sa société : il déclare **et** gère les agents. */
    est_titulaire: boolean;
    statut: AgentStatut;
    /** Portée de l'agent (ADR-0009), en lecture seule côté CGC (ADR-0030). */
    armements: ArmementBadge[];
    /** Trace de la dernière décision du CGC (ADR-0024). */
    decide_par: string | null;
    decide_le: string | null;
    motif_refus: string | null;
};

/**
 * Une colonne de la matrice « Rôles & permissions » (ADR-0025). `super-admin`
 * n'y figure jamais ; `Administrateur` et les deux rôles clients (ADR-0031) y
 * figurent avec `recomposable` à faux.
 */
export type RoleMatriceRow = {
    id: number;
    name: string;
    recomposable: boolean;
    /** Pourquoi la colonne est verrouillée — infobulle des cases figées. */
    motif_fige: string | null;
    /** Noms des permissions actuellement portées (valeurs de l'enum PHP). */
    permissions: string[];
};

/** Un bloc de la matrice : les permissions d'un même domaine métier. */
export type GroupePermissions = {
    domaine: string;
    permissions: { value: string; label: string }[];
};

/*
 * Fiche d'une société cliente — miroir de `ConsignataireController::show`.
 *
 * La liste résume les relations multiples, la fiche les déplie : c'est le seul
 * écran où l'on voit *quels* armements et *quels* ports, plutôt que combien.
 */

export type ConsignataireFiche = CibleTitulaire & {
    sigle: string | null;
    rccm_nif: string | null;
    pays_immatriculation_name: string | null;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
    actif: boolean;
    titulaire_user_id: number | null;
    titulaire_email: string | null;
    titulaire_job_title: string | null;
};

export type ArmementRepresente = ArmementBadge & {
    pays_origine_name: string | null;
    /** Vrai quand une autre société représente aussi cet armement (ADR-0014). */
    partage: boolean;
};

export type PortRattache = {
    id: number;
    name: string;
    code: string | null;
    pays_name: string | null;
};

/** Un compte agent vu depuis la fiche de sa société — en lecture seule : les
 *  décisions se prennent dans l'onglet Agents, pas ici. */
export type AgentFiche = {
    id: number;
    name: string;
    email: string;
    job_title: string | null;
    est_titulaire: boolean;
    statut: AgentStatut;
    armements: ArmementBadge[];
};
