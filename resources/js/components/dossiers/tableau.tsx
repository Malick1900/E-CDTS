import { Link, router } from '@inertiajs/react';
import type { CSSProperties, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import Pagination from '@/components/admin/pagination';
import type {
    DossierRow,
    EtapeRef,
    Filtres,
    PortRef,
    SensRef,
    Teinte,
} from './types';
import { formatDate, formatFCFA, teinteEtape, teinteSens } from './types';
import Vide from './vide';

/*
 * Le tableau des dossiers d'escale — le corps de l'écran d'accueil.
 *
 * Il ne fait que montrer : une ligne par dossier, l'étape où il en est, et ce
 * qu'il a coûté une fois liquidé. Aucun geste de traitement ne part d'ici.
 *
 * Recherche, filtres et pagination sont servis par le serveur : chaque
 * changement repart en requête plutôt que de trier une liste déjà chargée. Les
 * escales sont des données de flux, pas un référentiel borné — la liste
 * entière n'a pas vocation à tenir dans le navigateur.
 */

type TableauProps = {
    dossiers: DossierRow[];
    page: number;
    parPage: number;
    /** Nombre de dossiers du filtrage courant, toutes pages confondues. */
    total: number;
    /** Nombre de dossiers du périmètre, sans filtre — sépare les deux vides. */
    totalPerimetre: number;
    /** CDTS liquidée sur TOUT le filtrage courant, pas sur la seule page. */
    liquide: number;
    filtres: Filtres;
    etapes: EtapeRef[];
    sens: SensRef[];
    ports: PortRef[];
    peutOuvrir: boolean;
    /** La société du compte, ou « tous consignataires » pour un interne CGC. */
    perimetre: string;
    onFiltrer: (patch: Record<string, string | number | null>) => void;
};

/** Le temps de finir de taper avant que la requête ne parte. */
const DELAI_RECHERCHE = 350;

const BORDURE = '1px solid #E7EBF2';

/** Le n° de dossier se lit pareil, qu'il ouvre quelque chose ou non. */
const NUMERO: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#1A1F2E',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
};

const styleEnTete = (
    largeur: number,
    alignement: 'left' | 'center' | 'right' = 'left',
): CSSProperties => ({
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: '#1D3E9C',
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    textAlign: alignement,
    padding: '9px 12px',
    borderBottom: '2px solid #142C73',
    width: largeur,
});

const styleSelect: CSSProperties = {
    height: 34,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background:
        "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") no-repeat right 10px center",
    appearance: 'none',
    WebkitAppearance: 'none',
    padding: '0 30px 0 12px',
    fontSize: 13,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
};

/** La pastille d'un état — étape du circuit comme sens de trafic. */
function pastille(teinte: Teinte): CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: teinte.encre,
        background: teinte.fond,
        border: `1px solid ${teinte.bord}`,
        borderRadius: 5,
        padding: '2px 9px',
        whiteSpace: 'nowrap',
    };
}

