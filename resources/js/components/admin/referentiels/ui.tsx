import type { CSSProperties, ReactNode } from 'react';
import type { ModeExploitation } from './types';

/*
 * Vocabulaire visuel partagé par les cinq onglets Référentiels.
 *
 * Le module reste en styles inline (ADR-0017 : rendu natif, pas de librairie de
 * tableau) ; ce fichier existe pour que ce vocabulaire soit défini UNE fois —
 * sans lui, chaque onglet redéclarerait les mêmes objets de style et les mêmes
 * badges, et ils divergeraient au premier ajustement.
 */

// ── Jetons de style ───────────────────────────────────────────────
export const card: CSSProperties = {
    background: '#fff',
    border: '1px solid #D8DEE9',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(20,44,115,.06)',
    overflow: 'hidden',
};

export const searchInput: CSSProperties = {
    width: 280,
    height: 34,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 12px 0 32px',
    fontSize: 13,
    color: '#1A1F2E',
    background: '#fff',
    outlineColor: '#1D3E9C',
};

export const iconBtn: CSSProperties = {
    width: 30,
    height: 30,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background: '#fff',
    color: '#1D3E9C',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};

export const fieldLabel: CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#3A4356' };

export const fieldInput: CSSProperties = {
    height: 36,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 13,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
};

const selectChevron =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") no-repeat right 10px center";

export const fieldSelect: CSSProperties = {
    ...fieldInput,
    background: `#fff ${selectChevron}`,
    appearance: 'none',
    WebkitAppearance: 'none',
    padding: '0 30px 0 10px',
};

// ── Icônes ────────────────────────────────────────────────────────
export const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="6" cy="6" r="4.6" stroke="#8A93A6" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
);

export const PowerIcon = () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M8 2.2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const ShipIcon = () => (
    <svg width="20" height="15" viewBox="0 0 30 22" fill="none" style={{ flex: 'none' }}>
        <path d="M3 11h24l-3.4 6H6.4L3 11z" fill="#1D3E9C" />
        <rect x="12.2" y="4" width="4.6" height="6" fill="#7EC8F0" />
        <path d="M1 20c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2" stroke="#7EC8F0" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
);

export const PortIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: 'none' }}>
        <path d="M8 1.5c-2.4 0-4.3 1.9-4.3 4.2C3.7 9 8 14.3 8 14.3s4.3-5.3 4.3-8.6C12.3 3.4 10.4 1.5 8 1.5z" stroke="#1D3E9C" strokeWidth="1.3" />
        <circle cx="8" cy="5.7" r="1.7" stroke="#1D3E9C" strokeWidth="1.3" />
    </svg>
);

// ── Cellules de tableau ───────────────────────────────────────────
/** En-tête navy. `w` fige la largeur, `first` aligne sur la gouttière du corps. */
export function Th({ children, w, center, accent, first }: { children?: ReactNode; w?: number; center?: boolean; accent?: boolean; first?: boolean }) {
    return (
        <th
            style={{
                background: '#1D3E9C',
                color: '#fff',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                textAlign: center ? 'center' : 'left',
                padding: first ? '9px 16px' : '9px 12px',
                borderBottom: '2px solid #142C73',
                borderLeft: accent ? '3px solid #7EC8F0' : undefined,
                width: w,
            }}
        >
            {children}
        </th>
    );
}

/** Cellule de corps. Les variantes passent par `style` plutôt que par des props. */
export function Td({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
    return (
        <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', verticalAlign: 'middle', ...style }}>
            {children}
        </td>
    );
}

/** Première cellule d'une ligne : gouttière plus large, libellé en gras. */
export function TdTitre({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
    return (
        <Td style={{ padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon}
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{children}</span>
            </div>
        </Td>
    );
}

// ── Badges ────────────────────────────────────────────────────────
/** Code court mis en valeur (code ISO, UN/LOCODE, sigle…). */
export function CodeChip({ children }: { children: ReactNode }) {
    return (
        <span style={{ fontSize: 12, fontWeight: 800, color: '#1D3E9C', background: '#EEF3FF', border: '1px solid #C3D0F0', borderRadius: 5, padding: '2px 9px', fontVariantNumeric: 'tabular-nums' }}>
            {children}
        </span>
    );
}

export function StatutBadge({ actif }: { actif: boolean }) {
    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px',
                color: actif ? '#0A7D46' : '#8A93A6',
                background: actif ? '#E4F6EC' : '#F0F2F7',
                border: `1px solid ${actif ? '#BCE6CD' : '#D8DEE9'}`,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: actif ? '#009E60' : '#A6AFC0', flex: 'none' }} />
            {actif ? 'Actif' : 'Inactif'}
        </span>
    );
}

export const MODE_LABEL: Record<ModeExploitation, string> = {
    ligne_reguliere: 'Ligne régulière',
    tramping: 'Tramping',
};

/** Mode d'exploitation par défaut du navire — lu par le moteur de calcul. */
export function ModeBadge({ mode }: { mode: ModeExploitation | null }) {
    if (!mode) {
        return <span style={{ color: '#8A93A6' }}>—</span>;
    }

    const reg = mode === 'ligne_reguliere';

    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px',
                color: reg ? '#14509C' : '#B26200',
                background: reg ? '#E4F0FF' : '#FDF1E3',
                border: `1px solid ${reg ? '#B9D3F5' : '#F0CFA0'}`,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: reg ? '#1D3E9C' : '#E07B00', flex: 'none' }} />
            {MODE_LABEL[mode]}
        </span>
    );
}

// ── Actions de ligne ──────────────────────────────────────────────
/**
 * Modifier + basculer l'activation. Strictement identiques sur les cinq
 * référentiels : aucune ligne n'est supprimable (ADR-0012).
 */
export function RowActions({ actif, onEdit, onToggle }: { actif: boolean; onEdit: () => void; onToggle: () => void }) {
    return (
        <Td>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <button type="button" onClick={onEdit} title="Modifier" className="ea-icon-btn" style={iconBtn}>
                    <EditIcon />
                </button>
                <button
                    type="button"
                    onClick={onToggle}
                    title={actif ? 'Désactiver' : 'Réactiver'}
                    className="ea-icon-btn"
                    style={{ ...iconBtn, color: actif ? '#C0392B' : '#0A7D46' }}
                >
                    <PowerIcon />
                </button>
            </div>
        </Td>
    );
}

/** Valeur absente — un tiret gris plutôt qu'une cellule vide. */
export function Vide() {
    return <span style={{ color: '#8A93A6' }}>—</span>;
}
