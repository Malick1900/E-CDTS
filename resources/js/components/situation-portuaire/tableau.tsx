import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Pagination from '@/components/admin/pagination';
import Frise from './frise';
import type {
    Droits,
    EditionDraft,
    MouvementRow,
    PortRef,
    PosteRef,
    SensRef,
    StatutRef,
} from './types';
import { formatDateHeure } from './types';

/*
 * Le tableau des mouvements — le cœur de l'écran.
 *
 * Deux lectures s'y superposent : le document de la conférence portuaire
 * (quel navire, quel poste, quelles dates) et l'état du verrou de transmission
 * de chaque escale, que porte la colonne « Statut — frise d'escale ».
 *
 * L'édition se fait en ligne, sur les cinq champs qui bougent au fil d'une
 * escale : sens, statut, poste et les deux dates. Le navire et le voyage n'y
 * sont pas — les changer décrirait une autre escale.
 */

type TableauProps = {
    mouvements: MouvementRow[];
    statuts: StatutRef[];
    sens: SensRef[];
    postes: PosteRef[];
    droits: Droits;
    port: PortRef;
    onAjouter: () => void;
};

const CELLULE = '8px 12px';
const BORDURE = '1px solid #E7EBF2';

/**
 * Dix lignes à l'écran, le reste paginé. Volontairement plus court que les
 * 25 des tableaux d'administration : une ligne de situation portuaire est
 * haute — elle porte une frise de six jalons — et la conférence se lit d'un
 * coup d'œil, sans faire défiler.
 */
const PAR_PAGE = 10;

const styleEnTete = (largeur: number, alignement: 'left' | 'center' = 'left') =>
    ({
        position: 'sticky' as const,
        top: 0,
        zIndex: 2,
        background: '#1D3E9C',
        color: '#FFFFFF',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '.05em',
        textTransform: 'uppercase' as const,
        textAlign: alignement,
        padding: '9px 12px',
        borderBottom: '2px solid #142C73',
        width: largeur,
    }) as const;

const styleChamp = {
    width: '100%',
    height: 30,
    border: '1px solid #C3CBDA',
    borderRadius: 5,
    background: '#fff',
    fontSize: 12,
    color: '#1A1F2E',
    padding: '0 6px',
} as const;

const styleSelect = {
    ...styleChamp,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
};

