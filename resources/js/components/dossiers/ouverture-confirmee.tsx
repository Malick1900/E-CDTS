import { Link } from '@inertiajs/react';
import Frise from './frise';
import type { DossierOuvert, EtapeRef } from './types';
import { formatDateHeure } from './types';

/*
 * Ce qui vient d'être ouvert.
 *
 * L'écran ne félicite pas : il montre le dossier tel qu'il existe désormais —
 * son numéro provisoire, le jalon franchi sur les six, et ce qui reste à
 * attendre avant de pouvoir le transmettre. Le n° de manifeste le remplacera à
 * l'étape suivante ; la référence interne, elle, ne bougera plus (ADR-0008).
 */

type ConfirmationProps = {
    dossier: DossierOuvert;
    circuit: EtapeRef[];
};

export default function OuvertureConfirmee({
    dossier,
    circuit,
}: ConfirmationProps) {
    const champs: Array<{ label: string; valeur: string | null }> = [
        { label: 'Consignataire', valeur: dossier.consignataire },
        { label: 'Navire', valeur: dossier.navire },
        { label: 'Armement', valeur: dossier.armement },
        { label: 'Pavillon', valeur: dossier.pavillon },
        {
            label: 'Type',
            valeur:
                [dossier.typeCode, dossier.typeLabel]
                    .filter(Boolean)
                    .join(' · ') || null,
        },
        { label: 'N° de voyage', valeur: dossier.voyage },
        { label: 'Sens', valeur: dossier.sensLabel },
        {
            label: 'Port / poste',
            valeur: dossier.poste
                ? `${dossier.port} — ${dossier.poste}`
                : dossier.port,
        },
        {
            label: dossier.sens === 'export' ? 'ETD (prév.)' : 'ETA (prév.)',
            valeur:
                dossier.etaPrevue === null
                    ? null
                    : formatDateHeure(dossier.etaPrevue),
        },
    ];

    const verrou =
        dossier.sens === 'import'
            ? 'Transmissible une fois le navire à quai'
            : 'Transmissible une fois le navire sorti';

    const carte = {
        background: '#fff',
        border: '1px solid #D8DEE9',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(20,44,115,.06)',
        overflow: 'hidden',
    } as const;

    const etiquette = {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.06em',
        color: '#8A93A6',
        textTransform: 'uppercase',
    } as const;

    return (
        <>
            <main
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflow: 'auto',
                    background: '#F5F7FA',
                }}
            >
                <div
                    style={{
                        maxWidth: 1000,
                        margin: '0 auto',
                        padding: '22px 24px 30px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                    }}
                >
                    {/* ── Le circuit, et où l'on en est ── */}
                    <div style={carte}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '13px 18px',
                                borderBottom: '1px solid #E7EBF2',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#1A1F2E',
                                }}
                            >
                                Circuit de liquidation CDTS
                            </span>
                            <div style={{ flex: 1 }} />
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: '#21771F',
                                    background: '#E7F5E7',
                                    border: '1px solid #BFE4BF',
                                    borderRadius: 5,
                                    padding: '3px 10px',
                                }}
                            >
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#2F9E2F',
                                        flex: 'none',
                                    }}
                                />
                                Jalon 1 sur 6 franchi
                            </span>
                        </div>
                        <div
                            style={{
                                padding: '24px 20px 14px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                overflowX: 'auto',
                            }}
                        >
                            <Frise
                                circuit={circuit}
                                courante={dossier.etape}
                                taille="large"
                            />
                        </div>
                    </div>

                    {/* ── Le dossier lui-même ── */}
                    <div style={carte}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 18px',
                                borderBottom: '1px solid #E7EBF2',
                                flexWrap: 'wrap',
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: '#1A1F2E',
                                    letterSpacing: '-.01em',
                                }}
                            >
                                {dossier.navire}
                            </h2>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: '#1D3E9C',
                                    background: '#E9EEF8',
                                    border: '1px solid #C7D3EC',
                                    borderRadius: 5,
                                    padding: '3px 10px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#1D3E9C',
                                        flex: 'none',
                                    }}
                                />
                                Ouvert
                            </span>
                            <div style={{ flex: 1 }} />
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    gap: 3,
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: '#5A6478',
                                        background: '#EEF1F7',
                                        border: '1px solid #D8DEE9',
                                        borderRadius: 6,
                                        padding: '5px 11px',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    <span
                                        style={{
                                            ...etiquette,
                                            fontSize: 9,
                                        }}
                                    >
                                        {dossier.provisoire
                                            ? 'N° provisoire'
                                            : 'N° de manifeste'}
                                    </span>
                                    {dossier.numero}
                                </span>
                                {dossier.provisoire ? (
                                    <span
                                        style={{
                                            fontSize: 10.5,
                                            color: '#98A2B4',
                                        }}
                                    >
                                        Provisoire — deviendra le n° de
                                        manifeste
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(4, minmax(0, 1fr))',
                                gap: '16px 22px',
                                padding: '16px 18px',
                            }}
                        >
                            {champs.map((f) => (
                                <div key={f.label} style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            ...etiquette,
                                            marginBottom: 3,
                                        }}
                                    >
                                        {f.label}
                                    </div>
                                    <div
                                        title={f.valeur ?? undefined}
                                        style={{
                                            fontSize: 13.5,
                                            fontWeight: 600,
                                            color:
                                                f.valeur === null
                                                    ? '#B4BCC9'
                                                    : '#1A1F2E',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {f.valeur ?? '—'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '12px 18px',
                                background: '#F5F8FD',
                                borderTop: '1px solid #E7EBF2',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    color: '#5A6478',
                                    lineHeight: 1.4,
                                }}
                            >
                                {verrou} — confirmation par la situation
                                portuaire.
                            </span>
                            <div style={{ flex: 1 }} />
                            <span
                                style={{
                                    fontSize: 11,
                                    color: '#98A2B4',
                                    fontVariantNumeric: 'tabular-nums',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Référence interne · {dossier.reference}
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {/* ══ Barre d'action ══ */}
            <div
                style={{
                    background: '#fff',
                    borderTop: '1px solid #D8DEE9',
                    padding: '11px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flex: 'none',
                    boxShadow: '0 -1px 3px rgba(20,44,115,.05)',
                    minHeight: 62,
                    flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: '#3A4356',
                    }}
                >
                    <span style={{ fontWeight: 700, color: '#1D3E9C' }}>
                        Prochaine étape
                    </span>{' '}
                    · Manifeste — écran à venir.
                </span>
                <div style={{ flex: 1 }} />
                <Link
                    href="/dossiers/nouveau"
                    className="ea-btn-cancel"
                    style={{
                        height: 40,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0 18px',
                        border: '1px solid #C3CBDA',
                        borderRadius: 6,
                        background: '#fff',
                        color: '#3A4356',
                        fontSize: 13.5,
                        fontWeight: 600,
                        textDecoration: 'none',
                        flex: 'none',
                    }}
                >
                    Ouvrir un autre dossier
                </Link>
                <Link
                    href="/dossiers"
                    className="ea-btn-primary"
                    style={{
                        height: 40,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0 22px',
                        borderRadius: 6,
                        background: '#1D3E9C',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        textDecoration: 'none',
                        flex: 'none',
                    }}
                >
                    Retour aux dossiers
                </Link>
            </div>
        </>
    );
}
