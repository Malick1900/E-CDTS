/*
 * Données factices et helpers de présentation partagés par les onglets
 * « Consignataires » et « Agents consignataires » du module Utilisateurs.
 * Écrans front-only : ces données ne sont PAS câblées au back (phase ultérieure).
 */
import type { CSSProperties } from 'react';

export type AgentStatut = 'actif' | 'en_attente' | 'desactive' | 'refuse';
export type ConsignStatut = 'actif' | 'desactive';

/** Compagnie maritime représentée par un consignataire. */
export type Armement = {
    id: string;
    /** Code court affiché dans les pastilles / vignettes. */
    code: string;
    name: string;
    pays: string;
    /** Part indicative du trafic conteneurisé (en %). */
    share: number;
};

export type Consignataire = {
    id: string;
    name: string;
    ville: string;
    rccm: string;
    email: string;
    statut: ConsignStatut;
    /** Armements représentés (relation N-N). */
    armementIds: string[];
};

export type Agent = {
    id: string;
    name: string;
    email: string;
    consignataireId: string;
    /** Armements sur lesquels l'agent est habilité à opérer. */
    armementIds: string[];
    statut: AgentStatut;
};

// DONNÉES FACTICES — à câbler (phase ultérieure)
export const ARMEMENTS: Armement[] = [
    { id: 'cma', code: 'CMA', name: 'CMA CGM', pays: 'France', share: 34 },
    { id: 'msk', code: 'MSK', name: 'Maersk Line', pays: 'Danemark', share: 27 },
    { id: 'msc', code: 'MSC', name: 'MSC', pays: 'Suisse', share: 21 },
    { id: 'pil', code: 'PIL', name: 'Pacific International Lines', pays: 'Singapour', share: 9 },
    { id: 'gri', code: 'GRI', name: 'Grimaldi', pays: 'Italie', share: 6 },
    { id: 'cos', code: 'COS', name: 'COSCO', pays: 'Chine', share: 3 },
];

// DONNÉES FACTICES — à câbler (phase ultérieure)
export const CONSIGNATAIRES: Consignataire[] = [
    { id: 'c1', name: 'SDV Gabon', ville: 'Libreville', rccm: 'RCCM LBV 2016 B 04821', email: 'contact@sdv-gabon.ga', statut: 'actif', armementIds: ['cma', 'msc', 'pil'] },
    { id: 'c2', name: 'Necotrans Gabon', ville: 'Port-Gentil', rccm: 'RCCM POG 2015 B 01937', email: 'ops@necotrans-gabon.ga', statut: 'actif', armementIds: ['msk', 'gri'] },
    { id: 'c3', name: 'OMA Gabon', ville: 'Owendo', rccm: 'RCCM LBV 2018 B 07204', email: 'agence@oma-gabon.ga', statut: 'actif', armementIds: ['msc', 'cos'] },
    { id: 'c4', name: 'SAGA Gabon', ville: 'Libreville', rccm: 'RCCM LBV 2014 B 00612', email: 'consignation@saga-gabon.ga', statut: 'actif', armementIds: ['cma', 'gri', 'msk'] },
    { id: 'c5', name: 'Bolloré Transport Gabon', ville: 'Owendo', rccm: 'RCCM LBV 2013 B 00287', email: 'escale@bollore-gabon.ga', statut: 'actif', armementIds: ['pil', 'cos'] },
    { id: 'c6', name: 'Getma Gabon', ville: 'Port-Gentil', rccm: 'RCCM POG 2017 B 03158', email: 'contact@getma-gabon.ga', statut: 'desactive', armementIds: ['msc', 'cma'] },
    { id: 'c7', name: 'SOAEM', ville: 'Libreville', rccm: 'RCCM LBV 2019 B 09540', email: 'accueil@soaem.ga', statut: 'actif', armementIds: ['gri'] },
];

