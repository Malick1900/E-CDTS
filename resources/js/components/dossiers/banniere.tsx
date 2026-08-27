import { Link } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';
import Frise from './frise';
import type { DossierManifeste, EtapeRef } from './types';
import { formatDateHeure } from './types';

/*
 * La bannière d'un dossier d'escale — l'identité du passage, au-dessus de
 * l'écran qui l'instruit.
 *
 * Elle ne montre rien qu'elle détienne : le navire vient du référentiel, les
 * dates réelles et le poste d'accostage de la situation portuaire (ADR-0009).
 * D'où la distinction que chaque cellule tient à l'œil : ce que le
 * consignataire a *annoncé* à l'ouverture se lit en gris et le dit ; ce que la
 * conférence a *constaté* se lit en noir. Un dossier encore orphelin de sa
 * ligne l'annonce plutôt que d'afficher des tirets muets.
 *
 * Aucun geste ne part d'ici : c'est un en-tête, pas un formulaire.
 */

type BanniereProps = {
    dossier: DossierManifeste;
    /** Les six jalons du circuit, pour situer le dossier d'un coup d'œil. */
    circuit: EtapeRef[];
};

const ETIQUETTE: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.07em',
    color: '#8A93A6',
    textTransform: 'uppercase',
    marginBottom: 2,
};

const VALEUR: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A1F2E',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const NOTE: CSSProperties = {
    fontSize: 9,
    color: '#A6AFC0',
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

/** Ce qu'on lit quand la donnée n'existe pas encore. */
const ABSENT = '—';

type CelluleProps = {
    label: string;
    valeur: ReactNode;
    /** La provenance ou la portée de la valeur, en tout petit dessous. */
    note?: string;
    /** L'encre de la valeur — grise quand elle n'est encore qu'annoncée. */
    encre?: string;
    /** Les chiffres s'alignent : voyages, dates, numéros. */
    chiffres?: boolean;
    /** Le libellé long, quand la cellule n'en montre que l'abrégé. */
    titre?: string;
};

function Cellule({
    label,
    valeur,
    note,
    encre,
    chiffres = false,
    titre,
}: CelluleProps) {
    return (
        <div style={{ minWidth: 0 }}>
            <div style={ETIQUETTE}>{label}</div>
            <div
                title={titre}
                style={{
                    ...VALEUR,
                    color: encre ?? VALEUR.color,
                    fontVariantNumeric: chiffres ? 'tabular-nums' : undefined,
                }}
            >
                {valeur}
            </div>
            {note === undefined ? null : <div style={NOTE}>{note}</div>}
        </div>
    );
}

