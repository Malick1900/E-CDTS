import type { ArmementBadge } from '@/components/admin/users/types';

/*
 * Formes de données de l'écran Profil — miroir de `ProfilController::fiche`.
 */

export type ProfilFiche = {
    first_name: string | null;
    last_name: string | null;
    /** Nom affiché ailleurs sur la plateforme ; recomposé à l'enregistrement. */
    name: string;
    email: string;
    phone: string | null;
    /** Fonction dans la société — renseignée par qui a ouvert le compte. */
    job_title: string | null;
    role: string | null;
    /** Compte client (consignataire) par opposition à un interne CGC. */
    client: boolean;
    organisation: string;
    cree_le: string | null;
    derniere_connexion: string | null;
    mot_de_passe_modifie_le: string | null;
    /** Portée d'un compte client (ADR-0009) ; nulle pour un interne CGC. */
    armements: ArmementBadge[] | null;
};

/**
 * Les exigences de mot de passe telles que le serveur les applique. Envoyées
 * plutôt que recopiées ici : elles se durcissent en production, et une liste
 * figée dans le composant finirait par annoncer autre chose que ce qui est
 * réellement refusé.
 */
export type CriteresMotDePasse = {
    longueur: number;
    casse: boolean;
    chiffres: boolean;
    symboles: boolean;
};
