import { Link } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';
import { card } from './ui';

/*
 * Socle des écrans « fiche » du panneau d'administration.
 *
 * Une fiche existe pour ce qui ne tient pas dans une ligne de tableau : les
 * relations multiples (armements représentés, ports de rattachement, comptes
 * agents) que la liste ne peut que résumer. La liste dit *combien*, la fiche dit
 * *lesquels*.
 *
 * Rien ici ne connaît le métier : l'icône, les libellés et les blocs sont passés
 * par l'écran appelant. Les composants sont donc communs à la fiche d'une
 * société cliente comme à celle d'un armement.
 */

/** Largeur de lecture d'une fiche — au-delà, l'œil perd la ligne. */
export const LARGEUR_FICHE = 1120;

// ── Retour à la liste ─────────────────────────────────────────────
/**
 * Une fiche s'ouvre depuis une liste : elle doit toujours dire laquelle, et y
 * ramener. Un `Link` et non un `history.back()` — on peut arriver ici par une
 * URL partagée, sans historique derrière soi.
 */
export function RetourListe({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            className="ea-btn-cancel"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 30,
                padding: '0 10px 0 6px',
                border: '1px solid #D8DEE9',
                borderRadius: 6,
                background: '#fff',
                color: '#3A4356',
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: 14,
            }}
        >
            <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M9.5 3.5L5 8l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {children}
        </Link>
    );
}

// ── En-tête d'identité ────────────────────────────────────────────
/**
 * Qui est cette entité, en un coup d'œil : icône, dénomination, métadonnées
 * d'identification et statut. `children` accueille ce qui appartient encore à
 * l'identité sans être une section du dossier — le titulaire d'une société, par
 * exemple.
 */
export function FicheEntete({
    icone,
    titre,
    metas,
    aside,
    children,
}: {
    icone: ReactNode;
    titre: string;
    /** Les entrées nulles ou vides sont écartées : pas de séparateur orphelin. */
    metas: (string | null | undefined)[];
    aside?: ReactNode;
    children?: ReactNode;
}) {
    const visibles = metas.filter(
        (m): m is string => typeof m === 'string' && m.trim() !== '',
    );

    return (
        <div style={{ ...card, padding: '18px 20px', marginBottom: 16 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            background: '#EEF3FF',
                            border: '1px solid #C3D0F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 'none',
                        }}
                    >
                        {icone}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 19,
                                fontWeight: 800,
                                color: '#142C73',
                                letterSpacing: '-.01em',
                            }}
                        >
                            {titre}
                        </h2>
                        {visibles.length > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    flexWrap: 'wrap',
                                    fontSize: 12,
                                    color: '#5A6478',
                                }}
                            >
                                {visibles.map((meta, i) => (
                                    <span
                                        key={meta}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 10,
                                        }}
                                    >
                                        {i > 0 && (
                                            <span style={{ color: '#D8DEE9' }}>
                                                ·
                                            </span>
                                        )}
                                        <span
                                            style={{
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {meta}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {aside}
            </div>
            {children}
        </div>
    );
}

// ── Bloc de dossier ───────────────────────────────────────────────
/**
 * Une section de la fiche : un titre, le décompte de ce qu'elle contient, une
 * action facultative, et une note de pied qui explique la règle métier là où on
 * la constate.
 */
export function BlocFiche({
    titre,
    compte,
    badge,
    action,
    note,
    plat,
    children,
}: {
    titre: string;
    compte?: string;
    badge?: ReactNode;
    action?: ReactNode;
    note?: ReactNode;
    /** Faux par défaut : le contenu est mis en gouttière. Vrai pour un tableau, qui va bord à bord. */
    plat?: boolean;
    children: ReactNode;
}) {
    return (
        <div style={{ ...card, marginBottom: 16 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '13px 18px',
                    borderBottom: '1px solid #E7EBF2',
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1A1F2E',
                    }}
                >
                    {titre}
                </h3>
                {compte && (
                    <span
                        style={{
                            fontSize: 11.5,
                            color: '#8A93A6',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {compte}
                    </span>
                )}
                {badge}
                <div style={{ flex: 1 }} />
                {action}
            </div>
            {plat ? (
                children
            ) : (
                <div
                    style={{
                        padding: '14px 18px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                    }}
                >
                    {children}
                </div>
            )}
            {note && (
                <div
                    style={{
                        padding: '0 18px 14px',
                        fontSize: 11.5,
                        color: '#8A93A6',
                        lineHeight: 1.45,
                    }}
                >
                    {note}
                </div>
            )}
        </div>
    );
}

/**
 * En-tête d'un tableau imbriqué dans une fiche : gris et non navy. Le navy
 * marque le tableau *principal* d'un écran ; à l'intérieur d'une carte, il
 * entrerait en concurrence avec le titre du bloc.
 */
export function ThFiche({
    children,
    w,
    right,
}: {
    children?: ReactNode;
    w?: number;
    right?: boolean;
}) {
    return (
        <th
            style={{
                background: '#F0F3F9',
                color: '#3A4356',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                textAlign: right ? 'right' : 'left',
                padding: '8px 18px',
                borderBottom: '1px solid #D8DEE9',
                width: w,
            }}
        >
            {children}
        </th>
    );
}

// ── Carte de rattachement ─────────────────────────────────────────
/**
 * Un élément d'une relation multiple. Une carte plutôt qu'une pastille : à
 * quarante armements, la pastille ne dit plus rien qu'un nom tronqué, alors que
 * la carte garde le pays, le sigle et l'indication de partage lisibles.
 */
export function CarteRattachement({
    pastille,
    titre,
    soustitre,
    badge,
}: {
    pastille: ReactNode;
    titre: string;
    soustitre?: string | null;
    badge?: ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                border: '1px solid #D8DEE9',
                borderRadius: 8,
                background: '#FBFCFE',
                minWidth: 230,
            }}
        >
            {pastille}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    minWidth: 0,
                }}
            >
                <span
                    style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#1A1F2E',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {titre}
                </span>
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 11,
                        color: '#8A93A6',
                    }}
                >
                    {soustitre}
                    {badge}
                </span>
            </div>
        </div>
    );
}

/** Pastille carrée d'une carte : un sigle, un code, à défaut une icône. */
export const pastilleStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 7,
    background: '#EEF3FF',
    border: '1px solid #C3D0F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 800,
    color: '#1D3E9C',
    flex: 'none',
};

/** État vide d'un bloc — on dit ce qui manque, pas seulement qu'il n'y a rien. */
export function BlocVide({ children }: { children: ReactNode }) {
    return (
        <div style={{ padding: '4px 0', fontSize: 12.5, color: '#8A93A6' }}>
            {children}
        </div>
    );
}
