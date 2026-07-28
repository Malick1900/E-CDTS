import type { ReactNode } from 'react';
import Pagination from '@/components/admin/pagination';
import { card, SearchIcon, searchInput } from './ui';

/*
 * Coquille commune aux cinq onglets : barre de recherche + compteur, tableau,
 * état vide, pagination. C'est elle qui garantit que les cinq référentiels se
 * ressemblent — un onglet ne décrit plus que ses colonnes.
 *
 * Elle ne connaît pas la forme des lignes : l'onglet fournit son `<tr>`
 * d'en-tête et ses `<tr>` de corps, et garde donc la main sur le rendu de
 * chaque cellule (badges, puces, icônes) sans passer par une description
 * abstraite de colonnes.
 */

type Props = {
    recherche: string;
    onRecherche: (valeur: string) => void;
    placeholder: string;
    /** Total APRÈS filtrage — c'est lui qu'on annonce et qu'on pagine. */
    total: number;
    /** Singulier puis pluriel, ex. `['navire', 'navires']`. */
    unite: [string, string];
    /** Mention discrète à droite de la barre d'outils. */
    apercu?: ReactNode;
    /** Note explicative sous la carte (règles métier du référentiel). */
    note?: ReactNode;
    /** Largeur minimale du tableau avant défilement horizontal. */
    largeurMin?: number;
    vide: string;
    page: number;
    parPage: number;
    onPage: (page: number) => void;
    entete: ReactNode;
    children: ReactNode;
};

export default function ReferentielCard({
    recherche,
    onRecherche,
    placeholder,
    total,
    unite,
    apercu,
    note,
    largeurMin = 720,
    vide,
    page,
    parPage,
    onPage,
    entete,
    children,
}: Props) {
    return (
        <div style={{ padding: '18px 26px 26px' }}>
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 'none' }}>
                        <SearchIcon />
                        <input type="search" value={recherche} onChange={(e) => onRecherche(e.target.value)} placeholder={placeholder} aria-label={placeholder} style={searchInput} />
                    </div>
                    <div style={{ flex: 1 }} />
                    {apercu}
                    <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>
                        {total} {total > 1 ? unite[1] : unite[0]}
                    </span>
                </div>

                {total > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: largeurMin, borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>{entete}</thead>
                            <tbody>{children}</tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '44px 20px', textAlign: 'center', color: '#8A93A6', fontSize: 13 }}>{vide}</div>
                )}

                <Pagination total={total} page={page} parPage={parPage} onPage={onPage} />
            </div>

            {note && <p style={{ margin: '12px 2px 0', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.5, maxWidth: 900 }}>{note}</p>}
        </div>
    );
}
