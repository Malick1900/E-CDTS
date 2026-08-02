import type { CSSProperties, ReactNode } from 'react';

/*
 * Vocabulaire visuel partagé par les écrans d'administration.
 *
 * Le panneau reste en styles inline (ADR-0017 : rendu natif, pas de librairie
 * de tableau) ; ce fichier existe pour que ce vocabulaire soit défini UNE fois
 * — sans lui, chaque onglet redéclarerait les mêmes objets de style et les
 * mêmes badges, et ils divergeraient au premier ajustement.
 *
 * Rien ici ne connaît le métier : les icônes et badges propres à un module
 * (navire, port, mode d'exploitation…) vivent dans son dossier.
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

export const fieldLabel: CSSProperties = {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#3A4356',
};

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
    <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
        }}
    >
        <circle cx="6" cy="6" r="4.6" stroke="#8A93A6" strokeWidth="1.5" />
        <path
            d="M9.5 9.5L13 13"
            stroke="#8A93A6"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

export const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
            d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
        />
    </svg>
);

export const PowerIcon = () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path
            d="M8 2.2v5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        <path
            d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

// ── Cellules de tableau ───────────────────────────────────────────
/** En-tête navy. `w` fige la largeur, `first` aligne sur la gouttière du corps. */
export function Th({
    children,
    w,
    center,
    accent,
    first,
}: {
    children?: ReactNode;
    w?: number;
    center?: boolean;
    accent?: boolean;
    first?: boolean;
}) {
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
export function Td({
    children,
    style,
}: {
    children?: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <td
            style={{
                padding: '10px 12px',
                borderBottom: '1px solid #E7EBF2',
                fontSize: 12.5,
                color: '#3A4356',
                verticalAlign: 'middle',
                ...style,
            }}
        >
            {children}
        </td>
    );
}

/** Première cellule d'une ligne : gouttière plus large, libellé en gras. */
export function TdTitre({
    children,
    icon,
}: {
    children: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <Td style={{ padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon}
                <span
                    style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: '#1A1F2E',
                    }}
                >
                    {children}
                </span>
            </div>
        </Td>
    );
}

// ── Badges ────────────────────────────────────────────────────────
/** Code court mis en valeur (code ISO, UN/LOCODE, sigle…). */
export function CodeChip({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#1D3E9C',
                background: '#EEF3FF',
                border: '1px solid #C3D0F0',
                borderRadius: 5,
                padding: '2px 9px',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {children}
        </span>
    );
}

export function StatutBadge({ actif }: { actif: boolean }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 5,
                padding: '2px 9px',
                color: actif ? '#0A7D46' : '#8A93A6',
                background: actif ? '#E4F6EC' : '#F0F2F7',
                border: `1px solid ${actif ? '#BCE6CD' : '#D8DEE9'}`,
            }}
        >
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: actif ? '#009E60' : '#A6AFC0',
                    flex: 'none',
                }}
            />
            {actif ? 'Actif' : 'Inactif'}
        </span>
    );
}

/**
 * Signale ce qui appelle l'attention sans être une erreur : des comptes en
 * attente de décision, un armement représenté par plusieurs sociétés. Orangé,
 * là où `BandeauInfo` est bleu — ici on demande un regard, pas un cadrage.
 */
export function BadgeAlerte({
    children,
    majuscules,
}: {
    children: ReactNode;
    majuscules?: boolean;
}) {
    return (
        <span
            style={{
                fontSize: majuscules ? 9.5 : 10.5,
                fontWeight: 700,
                letterSpacing: majuscules ? '.04em' : undefined,
                textTransform: majuscules ? 'uppercase' : undefined,
                color: '#B26200',
                background: '#FDF1E3',
                border: '1px solid #F0CFA0',
                borderRadius: majuscules ? 4 : 5,
                padding: majuscules ? '1px 6px' : '2px 8px',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
}

// ── Actions de ligne ──────────────────────────────────────────────
/**
 * Modifier + basculer l'activation. Strictement identiques d'un écran à
 * l'autre : aucune ligne n'est supprimable (ADR-0012).
 */
export function RowActions({
    actif,
    onEdit,
    onToggle,
}: {
    actif: boolean;
    onEdit: () => void;
    onToggle: () => void;
}) {
    return (
        <Td>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                }}
            >
                <button
                    type="button"
                    onClick={onEdit}
                    title="Modifier"
                    className="ea-icon-btn"
                    style={iconBtn}
                >
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

// ── Bandeau d'information ─────────────────────────────────────────
/**
 * Explique une restriction là où elle se constate. Sert notamment aux onglets
 * en consultation seule : un écran amputé de ses boutons sans un mot d'explication
 * se lit comme une panne, pas comme une règle (ADR-0025).
 *
 * Volontairement bleu et non orangé : ce n'est pas une alerte, c'est un cadre.
 */
export function BandeauInfo({
    titre,
    children,
}: {
    titre: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                padding: '11px 14px',
                background: '#EEF3FF',
                border: '1px solid #C3D0F0',
                borderRadius: 8,
            }}
        >
            <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                style={{ flex: 'none', marginTop: 1, color: '#1D3E9C' }}
            >
                <circle
                    cx="10"
                    cy="10"
                    r="7.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <path
                    d="M10 9v4.4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <circle cx="10" cy="6.4" r="1" fill="currentColor" />
            </svg>
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#142C73',
                        marginBottom: 2,
                    }}
                >
                    {titre}
                </div>
                <p
                    style={{
                        margin: 0,
                        fontSize: 12,
                        color: '#3A4356',
                        lineHeight: 1.5,
                    }}
                >
                    {children}
                </p>
            </div>
        </div>
    );
}
