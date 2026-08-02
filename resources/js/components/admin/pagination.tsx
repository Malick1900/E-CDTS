import type { CSSProperties } from 'react';

/*
 * Pagination côté client : le serveur envoie la liste complète (volumes de
 * données maîtres), le tableau n'en affiche qu'une tranche. La recherche filtre
 * donc TOUT le référentiel, pas seulement la page visible — c'est l'intérêt du
 * choix client (ADR-0017 amendé).
 *
 * Composant générique au module Administration : rien ici ne connaît les
 * référentiels.
 */

type Props = {
    /** Nombre total de lignes APRÈS filtrage. */
    total: number;
    /** Page courante, 1-indexée. */
    page: number;
    parPage: number;
    onPage: (page: number) => void;
};

const btn: CSSProperties = {
    minWidth: 30,
    height: 30,
    padding: '0 8px',
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background: '#fff',
    color: '#3A4356',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
};

const btnActif: CSSProperties = {
    ...btn,
    borderColor: '#1D3E9C',
    background: '#1D3E9C',
    color: '#fff',
    fontWeight: 700,
};
const btnInactif: CSSProperties = {
    ...btn,
    color: '#C3CBDA',
    cursor: 'not-allowed',
};

/**
 * Numéros à afficher, avec ellipses : toujours la première et la dernière page,
 * plus une fenêtre de trois autour de la page courante.
 */
function numerosVisibles(
    page: number,
    dernierePage: number,
): Array<number | '…'> {
    if (dernierePage <= 7) {
        return Array.from({ length: dernierePage }, (_, i) => i + 1);
    }

    const debut = Math.max(2, Math.min(page - 1, dernierePage - 3));
    const fin = Math.min(dernierePage - 1, Math.max(page + 1, 4));

    const sortie: Array<number | '…'> = [1];

    if (debut > 2) {
        sortie.push('…');
    }

    for (let p = debut; p <= fin; p++) {
        sortie.push(p);
    }

    if (fin < dernierePage - 1) {
        sortie.push('…');
    }

    return [...sortie, dernierePage];
}

export default function Pagination({ total, page, parPage, onPage }: Props) {
    const dernierePage = Math.ceil(total / parPage);

    // Une seule page : le compteur de la barre d'outils suffit, on n'ajoute pas
    // de chrome inutile.
    if (dernierePage <= 1) {
        return null;
    }

    const premier = (page - 1) * parPage + 1;
    const dernier = Math.min(page * parPage, total);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderTop: '1px solid #E7EBF2',
                background: '#FBFCFE',
                flexWrap: 'wrap',
            }}
        >
            <span
                style={{
                    fontSize: 12,
                    color: '#5A6478',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {premier}–{dernier} sur {total}
            </span>
            <div style={{ flex: 1 }} />
            <nav
                aria-label="Pagination"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
                <button
                    type="button"
                    onClick={() => onPage(page - 1)}
                    disabled={page === 1}
                    title="Page précédente"
                    aria-label="Page précédente"
                    className={page === 1 ? undefined : 'ea-icon-btn'}
                    style={page === 1 ? btnInactif : btn}
                >
                    ‹
                </button>
                {numerosVisibles(page, dernierePage).map((n, i) =>
                    n === '…' ? (
                        <span
                            key={`ellipse-${i}`}
                            style={{
                                fontSize: 12.5,
                                color: '#8A93A6',
                                padding: '0 2px',
                            }}
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onPage(n)}
                            aria-label={`Page ${n}`}
                            aria-current={n === page ? 'page' : undefined}
                            className={n === page ? undefined : 'ea-icon-btn'}
                            style={n === page ? btnActif : btn}
                        >
                            {n}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    onClick={() => onPage(page + 1)}
                    disabled={page === dernierePage}
                    title="Page suivante"
                    aria-label="Page suivante"
                    className={
                        page === dernierePage ? undefined : 'ea-icon-btn'
                    }
                    style={page === dernierePage ? btnInactif : btn}
                >
                    ›
                </button>
            </nav>
        </div>
    );
}
