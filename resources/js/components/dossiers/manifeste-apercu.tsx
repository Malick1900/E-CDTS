import type { CSSProperties } from 'react';
import type { ApercuManifeste } from '@/components/dossiers/types';
import { formatOctets } from '@/components/dossiers/types';

/*
 * L'aperçu d'un manifeste XML — ce que le fichier annonce, avant écriture.
 *
 * L'écran répond à une seule question : **est-ce bien le manifeste de ce
 * dossier ?** D'où l'ordre de lecture. Le verdict d'abord, parce qu'il décide.
 * Le segment général ensuite — voyage, navire, identité, dates —, parce que
 * c'est là que se lit ce que le verdict a comparé. Les comptes en dernier :
 * ils disent le volume de travail, pas la conformité.
 *
 * **Un champ absent s'affiche « non renseigné ».** Chaque transporteur émet un
 * profil appauvri à sa façon ; taire un manque le ferait passer pour une
 * donnée, et le consignataire ne saurait pas ce qu'il approuve.
 *
 * Rien n'est enregistré tant que le bouton n'est pas cliqué : le fichier est
 * resté dans le navigateur.
 */

type ManifesteApercuProps = {
    apercu: ApercuManifeste;
    /** Déposer un autre fichier — l'aperçu courant est abandonné. */
    onRecommencer: () => void;
    /** Confirmer : le fichier repart, cette fois pour être écrit. */
    onImporter: () => void;
};

const nombres = new Intl.NumberFormat('fr-FR');
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

const CARTE: CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E0E5EE',
    borderRadius: 10,
    overflow: 'hidden',
};

const SECTION: CSSProperties = {
    padding: '15px 18px',
    borderTop: '1px solid #EDF0F5',
};

const INTITULE: CSSProperties = {
    margin: '0 0 12px',
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    color: '#8A93A6',
};

const GRILLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))',
    gap: '14px 18px',
};

const ENCART = (teinte: 'reserve' | 'info'): CSSProperties => ({
    display: 'flex',
    gap: 9,
    alignItems: 'flex-start',
    background: teinte === 'reserve' ? '#FDF5E6' : '#F0F5FE',
    border: `1px solid ${teinte === 'reserve' ? '#EDD6A8' : '#CFDCF6'}`,
    borderRadius: 7,
    padding: '11px 13px',
});

const BOUTON_CLAIR: CSSProperties = {
    height: 38,
    padding: '0 20px',
    border: '1px solid #C3D0F0',
    borderRadius: 7,
    background: '#FFFFFF',
    color: '#1D3E9C',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
};

const BOUTON_PLEIN: CSSProperties = {
    height: 38,
    padding: '0 22px',
    border: 'none',
    borderRadius: 7,
    background: '#1D3E9C',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
};

const LEGENDE: CSSProperties = {
    display: 'block',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: '#8A93A6',
    marginBottom: 3,
};

/** Un champ du segment général. Le manque se dit, il ne se masque pas. */
function Champ({
    intitule,
    valeur,
}: {
    intitule: string;
    valeur: string | null;
}) {
    const absent = valeur === null || valeur === '';

    return (
        <div>
            <span style={LEGENDE}>{intitule}</span>
            <span
                style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: absent ? 400 : 700,
                    fontStyle: absent ? 'italic' : 'normal',
                    color: absent ? '#98A1B2' : '#1A1F2E',
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                }}
            >
                {absent ? 'non renseigné' : valeur}
            </span>
        </div>
    );
}

/** Un compteur de la bande des totaux. */
function Compte({ intitule, valeur }: { intitule: string; valeur: string }) {
    return (
        <div>
            <span style={LEGENDE}>{intitule}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1A1F2E' }}>
                {valeur}
            </span>
        </div>
    );
}

