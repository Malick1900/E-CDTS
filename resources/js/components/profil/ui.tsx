import type { CSSProperties, ReactNode } from 'react';

/*
 * Les quelques pièces communes aux trois cartes du profil.
 */

/**
 * Le rôle tel qu'il est stocké — « Consignataire titulaire », « Superviseur »…
 * La couleur ne distingue pas les rôles entre eux mais les deux populations :
 * bleu pour un compte client, vert pour un interne CGC. C'est la seule chose
 * que la teinte a le droit de dire ; le reste est écrit.
 */
export function RoleBadge({
    role,
    client,
}: {
    role: string | null;
    client: boolean;
}) {
    const teinte = client
        ? { color: '#14509C', background: '#E4F3FC', border: '#B5DFF7' }
        : { color: '#21771F', background: '#E7F5E7', border: '#BFE4BF' };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 'fit-content',
                fontSize: 11.5,
                fontWeight: 800,
                color: teinte.color,
                background: teinte.background,
                border: `1px solid ${teinte.border}`,
                borderRadius: 5,
                padding: '3px 10px',
                whiteSpace: 'nowrap',
            }}
        >
            {role ?? 'Rôle non attribué'}
        </span>
    );
}

/** Le cadenas qui accompagne une mention que le compte ne peut pas écrire. */
export function Verrou({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: '#8A93A6',
            }}
        >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect
                    x="3.5"
                    y="7"
                    width="9"
                    height="6.5"
                    rx="1.4"
                    stroke="#A6AFC0"
                    strokeWidth="1.3"
                />
                <path
                    d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
                    stroke="#A6AFC0"
                    strokeWidth="1.3"
                />
            </svg>
            {children}
        </span>
    );
}

export function Carte({
    icone,
    titre,
    aside,
    children,
    pied,
}: {
    icone: ReactNode;
    titre: string;
    /** Coin droit de l'en-tête : un bouton, une date. */
    aside?: ReactNode;
    children: ReactNode;
    /** Barre d'actions, rendue seulement quand l'édition est ouverte. */
    pied?: ReactNode;
}) {
    return (
        <section
            style={{
                background: '#fff',
                border: '1px solid #D8DEE9',
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                overflow: 'hidden',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 18px',
                    borderBottom: '1px solid #E7EBF2',
                    background: '#FBFCFE',
                }}
            >
                <div
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: '#EAF1FC',
                        border: '1px solid #CFE0F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 'none',
                    }}
                >
                    {icone}
                </div>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: '#142C73',
                        flex: 1,
                    }}
                >
                    {titre}
                </h2>
                {aside}
            </header>

            {children}

            {pied ? (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '13px 18px',
                        borderTop: '1px solid #EEF1F7',
                        background: '#FBFCFE',
                    }}
                >
                    {pied}
                </div>
            ) : null}
        </section>
    );
}

export const boutonSecondaire: CSSProperties = {
    height: 38,
    padding: '0 15px',
    border: '1px solid #D8DEE9',
    borderRadius: 8,
    background: '#fff',
    color: '#3A4356',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
};

export const boutonBordure: CSSProperties = {
    height: 34,
    padding: '0 14px',
    border: '1px solid #C3CBDA',
    borderRadius: 8,
    background: '#fff',
    color: '#1D3E9C',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
};

export function boutonPrincipal(actif: boolean): CSSProperties {
    return {
        height: 38,
        padding: '0 16px',
        border: 'none',
        borderRadius: 8,
        background: actif ? '#1D3E9C' : '#A9B6D6',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        cursor: actif ? 'pointer' : 'not-allowed',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
    };
}

export function champInput(erreur: boolean): CSSProperties {
    return {
        height: 40,
        border: `1px solid ${erreur ? '#E4B7B0' : '#D8DEE9'}`,
        borderRadius: 8,
        padding: '0 12px',
        fontSize: 14,
        color: '#1A1F2E',
        background: '#fff',
        width: '100%',
    };
}

export const CheckIcon = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path
            d="M2.5 8.5l3.5 3.5 7.5-8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const CrayonIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
            d="M11.4 2.6l2 2-8 8-2.6.6.6-2.6 8-8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
        />
    </svg>
);

/** Le bandeau rouge d'un refus du serveur, au-dessus du formulaire concerné. */
export function Alerte({ children }: { children: ReactNode }) {
    return (
        <div
            role="alert"
            style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                background: '#FBEAE7',
                border: '1px solid #F0C9C2',
                borderRadius: 9,
                padding: '11px 13px',
                marginBottom: 14,
            }}
        >
            <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                style={{ flex: 'none', marginTop: 1 }}
            >
                <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke="#C0392B"
                    strokeWidth="1.6"
                />
                <path
                    d="M10 5.8v4.6"
                    stroke="#C0392B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
                <circle cx="10" cy="13.6" r="1.05" fill="#C0392B" />
            </svg>
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: '#96271A' }}>
                {children}
            </span>
        </div>
    );
}
