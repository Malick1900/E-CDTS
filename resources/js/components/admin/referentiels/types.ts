/*
 * Formes de données du module Référentiels — miroir exact de ce que projette
 * `ReferentielController` (une méthode privée par référentiel).
 *
 * Convention : le formulaire manipule les clés `*_id` (ce qu'on renvoie au
 * serveur) ; les clés `*_name` sont les libellés déjà résolus côté serveur, en
 * lecture seule, pour éviter au front de recroiser les listes lui-même.
 */

/** Tout référentiel se désactive, jamais ne se supprime (ADR-0012). */
export type LigneReferentiel = { id: number; actif: boolean };

export type TypeNavireRow = LigneReferentiel & {
    code: string;
    name: string;
    navires_count: number;
};

export type PaysRow = LigneReferentiel & {
    code: string;
    name: string;
    navires_count: number;
    ports_count: number;
};

export type PortRow = LigneReferentiel & {
    code: string;
    name: string;
    pays_id: number | null;
    pays_name: string | null;
    prefixe_numerotation: string | null;
};

export type ArmementRow = LigneReferentiel & {
    name: string;
    sigle: string | null;
    pays_origine_id: number | null;
    pays_origine_name: string | null;
    pays_immatriculation_id: number | null;
    pays_immatriculation_name: string | null;
    gerant: string | null;
    rccm_nif: string | null;
    adresse: string | null;
    navires_count: number;
};

/** Valeurs de l'enum PHP `App\Enums\ModeExploitation`. */
export type ModeExploitation = 'ligne_reguliere' | 'tramping';

export type NavireRow = LigneReferentiel & {
    name: string;
    imo: string | null;
    type_navire_id: number | null;
    type_navire_code: string | null;
    type_navire_name: string | null;
    armement_id: number | null;
    armement_name: string | null;
    pays_id: number | null;
    pays_name: string | null;
    mode_exploitation_defaut: ModeExploitation | null;
};

/** Entrée d'une liste déroulante rattachant une ligne à un autre référentiel. */
export type Option = { value: number; label: string };

/** Nombre de lignes par page — identique sur les cinq onglets. */
export const PAR_PAGE = 25;