/** « 20/08/2026 » — la date du fichier, écrite comme le port l'écrit. */
function jour(iso: string | null): string | null {
    if (iso === null) {
        return null;
    }

    const [annee, mois, quantieme] = iso.slice(0, 10).split('-');

    return quantieme === undefined ? iso : `${quantieme}/${mois}/${annee}`;
}

/** « GAOWE · 20/08/2026 » — un mouvement tient en un lieu et une date. */
function mouvement(port: string | null, date: string | null): string | null {
    const lus = [port, jour(date)].filter((p): p is string => p !== null);

    return lus.length === 0 ? null : lus.join(' · ');
}

export default function ManifesteApercu({
    apercu,
    onRecommencer,
    onImporter,
}: ManifesteApercuProps) {
    const { enTete, contenu, reserves } = apercu;
    const conforme = reserves.length === 0;
    const pluriel = contenu.bls > 1;
    const plusieursAQualifier = contenu.aQualifier > 1;

    return (
        <div style={{ padding: '22px 22px 26px', overflow: 'auto' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
                <div style={CARTE}>
                    {/* ── Le fichier, et le verdict qui décide ─────────── */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 13,
                            padding: '15px 18px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <svg
                            width="26"
                            height="26"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            style={{ flex: 'none' }}
                        >
                            <path
                                d="M13.5 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8z"
                                stroke="#1D3E9C"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M13.5 3v5h5"
                                stroke="#1D3E9C"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                            />
                        </svg>

                        <span style={{ minWidth: 0 }}>
                            <span
                                style={{
                                    display: 'block',
                                    fontSize: 14.5,
                                    fontWeight: 800,
                                    color: '#1A1F2E',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {apercu.fichier.nom ?? 'Manifeste XML'}
                            </span>
                            <span
                                style={{
                                    display: 'block',
                                    fontSize: 12,
                                    color: '#5A6478',
                                    marginTop: 2,
                                }}
                            >
                                Fichier XML SYDONIA ·{' '}
                                {formatOctets(apercu.fichier.octets)} ·{' '}
                                {nombres.format(contenu.bls)}{' '}
                                {pluriel
                                    ? 'connaissements détectés'
                                    : 'connaissement détecté'}
                            </span>
                        </span>

                        <span
                            style={{
                                marginLeft: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '5px 12px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                color: conforme ? '#166534' : '#8A5300',
                                background: conforme ? '#EAF7EE' : '#FDF5E6',
                                border: `1px solid ${conforme ? '#BFE3C8' : '#EDD6A8'}`,
                            }}
                        >
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: conforme
                                        ? '#2E9E52'
                                        : '#C88A1E',
                                }}
                            />
                            {conforme
                                ? 'Cohérent avec le dossier'
                                : 'Cohérent, sous réserve'}
                        </span>
                    </div>

                    {/* ── Le segment général ───────────────────────────── */}
                    <div style={{ ...SECTION, background: '#FBFCFE' }}>
                        <p style={INTITULE}>Segment général du manifeste</p>

                        <div style={GRILLE}>
                            <Champ
                                intitule="N° de voyage"
                                valeur={enTete.voyage}
                            />
                            <Champ intitule="Navire" valeur={enTete.navire} />
                            <Champ
                                intitule="Pavillon"
                                valeur={enTete.pavillon}
                            />
                            <Champ
                                intitule="Immatriculation"
                                valeur={enTete.immatriculation}
                            />
                            {/* L'agent maritime quand le profil le nomme, le
                                transporteur sinon : c'est la même société vue
                                de deux balises. */}
                            <Champ
                                intitule="Émetteur"
                                valeur={enTete.agent ?? enTete.transporteur}
                            />
                            <Champ
                                intitule="Bureau de douane"
                                valeur={enTete.bureau}
                            />
                            <Champ
                                intitule="Départ"
                                valeur={mouvement(
                                    enTete.portDepart,
                                    enTete.dateDepart,
                                )}
                            />
                            <Champ
                                intitule="Arrivée"
                                valeur={mouvement(
                                    enTete.portDestination,
                                    enTete.dateArrivee,
                                )}
                            />
                        </div>
                    </div>

                    {/* ── Les comptes ─────────────────────────────────── */}
                    <div style={SECTION}>
                        <p style={INTITULE}>Ce que le fichier contient</p>

                        <div style={GRILLE}>
                            <Compte
                                intitule="Connaissements"
                                valeur={nombres.format(contenu.bls)}
                            />
                            <Compte
                                intitule="Tonnage"
                                valeur={`${decimal.format(contenu.poidsKg / 1000)} t`}
                            />
                            <Compte
                                intitule="Volume"
                                valeur={`${decimal.format(contenu.volumeM3)} m³`}
                            />
                            <Compte
                                intitule="Conteneurs"
                                valeur={`${nombres.format(contenu.conteneurs)} TC`}
                            />
                        </div>
                    </div>

                    {/* ── Ce qui a été relevé sans fermer la porte ─────── */}
                    {reserves.length > 0 ? (
                        <div style={SECTION}>
                            <div style={ENCART('reserve')}>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    style={{ flex: 'none', marginTop: 1 }}
                                >
                                    <path
                                        d="M8 2.2 15 14H1z"
                                        stroke="#8A5300"
                                        strokeWidth="1.4"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M8 6.4v3.1"
                                        stroke="#8A5300"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                    />
                                    <circle
                                        cx="8"
                                        cy="11.6"
                                        r=".9"
                                        fill="#8A5300"
                                    />
                                </svg>
                                <span
                                    style={{
                                        fontSize: 12.5,
                                        color: '#8A5300',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    <strong>
                                        {reserves.length > 1
                                            ? 'Écarts relevés'
                                            : 'Écart relevé'}{' '}
                                        — l'import reste possible.
                                    </strong>
                                    <ul
                                        style={{
                                            margin: '5px 0 0',
                                            paddingLeft: 17,
                                        }}
                                    >
                                        {reserves.map((reserve) => (
                                            <li key={reserve}>{reserve}</li>
                                        ))}
                                    </ul>
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {/* ── Le travail qui restera après l'import ────────── */}
                    {contenu.aQualifier > 0 ? (
                        <div style={SECTION}>
                            <div style={ENCART('info')}>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    style={{ flex: 'none', marginTop: 1 }}
                                >
                                    <circle
                                        cx="8"
                                        cy="8"
                                        r="7"
                                        stroke="#1D3E9C"
                                        strokeWidth="1.4"
                                    />
                                    <path
                                        d="M8 7v4"
                                        stroke="#1D3E9C"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                    />
                                    <circle
                                        cx="8"
                                        cy="4.6"
                                        r="1"
                                        fill="#1D3E9C"
                                    />
                                </svg>
                                <span
                                    style={{
                                        fontSize: 12.5,
                                        color: '#26386B',
                                        lineHeight: 1.55,
                                    }}
                                >
                                    <strong>
                                        {nombres.format(contenu.aQualifier)}{' '}
                                        {plusieursAQualifier
                                            ? 'lignes resteront'
                                            : 'ligne restera'}{' '}
                                        à qualifier
                                    </strong>{' '}
                                    après l'import :{' '}
                                    {plusieursAQualifier
                                        ? 'le fichier ne dit pas ce qu’elles transportent'
                                        : 'le fichier ne dit pas ce qu’elle transporte'}
                                    , et rien n'est deviné.
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {/* ── Le geste ────────────────────────────────────── */}
                    <div
                        style={{
                            ...SECTION,
                            display: 'flex',
                            gap: 10,
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onRecommencer}
                            style={BOUTON_CLAIR}
                        >
                            Choisir un autre fichier
                        </button>
                        <button
                            type="button"
                            onClick={onImporter}
                            style={BOUTON_PLEIN}
                        >
                            Importer {nombres.format(contenu.bls)}{' '}
                            {pluriel ? 'connaissements' : 'connaissement'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
