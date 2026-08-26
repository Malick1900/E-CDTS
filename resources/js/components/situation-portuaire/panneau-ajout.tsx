import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type {
    ConsignataireRef,
    MouvementRow,
    NavireRef,
    PortRef,
    PosteRef,
    SensRef,
    StatutRef,
} from './types';

/*
 * Panneau d'inscription d'un navire à la situation d'un port.
 *
 * Le navire vient du référentiel : la situation ne décrit pas un navire, elle
 * décrit son passage. Type, pavillon et armateur s'affichent donc en lecture
 * seule dès la sélection — ce sont ceux de la fiche navire, et deux vérités
 * pour un même navire finiraient par diverger.
 *
 * Trois contrôles vivent ici, en écho au serveur qui les refera : l'escale
 * déjà inscrite et le poste occupé bloquent l'ajout ; l'incohérence
 * statut/dates ne bloque que la publication — en conférence, on note ce qu'on
 * entend et on complète après.
 *
 * ETA et ETD portent les dates RÉELLES d'accostage et de départ, pas des
 * prévisions : les sigles sont ceux du port (CGC, 2026-08-26).
 */

type PanneauAjoutProps = {
    port: PortRef;
    navires: NavireRef[];
    postes: PosteRef[];
    consignataires: ConsignataireRef[];
    statuts: StatutRef[];
    sens: SensRef[];
    /** Les lignes déjà inscrites, pour détecter doublon et poste occupé. */
    mouvements: MouvementRow[];
    /** Statuts pendant lesquels un navire tient son poste — miroir du serveur. */
    statutsOccupants: string[];
    onFermer: () => void;
};

type Formulaire = {
    navire_id: string;
    voyage: string;
    consignataire_id: string;
    sens: string;
    poste_quai_id: string;
    eta: string;
    etd: string;
    statut: string;
};

