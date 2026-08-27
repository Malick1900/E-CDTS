import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import type { Resume } from './types';

/*
 * L'en-tête de l'écran : ce qu'on regarde, combien il y en a par grande phase,
 * et le seul geste qui engage ici — ouvrir un dossier.
 *
 * Il porte son propre fil d'Ariane plutôt que celui d'`ActivityShell` : la
 * bande du shell réserve sa droite à la carte de contexte, or c'est là que le
 * bouton d'ouverture doit se trouver.
 */

type EnteteProps = {
    resume: Resume;
    /** L'étape filtrée — « all », « en-cours », ou une valeur d'`EtapeDossier`. */
    etape: string;
    onEtape: (etape: string) => void;
    /**
     * Ouvrir est le geste du consignataire (WF3). Le même booléen décide du
     * bouton et du sous-titre : un interne CGC ne lit pas « vos dossiers », il
     * regarde ceux de tout le monde.
     */
    peutOuvrir: boolean;
};

/** Les quatre pastilles de résumé, dans l'ordre du circuit. */
const PASTILLES = [
    { cle: 'all', label: 'Tous', point: '#8A93A6' },
    { cle: 'ouvert', label: 'Ouverts', point: '#1D3E9C' },
    { cle: 'en-cours', label: 'En cours', point: '#E07B00' },
    { cle: 'cloture', label: 'Clôturés', point: '#2F9E2F' },
] as const;

const boutonOuvrir: CSSProperties = {
    height: 38,
    padding: '0 16px',
    border: 'none',
    borderRadius: 7,
    background: '#1D3E9C',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    flex: 'none',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
};

export default function Entete({
    resume,
    etape,
    onEtape,
    peutOuvrir,
}: EnteteProps) {
    const comptes: Record<string, number> = {
        all: resume.tous,
        ouvert: resume.ouverts,
        'en-cours': resume.enCours,
        cloture: resume.clotures,
    };

    return (
        <section
            style={{
                background: '#FFFFFF',
                borderBottom: '1px solid #D8DEE9',
                flex: 'none',
                position: 'relative',
            }}
        >
            <div style={{ padding: '14px 24px 13px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#5A6478',
                        marginBottom: 9,
                    }}
                >
                    <Link
                        href="/dashboard"
                        style={{ color: '#5A6478', textDecoration: 'none' }}
                    >
                        Tableau de bord
                    </Link>
                    <span style={{ color: '#B4BCC9' }}>›</span>
                    <span style={{ fontWeight: 600, color: '#1A1F2E' }}>
                        Dossiers d'escale
                    </span>
                </div>

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
                            gap: 13,
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
                                Dossiers d'escale
                            </h1>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 12.5,
                                    color: '#5A6478',
                                }}
                            >
                                {peutOuvrir
                                    ? "Vos dossiers d'escale — de l'ouverture à la clôture de la liquidation CDTS."
                                    : "Tous les dossiers d'escale des consignataires — suivi du circuit de liquidation CDTS."}
                            </p>
                        </div>
                    </div>

                    {peutOuvrir ? (
                        <Link
                            href="/dossiers/nouveau"
                            className="ea-btn-primary"
                            style={boutonOuvrir}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M8 3v10M3 8h10"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Ouvrir un dossier d'escale
                        </Link>
                    ) : null}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 13,
                        flexWrap: 'wrap',
                    }}
                >
                    {PASTILLES.map((p) => {
                        const active = etape === p.cle;

                        return (
                            <button
                                key={p.cle}
                                type="button"
                                onClick={() => onEtape(p.cle)}
                                aria-pressed={active}
                                className={active ? undefined : 'ea-chipbtn'}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    height: 30,
                                    padding: '0 12px',
                                    border: `1px solid ${active ? '#1D3E9C' : '#D8DEE9'}`,
                                    borderRadius: 7,
                                    background: active ? '#EEF3FF' : '#fff',
                                    color: active ? '#1D3E9C' : '#3A4356',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: p.point,
                                        flex: 'none',
                                    }}
                                />
                                <span
                                    style={{
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {comptes[p.cle]}
                                </span>
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* La vaguelette de la charte : elle sépare l'en-tête du contenu
            sans tracer un trait de plus. */}
            <div
                aria-hidden="true"
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
