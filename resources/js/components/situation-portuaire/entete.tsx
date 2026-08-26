import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { Droits, PortRef, Publication } from './types';
import { estAujourdHui, formatDate, formatHeure } from './types';

/*
 * L'en-tête de l'écran : ce qu'on regarde (quel port, à quelle date), dans quel
 * état c'est (publiée ou non), et les deux gestes qui engagent — ajouter un
 * navire, publier la situation.
 *
 * Publier n'est pas un geste de saisie : c'est la validation hiérarchique
 * d'ADR-0013. Le conférencier renseigne, son supérieur publie — d'où deux
 * permissions distinctes derrière deux boutons voisins.
 */

type EnteteProps = {
    ports: PortRef[];
    port: PortRef;
    droits: Droits;
    publication: Publication;
    onAjouter: () => void;
};

/** Format attendu par un champ `date` : « 2026-08-01 ». */
function iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function debutDuMois(): string {
    const d = new Date();

    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
}

function finDuMois(): string {
    const d = new Date();

    // Le jour 0 du mois suivant est le dernier du mois courant.
    return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

const etiquettePeriode = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    color: '#8A93A6',
    textTransform: 'uppercase',
} as const;

const champPeriode = {
    height: 34,
    width: '100%',
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 12.5,
    color: '#1A1F2E',
    background: '#fff',
    outlineColor: '#1D3E9C',
    fontVariantNumeric: 'tabular-nums',
} as const;