export default function Tableau({
    dossiers,
    page,
    parPage,
    total,
    totalPerimetre,
    liquide,
    filtres,
    etapes,
    sens,
    ports,
    peutOuvrir,
    perimetre,
    onFiltrer,
}: TableauProps) {
    const [recherche, setRecherche] = useState(filtres.q);
    const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Attendre la fin de la frappe : une requête par caractère saturerait le
    // serveur pour un résultat que personne n'a le temps de lire.
    const chercher = (valeur: string) => {
        setRecherche(valeur);

        if (minuteur.current) {
            clearTimeout(minuteur.current);
        }

        minuteur.current = setTimeout(
            () => onFiltrer({ q: valeur, page: 1 }),
            DELAI_RECHERCHE,
        );
    };

    /*
     * Toute la ligne ouvre le dossier — sauf quand le clic portait déjà sur le
     * lien du numéro, qui navigue de lui-même. Ce lien n'est pas un doublon :
     * c'est lui qui rend la ligne atteignable au clavier, et qui permet de
     * l'ouvrir dans un autre onglet.
     */
    const ouvrir = (
        evenement: MouseEvent<HTMLTableRowElement>,
        lien: string,
    ) => {
        if ((evenement.target as HTMLElement).closest('a') !== null) {
            return;
        }

        router.visit(lien);
    };

    const rangs = new Map(etapes.map((e) => [e.value, e.rang]));
    const libelles = new Map(etapes.map((e) => [e.value, e.label]));
    const libellesSens = new Map(sens.map((s) => [s.value, s.label]));

    const compteur =
        total === totalPerimetre
            ? `${total} dossier${total > 1 ? 's' : ''}`
            : `${total} / ${totalPerimetre} dossiers`;

    return (
        <div
            style={{
                background: '#FFFFFF',
                border: '1px solid #D8DEE9',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ══ Barre d'outils ══ */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 18px',
                    borderBottom: BORDURE,
                    flex: 'none',
                    background: '#FBFCFE',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ position: 'relative', flex: 'none' }}>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            left: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    >
                        <circle
                            cx="6"
                            cy="6"
                            r="4.6"
                            stroke="#8A93A6"
                            strokeWidth="1.5"
                        />
                        <path
                            d="M9.5 9.5L13 13"
                            stroke="#8A93A6"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                    <input
                        type="search"
                        value={recherche}
                        onChange={(e) => chercher(e.target.value)}
                        aria-label="Rechercher un dossier"
                        placeholder="Rechercher un n° de dossier, un navire, un voyage…"
                        style={{
                            width: 310,
                            height: 34,
                            border: '1px solid #D8DEE9',
                            borderRadius: 6,
                            padding: '0 12px 0 32px',
                            fontSize: 13,
                            color: '#1A1F2E',
                            background: '#fff',
                            outlineColor: '#1D3E9C',
                        }}
                    />
                </div>

                <select
                    value={filtres.sens}
                    onChange={(e) =>
                        onFiltrer({ sens: e.target.value, page: 1 })
                    }
                    aria-label="Filtrer par sens de trafic"
                    style={styleSelect}
                >
                    <option value="all">Import &amp; Export</option>
                    {sens.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filtres.etape}
                    onChange={(e) =>
                        onFiltrer({ etape: e.target.value, page: 1 })
                    }
                    aria-label="Filtrer par étape du circuit"
                    style={styleSelect}
                >
                    <option value="all">Toutes les étapes</option>
                    <option value="en-cours">En cours</option>
                    {etapes.map((e) => (
                        <option key={e.value} value={e.value}>
                            {e.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filtres.port === null ? 'all' : String(filtres.port)}
                    onChange={(e) =>
                        onFiltrer({
                            port:
                                e.target.value === 'all'
                                    ? null
                                    : Number(e.target.value),
                            page: 1,
                        })
                    }
                    aria-label="Filtrer par port"
                    style={styleSelect}
                >
                    <option value="all">Tous les ports</option>
                    {ports.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>

                <div style={{ flex: 1 }} />
                <span
                    style={{
                        fontSize: 12,
                        color: '#8A93A6',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {compteur}
                </span>
            </div>

            {dossiers.length === 0 ? (
                <Vide filtre={totalPerimetre > 0} peutOuvrir={peutOuvrir} />
            ) : (
                <>
                    <div
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            overflow: 'auto',
                            position: 'relative',
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                minWidth: 1272,
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                                tableLayout: 'fixed',
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            ...styleEnTete(168),
                                            padding: '9px 16px',
                                        }}
                                    >
                                        N° de dossier
                                    </th>
                                    <th style={styleEnTete(210)}>
                                        Navire &amp; voyage
                                    </th>
                                    <th style={styleEnTete(92, 'center')}>
                                        Sens
                                    </th>
                                    <th style={styleEnTete(176)}>
                                        Consignataire
                                    </th>
                                    <th style={styleEnTete(158)}>
                                        Port / poste
                                    </th>
                                    <th
                                        style={{
                                            ...styleEnTete(184),
                                            color: '#EAF4FC',
                                            fontWeight: 800,
                                            borderLeft: '3px solid #7EC8F0',
                                        }}
                                    >
                                        Étape du circuit
                                    </th>
                                    <th style={styleEnTete(112)}>Ouvert le</th>
                                    <th
                                        style={{
                                            ...styleEnTete(150, 'right'),
                                            padding: '9px 16px',
                                        }}
                                    >
                                        Montant CDTS
                                    </th>
                                    {/* La colonne du chevron : sans libellé,
                                    elle n'annonce rien — c'est le curseur et le
                                    signe qui disent que la ligne s'ouvre. */}
                                    <th style={styleEnTete(52, 'center')} />
                                </tr>
                            </thead>
                            <tbody>
                                {dossiers.map((d, i) => {
                                    const etape = teinteEtape(d.etape);
                                    const rang = rangs.get(d.etape) ?? null;
                                    const lien = `/dossiers/${d.id}`;
                                    const libelleEtape =
                                        libelles.get(d.etape) ?? d.etape;

                                    return (
                                        <tr
                                            key={d.id}
                                            /* Pas de survol sur une ligne
                                            inerte : il promettrait un clic. */
                                            className={
                                                d.ouvrable
                                                    ? 'ea-row'
                                                    : undefined
                                            }
                                            title={
                                                d.ouvrable
                                                    ? `Ouvrir le dossier ${d.numero}`
                                                    : `Étape « ${libelleEtape} » — écran à venir`
                                            }
                                            onClick={
                                                d.ouvrable
                                                    ? (evenement) =>
                                                          ouvrir(
                                                              evenement,
                                                              lien,
                                                          )
                                                    : undefined
                                            }
                                            style={{
                                                background:
                                                    i % 2 === 0
                                                        ? '#FFFFFF'
                                                        : '#FAFBFD',
                                                cursor: d.ouvrable
                                                    ? 'pointer'
                                                    : 'default',
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: '9px 16px',
                                                    borderBottom: BORDURE,
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 2,
                                                    }}
                                                >
                                                    {d.ouvrable ? (
                                                        <Link
                                                            href={lien}
                                                            style={NUMERO}
                                                        >
                                                            {d.numero}
                                                        </Link>
                                                    ) : (
                                                        <span style={NUMERO}>
                                                            {d.numero}
                                                        </span>
                                                    )}
                                                    {d.provisoire ? (
                                                        <span
                                                            title="Numéro provisoire — il deviendra le n° de manifeste au rattachement"
                                                            style={{
                                                                fontSize: 9,
                                                                fontWeight: 700,
                                                                letterSpacing:
                                                                    '.04em',
                                                                color: '#8A93A6',
                                                                background:
                                                                    '#EEF1F7',
                                                                border: '1px solid #D8DEE9',
                                                                borderRadius: 4,
                                                                padding:
                                                                    '1px 6px',
                                                                textTransform:
                                                                    'uppercase',
                                                                alignSelf:
                                                                    'flex-start',
                                                            }}
                                                        >
                                                            Provisoire
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 12px',
                                                    borderBottom: BORDURE,
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 9,
                                                    }}
                                                >
                                                    <svg
                                                        width="20"
                                                        height="15"
                                                        viewBox="0 0 30 22"
                                                        fill="none"
                                                        aria-hidden="true"
                                                        style={{ flex: 'none' }}
                                                    >
                                                        <path
                                                            d="M3 11h24l-3.4 6H6.4L3 11z"
                                                            fill="#1D3E9C"
                                                        />
                                                        <rect
                                                            x="12.2"
                                                            y="4"
                                                            width="4.6"
                                                            height="6"
                                                            fill="#7EC8F0"
                                                        />
                                                        <path
                                                            d="M1 20c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2"
                                                            stroke="#7EC8F0"
                                                            strokeWidth="1.4"
                                                            strokeLinecap="round"
                                                            fill="none"
                                                        />
                                                    </svg>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection:
                                                                'column',
                                                            gap: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <span
                                                            title={d.navire}
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: 700,
                                                                color: '#1A1F2E',
                                                                whiteSpace:
                                                                    'nowrap',
                                                                overflow:
                                                                    'hidden',
                                                                textOverflow:
                                                                    'ellipsis',
                                                            }}
                                                        >
                                                            {d.navire}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 11,
                                                                color: '#5A6478',
                                                                fontVariantNumeric:
                                                                    'tabular-nums',
                                                            }}
                                                        >
                                                            Voyage {d.voyage}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 10px',
                                                    borderBottom: BORDURE,
                                                    textAlign: 'center',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <span
                                                    style={pastille(
                                                        teinteSens(d.sens),
                                                    )}
                                                >
                                                    {libellesSens.get(d.sens) ??
                                                        d.sens}
                                                </span>
                                            </td>

                                            <td
                                                title={d.consignataire}
                                                style={{
                                                    padding: '9px 12px',
                                                    borderBottom: BORDURE,
                                                    fontSize: 12.5,
                                                    color: '#3A4356',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {d.consignataire}
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 12px',
                                                    borderBottom: BORDURE,
                                                    verticalAlign: 'middle',
                                                }}
                                            >
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
                                                            fontWeight: 600,
                                                            color: '#1A1F2E',
                                                        }}
                                                    >
                                                        {d.port}
                                                    </span>
                                                    <span
                                                        title={d.poste ?? ''}
                                                        style={{
                                                            fontSize: 10.5,
                                                            color: '#8A93A6',
                                                            whiteSpace:
                                                                'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow:
                                                                'ellipsis',
                                                        }}
                                                    >
                                                        {d.poste ??
                                                            'Poste non arrêté'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 12px',
                                                    borderBottom: BORDURE,
                                                    borderLeft:
                                                        '3px solid #7EC8F0',
                                                    background: '#FBFDFF',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span
                                                        style={pastille(etape)}
                                                    >
                                                        <span
                                                            style={{
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius:
                                                                    '50%',
                                                                background:
                                                                    etape.point,
                                                                flex: 'none',
                                                            }}
                                                        />
                                                        {libelles.get(
                                                            d.etape,
                                                        ) ?? d.etape}
                                                    </span>
                                                    {rang === null ? null : (
                                                        <span
                                                            style={{
                                                                fontSize: 10.5,
                                                                color: '#98A2B4',
                                                                fontVariantNumeric:
                                                                    'tabular-nums',
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                        >
                                                            {rang}/6
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 12px',
                                                    borderBottom: BORDURE,
                                                    fontSize: 12,
                                                    color: '#3A4356',
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                    whiteSpace: 'nowrap',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {formatDate(d.ouvertLe)}
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 16px',
                                                    borderBottom: BORDURE,
                                                    textAlign: 'right',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {d.montant === null ? (
                                                    <span
                                                        title="Aucun devis émis à ce stade"
                                                        style={{
                                                            fontSize: 13,
                                                            color: '#B4BCC9',
                                                        }}
                                                    >
                                                        —
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: 12.5,
                                                            fontWeight: 700,
                                                            color: '#1A1F2E',
                                                            fontVariantNumeric:
                                                                'tabular-nums',
                                                            whiteSpace:
                                                                'nowrap',
                                                        }}
                                                    >
                                                        {formatFCFA(d.montant)}
                                                    </span>
                                                )}
                                            </td>

                                            <td
                                                style={{
                                                    padding: '9px 8px',
                                                    borderBottom: BORDURE,
                                                    textAlign: 'center',
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {d.ouvrable ? (
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            display:
                                                                'inline-flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            color: '#1D3E9C',
                                                        }}
                                                    >
                                                        <svg
                                                            width="15"
                                                            height="15"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M6 3.5L10.5 8 6 12.5"
                                                                stroke="currentColor"
                                                                strokeWidth="1.7"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </span>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* La totalisation vit hors du tableau, et non dans un
                    `tfoot` collant : ancrée au bas de la carte, elle reste à sa
                    place quel que soit le nombre de lignes affichées. */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '10px 18px',
                            background: '#142C73',
                            color: '#fff',
                            borderTop: '2px solid #1D3E9C',
                            flex: 'none',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 12.5,
                                color: '#C9D4F0',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {total} dossier{total > 1 ? 's' : ''} · {perimetre}
                        </span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: 11.5, color: '#8FA3D9' }}>
                            CDTS liquidée (dossiers facturés &amp; clôturés)
                        </span>
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: '#fff',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {formatFCFA(liquide)}
                        </span>
                    </div>

                    <Pagination
                        total={total}
                        page={page}
                        parPage={parPage}
                        onPage={(p) => onFiltrer({ page: p })}
                    />
                </>
            )}
        </div>
    );
}
