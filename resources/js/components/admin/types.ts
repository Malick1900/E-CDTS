/*
 * Formes de données communes aux écrans d'administration.
 *
 * Ce fichier ne connaît aucun métier : il ne décrit que ce que tout écran de
 * gestion partage. Les formes propres à un module vivent dans son dossier
 * (`referentiels/types.ts`, `users/types.ts`…).
 */

/** Une ligne administrable se désactive, jamais ne se supprime (ADR-0012). */
export type LigneAdmin = { id: number; actif: boolean };

/** Entrée d'une liste déroulante rattachant une ligne à une autre entité. */
export type Option = { value: number; label: string };

/** Nombre de lignes par page — identique sur tous les tableaux d'admin. */
export const PAR_PAGE = 25;