export default function Entete({
    ports,
    port,
    droits,
    publication,
    onAjouter,
}: EnteteProps) {
    const [menuPort, setMenuPort] = useState(false);
    const [menuExport, setMenuExport] = useState(false);
    const [publicationEnCours, setPublicationEnCours] = useState(false);
    // Le mois en cours par défaut : c'est la fenêtre qu'on exporte le plus
    // souvent, et elle contient aussi bien les navires sortis que ceux annoncés.
    const [du, setDu] = useState(() => debutDuMois());
    const [au, setAu] = useState(() => finDuMois());
    const zone = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuPort && !menuExport) {
            return;
        }

        const surClic = (e: MouseEvent) => {
            if (zone.current && !zone.current.contains(e.target as Node)) {
                setMenuPort(false);
                setMenuExport(false);
            }
        };
        const surTouche = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuPort(false);
                setMenuExport(false);
            }
        };

        document.addEventListener('mousedown', surClic);
        document.addEventListener('keydown', surTouche);

        return () => {
            document.removeEventListener('mousedown', surClic);
            document.removeEventListener('keydown', surTouche);
        };
    }, [menuPort, menuExport]);

    const changerPort = (code: string) => {
        setMenuPort(false);
        router.get(
            '/situation-portuaire',
            { port: code },
            { preserveState: false },
        );
    };

    const periodeValide = du !== '' && au !== '' && du <= au;

    /**
     * Téléchargement direct : le serveur répond en pièce jointe, la page ne
     * bouge pas. Passer par Inertia n'apporterait rien — il n'y a pas d'état à
     * conserver, et un binaire n'est pas une réponse Inertia.
     */
    const exporter = () => {
        if (!periodeValide) {
            return;
        }

        setMenuExport(false);
        window.location.href = `/situation-portuaire/${port.id}/export?du=${du}&au=${au}`;
    };

    const publier = () => {
        setPublicationEnCours(true);
        router.post(
            `/situation-portuaire/${port.id}/publication`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setPublicationEnCours(false),
            },
        );
    };

    // La pastille d'état, dans l'ordre de priorité : ce qui reste à publier
    // prime sur ce qui l'a été.
    const heure = formatHeure(publication.publieeLe);
    const pastille =
        droits.renseigner && publication.brouillons > 0
            ? {
                  texte: `${publication.brouillons} modification${publication.brouillons > 1 ? 's' : ''} non publiée${publication.brouillons > 1 ? 's' : ''}`,
                  encre: '#B26200',
                  fond: '#FDF1E3',
                  bord: '#F0CFA0',
              }
            : publication.publieeLe
              ? {
                    texte: estAujourdHui(publication.publieeLe)
                        ? `Publiée aujourd'hui à ${heure}`
                        : `Publiée le ${formatDate(publication.publieeLe)} à ${heure}`,
                    encre: '#21771F',
                    fond: '#E7F5E7',
                    bord: '#BFE4BF',
                }
              : {
                    texte: 'Non encore publiée',
                    encre: '#5A6478',
                    fond: '#EEF1F7',
                    bord: '#D8DEE9',
                };

    const rienAPublier = publication.brouillons === 0;

    return (
        <section
            style={{
                background: '#FFFFFF',
                borderBottom: '1px solid #D8DEE9',
                flex: 'none',
                position: 'relative',
            }}
        >
            <div style={{ padding: '14px 24px 13px' }} ref={zone}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 24,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <svg
                            width="30"
                            height="22"
                            viewBox="0 0 30 22"
                            fill="none"
                            aria-hidden="true"
                            style={{ flex: 'none' }}
                        >
                            <rect
                                x="7"
                                y="6"
                                width="4.6"
                                height="4"
                                fill="#7EC8F0"
                            />
                            <rect
                                x="12.2"
                                y="6"
                                width="4.6"
                                height="4"
                                fill="#1D3E9C"
                            />
                            <rect
                                x="17.4"
                                y="6"
                                width="4.6"
                                height="4"
                                fill="#7EC8F0"
                            />
                            <rect
                                x="12.2"
                                y="1.6"
                                width="4.6"
                                height="4"
                                fill="#142C73"
                            />
                            <path
                                d="M3 11h24l-3.4 6H6.4L3 11z"
                                fill="#1D3E9C"
                            />
                            <path
                                d="M1 20c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4 2 1.4 4 1.4"
                                stroke="#7EC8F0"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </svg>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 21,
                                        fontWeight: 800,
                                        color: '#142C73',
                                        letterSpacing: '-.01em',
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Situation portuaire
                                </h1>
                                {droits.renseigner ? null : (
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#5A6478',
                                            background: '#EEF1F7',
                                            border: '1px solid #D8DEE9',
                                            borderRadius: 5,
                                            padding: '2px 9px',
                                        }}
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 14 14"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <rect
                                                x="2.5"
                                                y="6"
                                                width="9"
                                                height="6.5"
                                                rx="1.2"
                                                stroke="#5A6478"
                                                strokeWidth="1.3"
                                            />
                                            <path
                                                d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6"
                                                stroke="#5A6478"
                                                strokeWidth="1.3"
                                            />
                                        </svg>
                                        Lecture seule
                                    </span>
                                )}
                            </div>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 12.5,
                                    color: '#5A6478',
                                }}
                            >
                                Mouvements de navires — conférence portuaire
                                quotidienne (11h, Capitainerie). Conditionne la
                                transmission des dossiers d'escale.
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setMenuExport((o) => !o);
                                    setMenuPort(false);
                                }}
                                aria-expanded={menuExport}
                                className="ea-btn-ghost"
                                style={{
                                    height: 38,
                                    padding: '0 15px',
                                    border: '1px solid #C3CBDA',
                                    borderRadius: 7,
                                    background: '#fff',
                                    color: '#1D3E9C',
                                    fontSize: 13,
                                    fontWeight: 600,
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
                                        d="M8 10.5V2.5M8 2.5L5 5.5M8 2.5l3 3"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M3 10v2.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                Exporter / Diffuser
                            </button>
                            {menuExport ? (
                                <div
                                    role="menu"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        zIndex: 30,
                                        width: 306,
                                        background: '#fff',
                                        border: '1px solid #D8DEE9',
                                        borderRadius: 8,
                                        boxShadow:
                                            '0 12px 30px rgba(20,44,115,.18)',
                                        overflow: 'hidden',
                                        animation: 'ecdtsFade .14s ease',
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '.06em',
                                            color: '#8A93A6',
                                            textTransform: 'uppercase',
                                            borderBottom: '1px solid #F0F2F7',
                                            background: '#FBFCFE',
                                        }}
                                    >
                                        Période à exporter
                                    </div>

                                    {/* On n'exporte jamais « tout » : une ligne
                                        de situation portuaire ne s'efface
                                        jamais, la période est donc ce qui donne
                                        son sens au document. */}
                                    <div
                                        style={{
                                            padding: '12px',
                                            display: 'flex',
                                            gap: 10,
                                        }}
                                    >
                                        <label
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                            }}
                                        >
                                            <span style={etiquettePeriode}>
                                                Du
                                            </span>
                                            <input
                                                type="date"
                                                value={du}
                                                max={au}
                                                onChange={(e) =>
                                                    setDu(e.target.value)
                                                }
                                                style={champPeriode}
                                            />
                                        </label>
                                        <label
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                            }}
                                        >
                                            <span style={etiquettePeriode}>
                                                Au
                                            </span>
                                            <input
                                                type="date"
                                                value={au}
                                                min={du}
                                                onChange={(e) =>
                                                    setAu(e.target.value)
                                                }
                                                style={champPeriode}
                                            />
                                        </label>
                                    </div>

                                    <div
                                        style={{
                                            padding: '0 12px 12px',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={exporter}
                                            disabled={!periodeValide}
                                            className={
                                                periodeValide
                                                    ? 'ea-btn-primary'
                                                    : undefined
                                            }
                                            style={{
                                                width: '100%',
                                                height: 36,
                                                border: 'none',
                                                borderRadius: 6,
                                                background: periodeValide
                                                    ? '#1D3E9C'
                                                    : '#A8B4CE',
                                                color: '#fff',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: periodeValide
                                                    ? 'pointer'
                                                    : 'not-allowed',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <svg
                                                width="15"
                                                height="17"
                                                viewBox="0 0 16 20"
                                                fill="none"
                                            >
                                                <path
                                                    d="M2 1h8l4 4v14H2V1z"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.4"
                                                />
                                                <path
                                                    d="M10 1v4h4"
                                                    stroke="currentColor"
                                                    strokeWidth="1.4"
                                                />
                                            </svg>
                                            Exporter le tableau en PDF
                                        </button>
                                        <p
                                            style={{
                                                margin: '7px 1px 0',
                                                fontSize: 10.5,
                                                color: '#8A93A6',
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            Les escales qui touchent la période,
                                            y compris commencées avant ou non
                                            achevées.
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '.06em',
                                            color: '#8A93A6',
                                            textTransform: 'uppercase',
                                            borderTop: '1px solid #F0F2F7',
                                            borderBottom: '1px solid #F0F2F7',
                                            background: '#FBFCFE',
                                        }}
                                    >
                                        Diffusion hors plateforme
                                    </div>
                                    <button
                                        type="button"
                                        disabled
                                        title="Les destinataires de la diffusion (Capitainerie, OPRAG) ne sont pas encore paramétrés."
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            border: 'none',
                                            background: '#fff',
                                            padding: '10px 12px',
                                            fontSize: 13,
                                            color: '#A6AFC0',
                                            cursor: 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 9,
                                            borderTop: '1px solid #F0F2F7',
                                        }}
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                        >
                                            <rect
                                                x="1.5"
                                                y="3"
                                                width="13"
                                                height="10"
                                                rx="1.5"
                                                stroke="#A6AFC0"
                                                strokeWidth="1.3"
                                            />
                                            <path
                                                d="M2 4l6 4.5L14 4"
                                                stroke="#A6AFC0"
                                                strokeWidth="1.3"
                                                fill="none"
                                            />
                                        </svg>
                                        Diffuser par courriel — à paramétrer
                                    </button>
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: 11,
                                            color: '#8A93A6',
                                            borderTop: '1px solid #F0F2F7',
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        Destinataires : Capitainerie, OPRAG —
                                        partenaires sans compte e-CDTS.
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {droits.renseigner ? (
                            <button
                                type="button"
                                onClick={onAjouter}
                                className="ea-btn-primary"
                                style={{
                                    height: 38,
                                    padding: '0 16px',
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

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        marginTop: 13,
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ position: 'relative', flex: 'none' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setMenuPort((o) => !o);
                                setMenuExport(false);
                            }}
                            title="Changer de port"
                            aria-expanded={menuPort}
                            className="ea-btn-ghost"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                height: 34,
                                padding: '0 12px',
                                background: '#fff',
                                border: '1px solid #C3CBDA',
                                borderRadius: 7,
                                cursor: 'pointer',
                            }}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 16 16"
                                fill="none"
                                style={{ flex: 'none' }}
                            >
                                <path
                                    d="M8 1.5c-2.4 0-4.3 1.9-4.3 4.2C3.7 9 8 14.3 8 14.3s4.3-5.3 4.3-8.6C12.3 3.4 10.4 1.5 8 1.5z"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.3"
                                />
                                <circle
                                    cx="8"
                                    cy="5.7"
                                    r="1.7"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.3"
                                />
                            </svg>
                            <span
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    textAlign: 'left',
                                    lineHeight: 1.05,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '.06em',
                                        color: '#8A93A6',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Port
                                </span>
                                <span
                                    style={{
                                        fontSize: 13.5,
                                        fontWeight: 700,
                                        color: '#142C73',
                                    }}
                                >
                                    {port.label}
                                </span>
                            </span>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                style={{
                                    transition: 'transform .15s ease',
                                    transform: menuPort
                                        ? 'rotate(180deg)'
                                        : undefined,
                                    flex: 'none',
                                }}
                            >
                                <path
                                    d="M2.5 4.5L6 8l3.5-3.5"
                                    stroke="#5A6478"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        {menuPort ? (
                            <div
                                role="menu"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    zIndex: 31,
                                    width: 230,
                                    background: '#fff',
                                    border: '1px solid #D8DEE9',
                                    borderRadius: 8,
                                    boxShadow:
                                        '0 12px 30px rgba(20,44,115,.18)',
                                    overflow: 'hidden',
                                    padding: 6,
                                    animation: 'ecdtsFade .14s ease',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '4px 8px 6px',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '.06em',
                                        color: '#8A93A6',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Port de la situation
                                </div>
                                {ports.map((p) => {
                                    const actif = p.code === port.code;

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => changerPort(p.code)}
                                            className={
                                                actif
                                                    ? undefined
                                                    : 'ea-menuitem'
                                            }
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 9,
                                                height: 36,
                                                padding: '0 10px',
                                                border: 'none',
                                                background: actif
                                                    ? '#F0F4FB'
                                                    : 'transparent',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: actif ? 700 : 500,
                                                color: actif
                                                    ? '#1D3E9C'
                                                    : '#1A1F2E',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 42,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: '#8A93A6',
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                    flex: 'none',
                                                }}
                                            >
                                                {p.code}
                                            </span>
                                            <span style={{ flex: 1 }}>
                                                {p.label}
                                            </span>
                                            {actif ? (
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 14 14"
                                                    fill="none"
                                                    style={{ flex: 'none' }}
                                                >
                                                    <path
                                                        d="M2.5 7.5l3 3 6-7"
                                                        stroke="#1D3E9C"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12.5,
                            color: '#3A4356',
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 16"
                            fill="none"
                            style={{ flex: 'none' }}
                            aria-hidden="true"
                        >
                            <rect
                                x="2"
                                y="3"
                                width="12"
                                height="11"
                                rx="1.5"
                                stroke="#8A93A6"
                                strokeWidth="1.3"
                            />
                            <path
                                d="M2 6h12M5.5 1.5v3M10.5 1.5v3"
                                stroke="#8A93A6"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                            />
                        </svg>
                        Conférence du{' '}
                        <strong
                            style={{
                                fontWeight: 700,
                                color: '#1A1F2E',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {new Date().toLocaleDateString('fr-FR')}
                        </strong>{' '}
                        · 11h
                    </div>

                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: pastille.encre,
                            background: pastille.fond,
                            border: `1px solid ${pastille.bord}`,
                            borderRadius: 5,
                            padding: '3px 10px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {pastille.texte}
                    </span>

                    <div style={{ flex: 1 }} />

                    {droits.valider ? (
                        <button
                            type="button"
                            onClick={publier}
                            disabled={rienAPublier || publicationEnCours}
                            title={
                                rienAPublier
                                    ? 'Aucune modification à publier'
                                    : publication.incoherentes > 0
                                      ? `Attention : ${publication.incoherentes} navire(s) au statut incohérent avec les dates`
                                      : 'Publier et diffuser la situation'
                            }
                            className={
                                rienAPublier ? undefined : 'ea-btn-validate'
                            }
                            style={{
                                height: 38,
                                padding: '0 16px',
                                borderRadius: 7,
                                border: 'none',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: rienAPublier
                                    ? 'not-allowed'
                                    : 'pointer',
                                background: rienAPublier
                                    ? '#A8B4CE'
                                    : '#2F9E2F',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                            }}
                        >
                            {rienAPublier
                                ? 'Publier'
                                : `Publier (${publication.brouillons})`}
                        </button>
                    ) : null}
                </div>
            </div>
            <div
                style={{
                    height: 9,
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-opacity='0.5' stroke-width='1.4'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'bottom 2px left 0',
                }}
            />
        </section>
    );
}