// DONNÉES FACTICES — à câbler (phase ultérieure)
export const AGENTS: Agent[] = [
    { id: 'a1', name: 'Paul Ndong', email: 'p.ndong@sdv-gabon.ga', consignataireId: 'c1', armementIds: ['cma', 'msc'], statut: 'actif' },
    { id: 'a2', name: 'Sylvie Ombila', email: 's.ombila@sdv-gabon.ga', consignataireId: 'c1', armementIds: ['pil'], statut: 'actif' },
    { id: 'a3', name: 'Léon Mbadinga', email: 'l.mbadinga@sdv-gabon.ga', consignataireId: 'c1', armementIds: [], statut: 'en_attente' },
    { id: 'a4', name: 'Aline Koumba', email: 'a.koumba@necotrans-gabon.ga', consignataireId: 'c2', armementIds: ['msk'], statut: 'actif' },
    { id: 'a5', name: 'Georges Ivanga', email: 'g.ivanga@necotrans-gabon.ga', consignataireId: 'c2', armementIds: ['gri'], statut: 'desactive' },
    { id: 'a6', name: 'Rachel Nzé', email: 'r.nze@oma-gabon.ga', consignataireId: 'c3', armementIds: ['msc', 'cos'], statut: 'actif' },
    { id: 'a7', name: 'Franck Boussougou', email: 'f.boussougou@oma-gabon.ga', consignataireId: 'c3', armementIds: [], statut: 'refuse' },
    { id: 'a8', name: 'Nadia Bongo', email: 'n.bongo@saga-gabon.ga', consignataireId: 'c4', armementIds: ['cma'], statut: 'actif' },
    { id: 'a9', name: 'Éric Moussavou', email: 'e.moussavou@saga-gabon.ga', consignataireId: 'c4', armementIds: [], statut: 'en_attente' },
    { id: 'a10', name: 'Prisca Ndoumba', email: 'p.ndoumba@bollore-gabon.ga', consignataireId: 'c5', armementIds: ['pil', 'cos'], statut: 'actif' },
    { id: 'a11', name: 'Hugues Ada', email: 'h.ada@getma-gabon.ga', consignataireId: 'c6', armementIds: ['msc'], statut: 'desactive' },
    { id: 'a12', name: 'Carine Loemba', email: 'c.loemba@soaem.ga', consignataireId: 'c7', armementIds: ['gri'], statut: 'actif' },
];

/** Nombre d'agents en attente de validation (dérivé, alimente le badge « à valider »). */
export const pendingAgentsCount: number = AGENTS.filter((a) => a.statut === 'en_attente').length;

/** Métadonnées de présentation des pastilles de statut. */
export const STATUT_META: Record<AgentStatut, { label: string; pill: CSSProperties; dot: CSSProperties }> = {
    actif: {
        label: 'Actif',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#1E7A34', background: '#E6F4EA', border: '1px solid #B8E0C2', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#2F9E2F', flex: 'none' },
    },
    en_attente: {
        label: 'En attente',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#E07B00', flex: 'none' },
    },
    desactive: {
        label: 'Désactivé',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#5A6478', background: '#EEF1F7', border: '1px solid #D8DEE9', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#8A93A6', flex: 'none' },
    },
    refuse: {
        label: 'Refusé',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#C0392B', background: '#FBEAE7', border: '1px solid #E0B4AD', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#C0392B', flex: 'none' },
    },
};

/** Initiales pour l'avatar d'un nom complet. */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '??';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Style de l'avatar d'un agent selon son statut. */
export function avatarStyle(statut: AgentStatut): CSSProperties {
    const background = statut === 'en_attente' ? '#E07B00' : statut === 'actif' ? '#1D3E9C' : '#8A93A6';

    return {
        width: 34,
        height: 34,
        borderRadius: '50%',
        background,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flex: 'none',
    };
}

/** Résout des armements par identifiant, dans l'ordre du référentiel. */
export function armementsByIds(ids: readonly string[]): Armement[] {
    return ARMEMENTS.filter((a) => ids.includes(a.id));
}