export default function PanneauAjout({
    port,
    navires,
    postes,
    consignataires,
    statuts,
    sens,
    mouvements,
    statutsOccupants,
    onFermer,
}: PanneauAjoutProps) {
    const [form, setForm] = useState<Formulaire>({
        navire_id: '',
        voyage: '',
        consignataire_id: '',
        sens: sens[0]?.value ?? 'import',
        poste_quai_id: '',
        eta: '',
        etd: '',
        statut: statuts[0]?.value ?? 'attendu',
    });
    const [enCours, setEnCours] = useState(false);
    const [erreurs, setErreurs] = useState<Record<string, string>>({});

    const set = (champ: keyof Formulaire) => (valeur: string) =>
        setForm((f) => ({ ...f, [champ]: valeur }));

    const navire = useMemo(
        () => navires.find((n) => String(n.id) === form.navire_id) ?? null,
        [navires, form.navire_id],
    );

    // L'escale est unique : même navire, même voyage, même port.
    const doublon = useMemo(() => {
        const voyage = form.voyage.trim().toLowerCase();

        return (
            !!form.navire_id &&
            voyage !== '' &&
            mouvements.some(
                (m) =>
                    String(m.navireId) === form.navire_id &&
                    m.voyage.trim().toLowerCase() === voyage,
            )
        );
    }, [mouvements, form.navire_id, form.voyage]);

    const conflitPoste = useMemo(() => {
        if (!form.poste_quai_id || !statutsOccupants.includes(form.statut)) {
            return null;
        }

        return (
            mouvements.find(
                (m) =>
                    String(m.posteQuaiId) === form.poste_quai_id &&
                    statutsOccupants.includes(m.statut),
            ) ?? null
        );
    }, [mouvements, form.poste_quai_id, form.statut, statutsOccupants]);

    const statutCourant = statuts.find((s) => s.value === form.statut);
    const exigeEta = ['quai', 'hors_zone', 'zone'].includes(form.statut);
    const exigeEtd = form.statut === 'sorti';
    const incoherence =
        exigeEta && !form.eta ? 'eta' : exigeEtd && !form.etd ? 'etd' : null;

    const complet = !!(
        form.navire_id &&
        form.voyage.trim() &&
        form.sens &&
        form.statut
    );
    const peutAjouter = complet && !doublon && !conflitPoste && !enCours;

    const soumettre = () => {
        if (!peutAjouter) {
            return;
        }

        setEnCours(true);
        router.post(
            '/situation-portuaire',
            {
                port_id: port.id,
                navire_id: form.navire_id,
                voyage: form.voyage.trim(),
                consignataire_id: form.consignataire_id || null,
                sens: form.sens,
                statut: form.statut,
                poste_quai_id: form.poste_quai_id || null,
                eta: form.eta || null,
                etd: form.etd || null,
            },
            {
                preserveScroll: true,
                onSuccess: onFermer,
                onError: (e) => setErreurs(e as Record<string, string>),
                onFinish: () => setEnCours(false),
            },
        );
    };

    const indication = doublon
        ? 'Corrigez le doublon pour ajouter.'
        : conflitPoste
          ? 'Poste déjà occupé — changez de poste.'
          : complet
            ? 'Prêt à ajouter au brouillon de la situation.'
            : 'Navire, n° de voyage, sens et statut sont requis.';

    return (
        <>
            <div
                onClick={onFermer}
                role="presentation"
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(20,31,46,.42)',
                    zIndex: 50,
                    animation: 'ecdtsFade .18s ease',
                }}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Ajouter un navire à la situation portuaire"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 452,
                    background: '#fff',
                    zIndex: 51,
                    boxShadow: '-14px 0 40px rgba(20,44,115,.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'ecdtsPanel .22s ease',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '16px 20px',
                        borderBottom: '1px solid #E7EBF2',
                        flex: 'none',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        <h3
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 800,
                                color: '#1A1F2E',
                            }}
                        >
                            Ajouter un navire
                        </h3>
                        <span style={{ fontSize: 11.5, color: '#5A6478' }}>
                            Situation de {port.label}
                        </span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={onFermer}
                        title="Fermer"
                        aria-label="Fermer le panneau"
                        className="ea-close"
                        style={{
                            width: 30,
                            height: 30,
                            border: 'none',
                            background: '#F0F2F7',
                            color: '#5A6478',
                            borderRadius: 6,
                            fontSize: 16,
                            cursor: 'pointer',
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflow: 'auto',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 13,
                    }}
                >
                    <div style={grille}>
                        <div style={{ ...champ, gridColumn: '1 / -1' }}>
                            <Etiquette texte="Navire" requis />
                            <select
                                value={form.navire_id}
                                onChange={(e) =>
                                    set('navire_id')(e.target.value)
                                }
                                aria-label="Navire"
                                style={styleSelect(doublon)}
                            >
                                <option value="">
                                    — Sélectionner au référentiel —
                                </option>
                                {navires.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
                            <span style={aide}>
                                Seuls les navires du référentiel CGC peuvent
                                être inscrits.
                            </span>
                        </div>

                        {/* La fiche du navire, en lecture : elle vit au
                            référentiel, la situation ne la redit pas. */}
                        <div style={{ ...champ, gridColumn: '1 / -1' }}>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 10,
                                    background: '#F8FAFE',
                                    border: '1px solid #E2E9F5',
                                    borderRadius: 7,
                                    padding: '10px 12px',
                                }}
                            >
                                <Lecture
                                    titre="Type"
                                    valeur={navire?.typeLabel ?? null}
                                />
                                <Lecture
                                    titre="Pavillon"
                                    valeur={navire?.pavillon ?? null}
                                />
                                <Lecture
                                    titre="Armateur"
                                    valeur={navire?.armateur ?? null}
                                />
                            </div>
                        </div>

                        <div style={{ ...champ, gridColumn: '1 / -1' }}>
                            <Etiquette texte="N° de voyage" requis />
                            <input
                                type="text"
                                value={form.voyage}
                                onChange={(e) => set('voyage')(e.target.value)}
                                placeholder="ex. 26-114S"
                                aria-label="Numéro de voyage"
                                style={styleInput(doublon)}
                            />
                        </div>
                    </div>

                    {doublon ? (
                        <Alerte ton="erreur">
                            Ce navire est déjà inscrit à la situation de ce port
                            pour le voyage{' '}
                            <strong style={{ fontWeight: 700 }}>
                                {form.voyage}
                            </strong>
                            . L'escale doit être unique.
                        </Alerte>
                    ) : null}

                    <div style={{ ...champ, gridColumn: '1 / -1' }}>
                        <Etiquette texte="Consignataire responsable" />
                        <select
                            value={form.consignataire_id}
                            onChange={(e) =>
                                set('consignataire_id')(e.target.value)
                            }
                            aria-label="Consignataire responsable"
                            style={styleSelect(false)}
                        >
                            <option value="">— Sélectionner —</option>
                            {consignataires.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <span style={aide}>
                            Information descriptive — n'attribue aucun droit
                            d'édition.
                        </span>
                    </div>

                    <div
                        style={{
                            height: 1,
                            background: '#E7EBF2',
                            margin: '2px 0',
                        }}
                    />

                    <div style={champ}>
                        <Etiquette texte="Sens" requis />
                        <div style={{ display: 'flex', gap: 8 }}>
                            {sens.map((s) => {
                                const actif = form.sens === s.value;

                                return (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => set('sens')(s.value)}
                                        aria-pressed={actif}
                                        style={{
                                            flex: 1,
                                            height: 38,
                                            borderRadius: 7,
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            background: actif
                                                ? '#1D3E9C'
                                                : '#fff',
                                            color: actif ? '#fff' : '#1D3E9C',
                                            border: `1.5px solid ${actif ? '#1D3E9C' : '#C3CBDA'}`,
                                        }}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={champ}>
                        <Etiquette texte="Poste à quai" />
                        <select
                            value={form.poste_quai_id}
                            onChange={(e) =>
                                set('poste_quai_id')(e.target.value)
                            }
                            aria-label="Poste à quai"
                            style={styleSelect(!!conflitPoste)}
                        >
                            <option value="">— À affecter —</option>
                            {postes.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {conflitPoste ? (
                        <Alerte ton="erreur">
                            Poste déjà occupé par{' '}
                            <strong style={{ fontWeight: 700 }}>
                                {conflitPoste.navire}
                            </strong>{' '}
                            (voyage {conflitPoste.voyage}). Un seul navire par
                            poste.
                        </Alerte>
                    ) : null}

                    <div style={grille}>
                        <div style={champ}>
                            <Etiquette texte="ETA (accostage)" />
                            <input
                                type="datetime-local"
                                value={form.eta}
                                onChange={(e) => set('eta')(e.target.value)}
                                aria-label="ETA"
                                style={styleInput(incoherence === 'eta')}
                            />
                        </div>
                        <div style={champ}>
                            <Etiquette texte="ETD (départ)" />
                            <input
                                type="datetime-local"
                                value={form.etd}
                                onChange={(e) => set('etd')(e.target.value)}
                                aria-label="ETD"
                                style={styleInput(incoherence === 'etd')}
                            />
                        </div>
                        <div style={{ ...champ, gridColumn: '1 / -1' }}>
                            <Etiquette texte="Statut" requis />
                            <select
                                value={form.statut}
                                onChange={(e) => set('statut')(e.target.value)}
                                aria-label="Statut"
                                style={styleSelect(false)}
                            >
                                {statuts.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {incoherence ? (
                        <Alerte ton="avertissement">
                            {incoherence === 'eta'
                                ? `Le statut « ${statutCourant?.label ?? ''} » requiert une date d'accostage (ETA).`
                                : 'Le statut « Sorti » requiert une date de sortie (ETD).'}{' '}
                            Non bloquant à la saisie,{' '}
                            <strong style={{ fontWeight: 700 }}>
                                bloquant à la publication
                            </strong>
                            .
                        </Alerte>
                    ) : null}

                    {Object.keys(erreurs).length > 0 ? (
                        <Alerte ton="erreur">
                            {Object.values(erreurs).join(' ')}
                        </Alerte>
                    ) : null}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '14px 20px',
                        borderTop: '1px solid #E7EBF2',
                        flex: 'none',
                        background: '#FBFCFE',
                    }}
                >
                    <span
                        style={{
                            fontSize: 11.5,
                            color: '#8A93A6',
                            lineHeight: 1.35,
                            flex: 1,
                        }}
                    >
                        {indication}
                    </span>
                    <button
                        type="button"
                        onClick={onFermer}
                        className="ea-btn-cancel"
                        style={{
                            height: 38,
                            padding: '0 16px',
                            border: '1px solid #C3CBDA',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#3A4356',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={soumettre}
                        disabled={!peutAjouter}
                        style={{
                            height: 38,
                            padding: '0 18px',
                            borderRadius: 6,
                            border: 'none',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: peutAjouter ? 'pointer' : 'not-allowed',
                            background: peutAjouter ? '#1D3E9C' : '#A8B4CE',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Ajouter à la situation
                    </button>
                </div>
            </div>
        </>
    );
}

const grille = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 14px',
} as const;

const champ = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
} as const;

const aide = { fontSize: 11, color: '#8A93A6' } as const;

const styleInput = (erreur: boolean) =>
    ({
        height: 36,
        border: `1px solid ${erreur ? '#C0392B' : '#D8DEE9'}`,
        borderRadius: 6,
        padding: '0 10px',
        fontSize: 13,
        color: '#1A1F2E',
        outlineColor: '#1D3E9C',
        background: erreur ? '#FEF7F6' : '#fff',
        fontVariantNumeric: 'tabular-nums',
    }) as const;

const styleSelect = (erreur: boolean) =>
    ({
        height: 36,
        border: `1px solid ${erreur ? '#C0392B' : '#D8DEE9'}`,
        borderRadius: 6,
        background: `${erreur ? '#FEF7F6' : '#fff'} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center`,
        appearance: 'none' as const,
        WebkitAppearance: 'none' as const,
        padding: '0 30px 0 10px',
        fontSize: 13,
        color: '#1A1F2E',
        outlineColor: '#1D3E9C',
    }) as const;

function Etiquette({
    texte,
    requis = false,
}: {
    texte: string;
    requis?: boolean;
}) {
    return (
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3A4356' }}>
            {texte}{' '}
            {requis ? <span style={{ color: '#C0392B' }}>*</span> : null}
        </span>
    );
}

function Lecture({ titre, valeur }: { titre: string; valeur: string | null }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 0,
            }}
        >
            <span
                style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    color: '#8A93A6',
                    textTransform: 'uppercase',
                }}
            >
                {titre}
            </span>
            <span
                title={valeur ?? undefined}
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: valeur ? '#1A1F2E' : '#B4BCC9',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {valeur ?? '—'}
            </span>
        </div>
    );
}

