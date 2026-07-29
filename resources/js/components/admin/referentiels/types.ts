import type { LigneAdmin } from '../types';

/*
 * Formes de données du module Référentiels — miroir exact de ce que projette
 * `ReferentielController` (une méthode privée par référentiel).
 *
 * Convention : le formulaire manipule les clés `*_id` (ce qu'on renvoie au
 * serveur) ; les clés `*_name` sont les libellés déjà résolus côté serveur, en
 * lecture seule, pour éviter au front de recroiser les listes lui-même.
 *
 * Ce qui n'a rien de maritime — `LigneAdmin`, `Option`, `PAR_PAGE` — vit dans
 * `components/admin/types.ts`, partagé par tout le panneau.
 */

export type TypeNavireRow = LigneAdmin & {
    code: string;
    name: string;
    navires_count: number;
};

export type PaysRow = LigneAdmin & {
    code: string;
    name: string;
    navires_count: number;
    ports_count: number;
};

export type PortRow = LigneAdmin & {
    code: string;
    name: string;
    pays_id: number | null;
    pays_name: string | null;
    prefixe_numerotation: string | null;
};

export type ArmementRow = LigneAdmin & {
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

export type NavireRow = LigneAdmin & {
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