export default function Banniere({ dossier, circuit }: BanniereProps) {
    /*
     * Rapproché, le dossier lit ses dates réelles à la situation portuaire.
     * Sinon il n'a que l'ETA qu'il a lui-même annoncée — et aucune date de
     * départ, qui ne se constate qu'au port.
     */
    const eta = dossier.rapproche ? dossier.eta : dossier.etaAnnoncee;
    const annoncee = !dossier.rapproche && dossier.etaAnnoncee !== null;

    const poste = dossier.rapproche
        ? [dossier.posteStatut, dossier.poste].filter(Boolean).join(' — ')
        : dossier.posteAnnonce;

    return (
        <section
            style={{
                background: '#FFFFFF',
                borderBottom: '1px solid #D8DEE9',
                flex: 'none',
                position: 'relative',
            }}
        >
            <div style={{ padding: '14px 24px' }}>
                {/* ══ Fil d'Ariane ══ */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#5A6478',
                        marginBottom: 10,
                        flexWrap: 'wrap',
                    }}
                >
                    <Link
                        href="/dossiers"
                        style={{ color: '#5A6478', textDecoration: 'none' }}
                    >
                        Dossiers d'escale
                    </Link>
                    <span style={{ color: '#B4BCC9' }}>›</span>
                    <span>{dossier.port}</span>
                    <span style={{ color: '#B4BCC9' }}>›</span>
                    <span
                        style={{
                            fontWeight: 600,
                            color: '#1A1F2E',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {dossier.numero}
                    </span>
                    {dossier.provisoire ? (
                        <span
                            title="Numéro provisoire — il deviendra le n° de manifeste au rattachement"
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '.04em',
                                color: '#8A93A6',
                                background: '#EEF1F7',
                                border: '1px solid #D8DEE9',
                                borderRadius: 4,
                                padding: '1px 6px',
                                textTransform: 'uppercase',
                            }}
                        >
                            Provisoire
                        </span>
                    ) : null}
                </div>

                {/* ══ Navire + frise du circuit ══ */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 32,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
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
                        <h1
                            style={{
                                margin: 0,
                                fontSize: 20,
                                fontWeight: 700,
                                color: '#1A1F2E',
                                letterSpacing: '-.01em',
                            }}
                        >
                            {dossier.navire}
                        </h1>

                        {/* Le dossier attend-il encore sa ligne de situation
                        portuaire ? C'est elle qui lui donnera ses dates
                        réelles, et le verrou de transmission avec (ADR-0009). */}
                        {dossier.rapproche ? null : (
                            <span
                                title="Le navire n'a pas encore été annoncé à la conférence portuaire. Les dates réelles et le poste d'accostage viendront de là."
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#B26200',
                                    background: '#FDF1E3',
                                    border: '1px solid #F0CFA0',
                                    borderRadius: 5,
                                    padding: '2px 9px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: '#E07B00',
                                        flex: 'none',
                                    }}
                                />
                                En attente de la situation portuaire
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            paddingTop: 6,
                        }}
                    >
                        <Frise circuit={circuit} courante={dossier.etape} />
                    </div>
                </div>

                {/* ══ La fiche du passage, en douze cellules ══ */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, minmax(118px, 1fr))',
                        gap: '10px 18px',
                        borderTop: '1px solid #E7EBF2',
                        marginTop: 12,
                        paddingTop: 11,
                    }}
                >
                    <Cellule
                        label="Consignataire"
                        valeur={dossier.consignataire}
                        titre={dossier.consignataire}
                    />
                    <Cellule
                        label="Navire"
                        valeur={dossier.navire}
                        titre={dossier.navire}
                    />
                    <Cellule
                        label="Armement"
                        valeur={dossier.armement ?? ABSENT}
                        titre={dossier.armement ?? undefined}
                    />
                    <Cellule
                        label="Pavillon"
                        valeur={dossier.pavillon ?? ABSENT}
                    />
                    <Cellule
                        label="Type"
                        valeur={dossier.typeCode ?? ABSENT}
                        titre={dossier.typeLabel ?? undefined}
                    />
                    <Cellule
                        label="N° de voyage"
                        valeur={dossier.voyage}
                        chiffres
                    />

                    <Cellule
                        label="Sens"
                        valeur={dossier.sensLabel}
                        encre={
                            dossier.sens === 'import' ? '#14509C' : '#3A4356'
                        }
                    />
                    <Cellule
                        label="ETA"
                        valeur={formatDateHeure(eta)}
                        note={
                            annoncee
                                ? "Annoncée à l'ouverture"
                                : dossier.rapproche
                                  ? undefined
                                  : 'Au rapprochement'
                        }
                        encre={annoncee ? '#8A93A6' : undefined}
                        chiffres
                    />
                    <Cellule
                        label="ETD"
                        valeur={formatDateHeure(
                            dossier.rapproche ? dossier.etd : null,
                        )}
                        note={
                            dossier.rapproche ? undefined : 'Au rapprochement'
                        }
                        chiffres
                    />
                    <Cellule
                        label={
                            dossier.provisoire
                                ? 'N° provisoire'
                                : 'N° de manifeste'
                        }
                        valeur={dossier.numero}
                        note={
                            dossier.provisoire
                                ? 'Deviendra le n° de manifeste'
                                : 'Figé — non modifiable'
                        }
                        encre={dossier.provisoire ? '#8A93A6' : undefined}
                        titre={dossier.numero}
                        chiffres
                    />
                    <Cellule
                        label="Nb de conteneurs"
                        valeur={dossier.conteneurs ?? ABSENT}
                        note={
                            dossier.conteneurs === null
                                ? 'Renseigné au manifeste'
                                : 'Boîtes distinctes'
                        }
                        encre={
                            dossier.conteneurs === null ? '#B4BCC9' : undefined
                        }
                        chiffres
                    />
                    <Cellule
                        label="Poste"
                        valeur={poste === null || poste === '' ? ABSENT : poste}
                        note={
                            dossier.rapproche
                                ? undefined
                                : "Demandé à l'ouverture"
                        }
                        encre={dossier.rapproche ? '#21771F' : '#8A93A6'}
                        titre={poste ?? undefined}
                    />
                </div>

                {/* ══ La référence interne — l'identité qui ne bouge jamais ══ */}
                <div
                    style={{
                        marginTop: 10,
                        paddingTop: 9,
                        borderTop: '1px solid #F0F2F7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 11,
                        color: '#98A2B4',
                        flexWrap: 'wrap',
                    }}
                >
                    <span
                        style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            textTransform: 'uppercase',
                            color: '#A6AFC0',
                        }}
                    >
                        Référence interne
                    </span>
                    <span
                        style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: '#8A93A6',
                        }}
                    >
                        {dossier.reference}
                    </span>
                    <span style={{ color: '#C6CDD9' }}>·</span>
                    <span>
                        libellé d'audit interne, non communiqué aux tiers
                    </span>
                </div>
            </div>

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