function Alerte({
    ton,
    children,
}: {
    ton: 'erreur' | 'avertissement';
    children: React.ReactNode;
}) {
    const erreur = ton === 'erreur';

    return (
        <div
            role="alert"
            style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                background: erreur ? '#FBEAE7' : '#FDF1E3',
                border: `1px solid ${erreur ? '#E7B7AE' : '#F0CFA0'}`,
                borderLeft: `3px solid ${erreur ? '#C0392B' : '#E07B00'}`,
                borderRadius: 6,
                padding: '9px 11px',
            }}
        >
            <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flex: 'none', marginTop: 1 }}
                aria-hidden="true"
            >
                {erreur ? (
                    <>
                        <circle
                            cx="8"
                            cy="8"
                            r="7"
                            stroke="#C0392B"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M8 4.6v4.2"
                            stroke="#C0392B"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                        />
                        <circle cx="8" cy="11.3" r="0.9" fill="#C0392B" />
                    </>
                ) : (
                    <>
                        <path
                            d="M8 2 L15 14 H1 Z"
                            stroke="#B26200"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M8 6.5v3.2"
                            stroke="#B26200"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <circle cx="8" cy="11.6" r="0.9" fill="#B26200" />
                    </>
                )}
            </svg>
            <span
                style={{
                    fontSize: 12,
                    color: erreur ? '#96271C' : '#8A6636',
                    lineHeight: 1.45,
                }}
            >
                {children}
            </span>
        </div>
    );
}