export default function Tableau({
    mouvements,
    statuts,
    sens,
    postes,
    droits,
    port,
    onAjouter,
}: TableauProps) {
    const [recherche, setRecherche] = useState('');
    const [filtreStatut, setFiltreStatut] = useState('all');
    const [filtreSens, setFiltreSens] = useState('all');
    const [edite, setEdite] = useState<number | null>(null);
    const [brouillon, setBrouillon] = useState<EditionDraft | null>(null);
    const [enCours, setEnCours] = useState(false);
    const [page, setPage] = useState(1);

    const rang = useMemo(
        () => (valeur: string) => statuts.findIndex((s) => s.value === valeur),
        [statuts],
    );

    const filtres = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return mouvements.filter((m) => {
            if (
                q &&
                !m.navire.toLowerCase().includes(q) &&
                !m.voyage.toLowerCase().includes(q)
            ) {
                return false;
            }

            if (filtreStatut !== 'all' && m.statut !== filtreStatut) {
                return false;
            }

            return filtreSens === 'all' || m.sens === filtreSens;
        });
    }, [mouvements, recherche, filtreStatut, filtreSens]);

    // Filtrer réduit le nombre de pages : rester sur la page 5 d'une liste qui
    // n'en compte plus qu'une afficherait un tableau vide sans rien expliquer.
    const dernierePage = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
    const pageCourante = Math.min(page, dernierePage);
    const visibles = useMemo(
        () =>
            filtres.slice(
                (pageCourante - 1) * PAR_PAGE,
                pageCourante * PAR_PAGE,
            ),
        [filtres, pageCourante],
    );

    const ouvrirEdition = (m: MouvementRow) => {
        setEdite(m.id);
        setBrouillon({
            sens: m.sens,
            statut: m.statut,
            poste_quai_id: m.posteQuaiId === null ? '' : String(m.posteQuaiId),
            eta: m.eta ?? '',
            etd: m.etd ?? '',
        });
    };

    const enregistrer = (m: MouvementRow) => {
        if (!brouillon) {
            return;
        }

        setEnCours(true);
        router.patch(
            `/situation-portuaire/${m.id}`,
            {
                sens: brouillon.sens,
                statut: brouillon.statut,
                poste_quai_id: brouillon.poste_quai_id || null,
                eta: brouillon.eta || null,
                etd: brouillon.etd || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEdite(null);
                    setBrouillon(null);
                },
                onFinish: () => setEnCours(false),
            },
        );
    };

    // Onze colonnes fixes, plus celle des actions quand l'agent peut éditer.
    const colonnes = droits.renseigner ? 12 : 11;
    const vide = filtres.length === 0;

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
                    borderBottom: '1px solid #E7EBF2',
                    flex: 'none',
                    background: '#FBFCFE',
                }}
            >
                <div style={{ position: 'relative', flex: 'none' }}>
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
                        type="text"
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Rechercher un navire, un n° de voyage…"
                        aria-label="Rechercher un navire ou un numéro de voyage"
                        style={{
                            width: 280,
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
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value)}
                    aria-label="Filtrer par statut"
                    style={styleFiltre}
                >
                    <option value="all">Tous les statuts</option>
                    {statuts.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <select
                    value={filtreSens}
                    onChange={(e) => setFiltreSens(e.target.value)}
                    aria-label="Filtrer par sens"
                    style={styleFiltre}
                >
                    <option value="all">Import &amp; Export</option>
                    {sens.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>

                <div style={{ flex: 1 }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 11.5,
                        color: '#5A6478',
                    }}
                >
                    <span
                        style={{
                            width: 11,
                            height: 11,
                            borderRadius: '50%',
                            background: '#2F9E2F',
                            flex: 'none',
                            boxShadow: '0 0 0 3px rgba(47,158,47,.16)',
                        }}
                    />
                    Jalon qui déverrouille la transmission
                </div>
                <span
                    style={{
                        fontSize: 12,
                        color: '#8A93A6',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {filtres.length === mouvements.length
                        ? `${mouvements.length} navire${mouvements.length > 1 ? 's' : ''}`
                        : `${filtres.length} / ${mouvements.length} navires`}
                </span>
            </div>

            {/* ══ Tableau ══ */}
            {vide ? (
                <EtatVide
                    aucuneLigne={mouvements.length === 0}
                    port={port.label}
                    peutAjouter={droits.renseigner}
                    onAjouter={onAjouter}
                />
            ) : (
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
                            minWidth: 1620,
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            tableLayout: 'fixed',
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={styleEnTete(172)}>Navire</th>
                                <th style={styleEnTete(60, 'center')}>Type</th>
                                <th style={styleEnTete(92, 'center')}>Sens</th>
                                <th
                                    style={{
                                        ...styleEnTete(320),
                                        color: '#EAF4FC',
                                        fontWeight: 800,
                                        borderLeft: '3px solid #7EC8F0',
                                    }}
                                >
                                    Statut — frise d'escale
                                </th>
                                <th style={styleEnTete(118)}>Poste à quai</th>
                                <th style={styleEnTete(126)}>ETA</th>
                                <th style={styleEnTete(126)}>ETD</th>
                                <th style={styleEnTete(94)}>N° voyage</th>
                                <th style={styleEnTete(158)}>Consignataire</th>
                                <th style={styleEnTete(100)}>Pavillon</th>
                                <th style={styleEnTete(150)}>Armateur</th>
                                {droits.renseigner ? (
                                    <th style={styleEnTete(96, 'center')}>
                                        Actions
                                    </th>
                                ) : null}
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((m, i) => {
                                const enEdition =
                                    droits.renseigner && edite === m.id;
                                const jalon =
                                    sens.find((s) => s.value === m.sens)
                                        ?.jalon ?? '';
                                const sensLabel =
                                    sens.find((s) => s.value === m.sens)
                                        ?.label ?? m.sens;
                                const dateDuVerrou =
                                    m.sens === 'import' ? m.eta : m.etd;
                                const jalonAtteint =
                                    rang(m.statut) >= rang(jalon);
                                const ouvert =
                                    jalonAtteint && !!dateDuVerrou && m.publiee;

                                // Le verrou d'ADR-0009 tient à trois choses : le
                                // jalon, sa date, et la publication. Quand il
                                // reste fermé alors que le jalon est franchi, on
                                // dit laquelle manque plutôt que de laisser
                                // chercher.
                                const raison = !jalonAtteint
                                    ? null
                                    : !dateDuVerrou
                                      ? `Verrou fermé — ${m.sens === 'import' ? 'ETA' : 'ETD'} manquante`
                                      : !m.publiee
                                        ? 'Verrou fermé — à publier'
                                        : null;

                                return (
                                    <tr
                                        key={m.id}
                                        style={{
                                            background: enEdition
                                                ? '#FFFDF3'
                                                : i % 2 === 0
                                                  ? '#FFFFFF'
                                                  : '#FAFBFD',
                                            boxShadow: enEdition
                                                ? 'inset 3px 0 0 #E07B00'
                                                : 'none',
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: CELLULE,
                                                borderBottom: BORDURE,
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <svg
                                                    width="20"
                                                    height="15"
                                                    viewBox="0 0 30 22"
                                                    fill="none"
                                                    style={{ flex: 'none' }}
                                                    aria-hidden="true"
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
                                                <span
                                                    title={m.navire}
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: '#1A1F2E',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                    }}
                                                >
                                                    {m.navire}
                                                </span>
                                            </div>
                                        </td>

                                        <td
                                            style={{
                                                padding: '8px',
                                                borderBottom: BORDURE,
                                                textAlign: 'center',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            <span
                                                title={m.typeLabel ?? undefined}
                                                style={{
                                                    display: 'inline-block',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: '#3A4356',
                                                    background: '#EEF1F7',
                                                    border: '1px solid #D8DEE9',
                                                    borderRadius: 5,
                                                    padding: '2px 7px',
                                                }}
                                            >
                                                {m.typeCode ?? '—'}
                                            </span>
                                        </td>

                                        <td
                                            style={{
                                                padding: '8px',
                                                borderBottom: BORDURE,
                                                textAlign: 'center',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {enEdition && brouillon ? (
                                                <select
                                                    value={brouillon.sens}
                                                    onChange={(e) =>
                                                        setBrouillon({
                                                            ...brouillon,
                                                            sens: e.target
                                                                .value,
                                                        })
                                                    }
                                                    aria-label="Sens"
                                                    style={styleSelect}
                                                >
                                                    {sens.map((s) => (
                                                        <option
                                                            key={s.value}
                                                            value={s.value}
                                                        >
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span style={styleSens(m.sens)}>
                                                    {sensLabel}
                                                </span>
                                            )}
                                        </td>

                                        <td
                                            style={{
                                                padding: CELLULE,
                                                borderBottom: BORDURE,
                                                borderLeft: '3px solid #7EC8F0',
                                                background: '#FBFDFF',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {enEdition && brouillon ? (
                                                <select
                                                    value={brouillon.statut}
                                                    onChange={(e) =>
                                                        setBrouillon({
                                                            ...brouillon,
                                                            statut: e.target
                                                                .value,
                                                        })
                                                    }
                                                    aria-label="Statut"
                                                    style={{
                                                        ...styleSelect,
                                                        padding: '0 8px',
                                                    }}
                                                >
                                                    {statuts.map((s) => (
                                                        <option
                                                            key={s.value}
                                                            value={s.value}
                                                        >
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Frise
                                                    statuts={statuts}
                                                    statut={m.statut}
                                                    jalon={jalon}
                                                    ouvert={ouvert}
                                                    sensLabel={sensLabel}
                                                    raisonFermeture={raison}
                                                />
                                            )}
                                        </td>

                                        <td
                                            style={{
                                                padding: '8px 10px',
                                                borderBottom: BORDURE,
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {enEdition && brouillon ? (
                                                <select
                                                    value={
                                                        brouillon.poste_quai_id
                                                    }
                                                    onChange={(e) =>
                                                        setBrouillon({
                                                            ...brouillon,
                                                            poste_quai_id:
                                                                e.target.value,
                                                        })
                                                    }
                                                    aria-label="Poste à quai"
                                                    style={styleSelect}
                                                >
                                                    <option value="">
                                                        — Aucun —
                                                    </option>
                                                    {postes.map((p) => (
                                                        <option
                                                            key={p.id}
                                                            value={p.id}
                                                        >
                                                            {p.code}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        fontSize: 12.5,
                                                        fontWeight: m.poste
                                                            ? 600
                                                            : 400,
                                                        color: m.poste
                                                            ? '#1A1F2E'
                                                            : '#B4BCC9',
                                                    }}
                                                >
                                                    {m.poste ?? '—'}
                                                </span>
                                            )}
                                        </td>

                                        <td
                                            style={{
                                                padding: '8px 10px',
                                                borderBottom: BORDURE,
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {enEdition && brouillon ? (
                                                <input
                                                    type="datetime-local"
                                                    value={brouillon.eta}
                                                    onChange={(e) =>
                                                        setBrouillon({
                                                            ...brouillon,
                                                            eta: e.target.value,
                                                        })
                                                    }
                                                    aria-label="ETA"
                                                    style={{
                                                        ...styleChamp,
                                                        fontSize: 11.5,
                                                    }}
                                                />
                                            ) : (
                                                <span style={styleDate(m.eta)}>
                                                    {formatDateHeure(m.eta)}
                                                </span>
                                            )}
                                        </td>

                                        <td
                                            style={{
                                                padding: '8px 10px',
                                                borderBottom: BORDURE,
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {enEdition && brouillon ? (
                                                <input
                                                    type="datetime-local"
                                                    value={brouillon.etd}
                                                    onChange={(e) =>
                                                        setBrouillon({
                                                            ...brouillon,
                                                            etd: e.target.value,
                                                        })
                                                    }
                                                    aria-label="ETD"
                                                    style={{
                                                        ...styleChamp,
                                                        fontSize: 11.5,
                                                    }}
                                                />
                                            ) : (
                                                <span style={styleDate(m.etd)}>
                                                    {formatDateHeure(m.etd)}
                                                </span>
                                            )}
                                        </td>

                                        <td
                                            style={{
                                                padding: CELLULE,
                                                borderBottom: BORDURE,
                                                fontSize: 12.5,
                                                fontWeight: 600,
                                                color: '#1A1F2E',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                                whiteSpace: 'nowrap',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {m.voyage}
                                        </td>

                                        <td
                                            title={m.consignataire ?? undefined}
                                            style={styleTexte}
                                        >
                                            {m.consignataire ?? '—'}
                                        </td>
                                        <td style={styleTexte}>
                                            {m.pavillon ?? '—'}
                                        </td>
                                        <td
                                            title={m.armateur ?? undefined}
                                            style={styleTexte}
                                        >
                                            {m.armateur ?? '—'}
                                        </td>

                                        {droits.renseigner ? (
                                            <td
                                                style={{
                                                    padding: '8px',
                                                    borderBottom: BORDURE,
                                                    textAlign: 'center',
                                                    verticalAlign: 'top',
                                                }}
                                            >
                                                {enEdition ? (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection:
                                                                'column',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                enregistrer(m)
                                                            }
                                                            disabled={enCours}
                                                            className="ea-btn-primary"
                                                            style={{
                                                                height: 28,
                                                                padding:
                                                                    '0 10px',
                                                                border: 'none',
                                                                borderRadius: 5,
                                                                background:
                                                                    '#1D3E9C',
                                                                color: '#fff',
                                                                fontSize: 11.5,
                                                                fontWeight: 700,
                                                                cursor: enCours
                                                                    ? 'not-allowed'
                                                                    : 'pointer',
                                                            }}
                                                        >
                                                            Enregistrer
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEdite(null);
                                                                setBrouillon(
                                                                    null,
                                                                );
                                                            }}
                                                            className="ea-btn-cancel"
                                                            style={{
                                                                height: 26,
                                                                padding:
                                                                    '0 10px',
                                                                border: '1px solid #C3CBDA',
                                                                borderRadius: 5,
                                                                background:
                                                                    '#fff',
                                                                color: '#3A4356',
                                                                fontSize: 11.5,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            ouvrirEdition(m)
                                                        }
                                                        title={`Éditer la ligne ${m.navire}`}
                                                        aria-label={`Éditer la ligne ${m.navire}`}
                                                        className="ea-icon-btn"
                                                        style={{
                                                            width: 30,
                                                            height: 30,
                                                            border: '1px solid #D8DEE9',
                                                            borderRadius: 6,
                                                            background: '#fff',
                                                            color: '#1D3E9C',
                                                            cursor: 'pointer',
                                                            display:
                                                                'inline-flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                        }}
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
                                                                stroke="currentColor"
                                                                strokeWidth="1.3"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                        ) : null}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td
                                    colSpan={colonnes}
                                    style={{
                                        position: 'sticky',
                                        bottom: 0,
                                        zIndex: 3,
                                        background: '#142C73',
                                        color: '#FFFFFF',
                                        padding: 0,
                                        borderTop: '2px solid #1D3E9C',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                            padding: '10px 18px',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                color: '#C9D4F0',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {filtres.length} navire
                                            {filtres.length > 1
                                                ? 's'
                                                : ''} · {port.label}
                                        </span>
                                        <div style={{ flex: 1 }} />
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: '#8FA3D9',
                                            }}
                                        >
                                            Situation diffusée aux partenaires
                                            (Capitainerie, OPRAG) hors
                                            plateforme
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Sous le bandeau récapitulatif : il porte le total du port, la
                pagination porte la tranche qu'on regarde. */}
            <Pagination
                total={filtres.length}
                page={pageCourante}
                parPage={PAR_PAGE}
                onPage={setPage}
            />
        </div>
    );
}

const styleFiltre = {
    height: 34,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background:
        "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") no-repeat right 10px center",
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    padding: '0 30px 0 12px',
    fontSize: 13,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
} as const;

const styleTexte = {
    padding: CELLULE,
    borderBottom: BORDURE,
    fontSize: 12.5,
    color: '#3A4356',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    verticalAlign: 'top' as const,
} as const;

const styleSens = (sens: string) =>
    ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: sens === 'import' ? '#14509C' : '#3A4356',
        background: sens === 'import' ? '#E4F3FC' : '#EEF1F7',
        border: `1px solid ${sens === 'import' ? '#B5DFF7' : '#D8DEE9'}`,
        borderRadius: 5,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
    }) as const;

const styleDate = (valeur: string | null) =>
    ({
        fontSize: 12,
        color: valeur ? '#1A1F2E' : '#B4BCC9',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
    }) as const;

/**
 * Deux vides différents : un port sans mouvement (le CGC n'a rien saisi) et un
 * filtre trop serré. Les confondre enverrait l'agent créer une ligne qui existe
 * déjà.
 */
function EtatVide({
    aucuneLigne,
    port,
    peutAjouter,
    onAjouter,
}: {
    aucuneLigne: boolean;
    port: string;
    peutAjouter: boolean;
    onAjouter: () => void;
}) {
    return (
        <div
            style={{
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FBFCFE',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: 420, padding: 30 }}>
                <svg
                    width="132"
                    height="88"
                    viewBox="0 0 132 88"
                    fill="none"
                    style={{ marginBottom: 8 }}
                    aria-hidden="true"
                >
                    <rect
                        x="76"
                        y="42"
                        width="52"
                        height="26"
                        fill="#EEF1F7"
                        stroke="#D8DEE9"
                        strokeWidth="1.4"
                    />
                    <path
                        d="M90 42 V14 H114"
                        stroke="#C6CDD9"
                        strokeWidth="2.6"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M114 14 v9"
                        stroke="#C6CDD9"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    <rect x="80" y="50" width="13" height="8" fill="#B5DFF7" />
                    <rect x="96" y="50" width="13" height="8" fill="#7EC8F0" />
                    <path d="M8 54 h46 l-7 12 H15 z" fill="#DCE3EE" />
                    <rect x="20" y="47" width="20" height="7" fill="#C6CDD9" />
                    <path
                        d="M4 74 q7 -4 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
                        stroke="#B5DFF7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                    <path
                        d="M4 80 q7 -4 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
                        stroke="#D6E8F7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                </svg>
                <h3
                    style={{
                        margin: '0 0 6px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1A1F2E',
                    }}
                >
                    {aucuneLigne
                        ? 'Aucun mouvement saisi pour ce port'
                        : 'Aucun navire ne correspond aux filtres'}
                </h3>
                <p
                    style={{
                        margin: '0 0 18px',
                        fontSize: 13,
                        color: '#5A6478',
                        lineHeight: 1.5,
                    }}
                >
                    {aucuneLigne
                        ? `La situation de ${port} est vide.${peutAjouter ? ' Ajoutez les navires reportés à la conférence.' : ' Elle sera renseignée par le CGC (DEX).'}`
                        : 'Ajustez la recherche, le statut ou le sens pour retrouver un navire.'}
                </p>
                {aucuneLigne && peutAjouter ? (
                    <button
                        type="button"
                        onClick={onAjouter}
                        className="ea-btn-primary"
                        style={{
                            height: 38,
                            padding: '0 18px',
                            border: 'none',
                            borderRadius: 7,
                            background: '#1D3E9C',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 16"
                            fill="none"
                        >
                            <path
                                d="M8 3v10M3 8h10"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                        Ajouter un navire
                    </button>
                ) : null}
            </div>
        </div>
    );
}
