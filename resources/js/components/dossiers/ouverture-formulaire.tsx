import { useForm } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { ArmementRef, NavireRef, PortAvecPostes, SensRef } from './types';
import { formatDateHeure } from './types';

/*
 * Le formulaire d'ouverture d'un dossier d'escale (WF3).
 *
 * Quatre décisions seulement : le sens, le navire, le voyage et le port. Le
 * reste du dossier — n° de manifeste, cargaison, montants — se remplit plus
 * tard, étape après étape. Un dossier s'ouvre souvent avant l'arrivée du
 * navire, parfois avant qu'il ne soit annoncé à la conférence portuaire.
 *
 * Le navire ne se saisit pas : il se choisit dans le référentiel du CGC. C'est
 * la condition du rapprochement d'ADR-0009 — deux orthographes du même navire
 * de part et d'autre et le dossier reste orphelin.
 */

type FormulaireProps = {
    /** La société du compte connecté : elle ne se choisit pas, elle se lit. */
    consignataire: string;
    navires: NavireRef[];
    armements: ArmementRef[];
    ports: PortAvecPostes[];
    sens: SensRef[];
};

const CARTE: CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #D8DEE9',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(20,44,115,.06)',
};

const CHAMP: CSSProperties = {
    height: 38,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 11px',
    fontSize: 13.5,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
    background: '#fff',
    width: '100%',
};

const SELECT: CSSProperties = {
    ...CHAMP,
    background:
        "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\") no-repeat right 11px center",
    appearance: 'none',
    WebkitAppearance: 'none',
    padding: '0 32px 0 11px',
};

const AIDE: CSSProperties = { fontSize: 11, color: '#8A93A6' };

const ORDRE_SENS = ['import', 'export'];

const ETIQUETTE_APERCU: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.06em',
    color: '#8A93A6',
    textTransform: 'uppercase',
    flex: 'none',
};

export default function OuvertureFormulaire({
    consignataire,
    navires,
    armements,
    ports,
    sens,
}: FormulaireProps) {
    const form = useForm({
        sens: '',
        navire_id: '',
        armement_id: '',
        voyage: '',
        port_id: '',
        poste_quai_id: '',
        eta_prevue: '',
    });

    const [requete, setRequete] = useState('');
    const [listeOuverte, setListeOuverte] = useState(false);
    const fermeture = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navire =
        navires.find((n) => String(n.id) === form.data.navire_id) ?? null;
    const port = ports.find((p) => String(p.id) === form.data.port_id) ?? null;
    const armement =
        armements.find((a) => String(a.id) === form.data.armement_id) ?? null;
    const poste =
        port?.postes.find((q) => String(q.id) === form.data.poste_quai_id) ??
        null;
    const sensChoisi = sens.find((s) => s.value === form.data.sens) ?? null;

    // L'import passe devant : c'est le flux dominant du port, et l'ordre de
    // l'enum suit celui du barème (export d'abord), qui n'a rien à dire ici.
    const sensAffiches = [...sens].sort(
        (a, b) => ORDRE_SENS.indexOf(a.value) - ORDRE_SENS.indexOf(b.value),
    );

    const choisirNavire = (n: NavireRef) => {
        setRequete(n.name);
        setListeOuverte(false);
        // L'armement suit le navire — le consignataire peut ensuite en désigner
        // un autre pour ce passage précis.
        form.setData((donnees) => ({
            ...donnees,
            navire_id: String(n.id),
            armement_id: n.armementId === null ? '' : String(n.armementId),
        }));
    };

    const effacerNavire = () => {
        setRequete('');
        setListeOuverte(false);
        form.setData((donnees) => ({
            ...donnees,
            navire_id: '',
            armement_id: '',
        }));
    };

    const changerPort = (valeur: string) => {
        // Changer de port vide le poste : un quai d'Owendo n'existe pas à
        // Port-Gentil.
        form.setData((donnees) => ({
            ...donnees,
            port_id: valeur,
            poste_quai_id: '',
        }));
    };

    const q = requete.trim().toLowerCase();
    const resultats =
        navire !== null || q === ''
            ? navires
            : navires.filter(
                  (n) =>
                      n.name.toLowerCase().includes(q) ||
                      (n.armement ?? '').toLowerCase().includes(q) ||
                      (n.pavillon ?? '').toLowerCase().includes(q),
              );

    const requis = [
        { label: 'Sens', ok: form.data.sens !== '' },
        { label: 'Navire', ok: form.data.navire_id !== '' },
        { label: 'N° de voyage', ok: form.data.voyage.trim() !== '' },
        { label: 'Port', ok: form.data.port_id !== '' },
    ];
    const manquants = requis.filter((r) => !r.ok).map((r) => r.label);
    const complet = manquants.length === 0;

    const etiquetteDate =
        form.data.sens === 'import'
            ? 'ETA prévisionnelle · arrivée'
            : form.data.sens === 'export'
              ? 'ETD prévisionnelle · départ'
              : 'ETA / ETD prévisionnelle';

    const verrou =
        form.data.sens === 'import'
            ? 'Transmissible une fois le navire à quai, confirmé par la situation portuaire.'
            : form.data.sens === 'export'
              ? 'Transmissible une fois le navire sorti, confirmé par la situation portuaire.'
              : 'Transmissible une fois la date à quai (import) ou de départ (export) confirmée par la situation portuaire.';

    const apercu: Array<{ label: string; valeur: string | null }> = [
        { label: 'Consignataire', valeur: consignataire },
        { label: 'Navire', valeur: navire?.name ?? null },
        {
            label: 'Armement',
            valeur: armement?.label ?? navire?.armement ?? null,
        },
        { label: 'Pavillon', valeur: navire?.pavillon ?? null },
        {
            label: 'Type',
            valeur: navire
                ? [navire.typeCode, navire.typeLabel]
                      .filter(Boolean)
                      .join(' · ')
                : null,
        },
        { label: 'N° de voyage', valeur: form.data.voyage.trim() || null },
        { label: 'Sens', valeur: sensChoisi?.label ?? null },
        {
            label: 'Port / poste',
            valeur: port
                ? poste
                    ? `${port.label} — ${poste.code}`
                    : port.label
                : null,
        },
        {
            label: form.data.sens === 'export' ? 'ETD (prév.)' : 'ETA (prév.)',
            valeur: form.data.eta_prevue
                ? formatDateHeure(form.data.eta_prevue)
                : null,
        },
    ];

    const envoyer = () => {
        if (!complet) {
            return;
        }

        form.post('/dossiers', { preserveScroll: true });
    };

    const annuler = () => {
        setRequete('');
        setListeOuverte(false);
        form.reset();
        form.clearErrors();
    };

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
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '20px 24px 28px',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) 340px',
                        gap: 20,
                        alignItems: 'start',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            minWidth: 0,
                        }}
                    >
                        {/* ── 1. Sens du dossier ── */}
                        <Section
                            rang={1}
                            titre="Sens du dossier"
                            mention="Obligatoire"
                            mentionUrgente
                        >
                            <div
                                style={{
                                    padding: '16px 16px 15px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 13,
                                }}
                            >
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {sensAffiches.map((s) => (
                                        <BoutonSens
                                            key={s.value}
                                            sens={s}
                                            actif={form.data.sens === s.value}
                                            onChoisir={() =>
                                                form.setData('sens', s.value)
                                            }
                                        />
                                    ))}
                                </div>
                                <Note ton="info">
                                    <strong style={{ fontWeight: 700 }}>
                                        Un dossier = un seul sens.
                                    </strong>{' '}
                                    Un même passage de navire qui décharge à
                                    l'import et charge à l'export nécessite{' '}
                                    <strong style={{ fontWeight: 700 }}>
                                        deux dossiers distincts
                                    </strong>
                                    , un par sens.
                                </Note>
                                {form.errors.sens ? (
                                    <Alerte>{form.errors.sens}</Alerte>
                                ) : null}
                            </div>
                        </Section>

                        {/* ── 2. Navire & voyage ── */}
                        <Section
                            rang={2}
                            titre="Navire & voyage"
                            mention="Référentiel géré par le CGC"
                        >
                            <div
                                style={{
                                    padding: '14px 16px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 14,
                                }}
                            >
                                {/* La société ne se choisit pas : elle est celle du compte. */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 11,
                                        background: '#F5F8FD',
                                        border: '1px solid #D8DEE9',
                                        borderRadius: 6,
                                        padding: '9px 12px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                        }}
                                    >
                                        <span style={ETIQUETTE_APERCU}>
                                            Consignataire (société connectée)
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 13.5,
                                                fontWeight: 700,
                                                color: '#1A1F2E',
                                            }}
                                        >
                                            {consignataire}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1 }} />
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: '#5A6478',
                                            background: '#EEF1F7',
                                            border: '1px solid #D8DEE9',
                                            borderRadius: 5,
                                            padding: '3px 9px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        Lecture seule
                                    </span>
                                </div>

                                {/* Navire — choix dans le référentiel, jamais de saisie libre. */}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    <Etiquette texte="Navire" requis />
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            value={requete}
                                            onChange={(e) => {
                                                setRequete(e.target.value);
                                                setListeOuverte(true);

                                                if (
                                                    form.data.navire_id !== ''
                                                ) {
                                                    form.setData((d) => ({
                                                        ...d,
                                                        navire_id: '',
                                                        armement_id: '',
                                                    }));
                                                }
                                            }}
                                            onFocus={() =>
                                                setListeOuverte(true)
                                            }
                                            onBlur={() => {
                                                if (fermeture.current) {
                                                    clearTimeout(
                                                        fermeture.current,
                                                    );
                                                }

                                                // Laisser le clic sur un
                                                // résultat aboutir avant que la
                                                // liste ne se referme.
                                                fermeture.current = setTimeout(
                                                    () =>
                                                        setListeOuverte(false),
                                                    150,
                                                );
                                            }}
                                            placeholder="Rechercher un navire…"
                                            aria-label="Rechercher un navire au référentiel"
                                            style={{
                                                ...CHAMP,
                                                paddingRight: 96,
                                                borderColor: navire
                                                    ? '#1D3E9C'
                                                    : '#D8DEE9',
                                                background: navire
                                                    ? '#F7FAFF'
                                                    : '#fff',
                                            }}
                                        />
                                        {navire ? (
                                            <button
                                                type="button"
                                                onClick={effacerNavire}
                                                title="Modifier le navire"
                                                aria-label="Modifier le navire"
                                                style={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    top: '50%',
                                                    transform:
                                                        'translateY(-50%)',
                                                    width: 24,
                                                    height: 24,
                                                    border: 'none',
                                                    background: '#EAF0FA',
                                                    color: '#1D3E9C',
                                                    borderRadius: 5,
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ✕
                                            </button>
                                        ) : (
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    right: 9,
                                                    top: '50%',
                                                    transform:
                                                        'translateY(-50%)',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: '#8A93A6',
                                                    background: '#F0F2F7',
                                                    border: '1px solid #E1E6EF',
                                                    borderRadius: 4,
                                                    padding: '2px 7px',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                Référentiel CGC
                                            </span>
                                        )}

                                        {listeOuverte && navire === null ? (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 4px)',
                                                    left: 0,
                                                    right: 0,
                                                    zIndex: 20,
                                                    background: '#fff',
                                                    border: '1px solid #D8DEE9',
                                                    borderRadius: 6,
                                                    boxShadow:
                                                        '0 12px 30px rgba(20,44,115,.18)',
                                                    maxHeight: 266,
                                                    overflow: 'auto',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        ...ETIQUETTE_APERCU,
                                                        padding: '7px 12px',
                                                        borderBottom:
                                                            '1px solid #F0F2F7',
                                                        background: '#FBFCFE',
                                                        position: 'sticky',
                                                        top: 0,
                                                    }}
                                                >
                                                    Référentiel navires — CGC
                                                </div>
                                                {resultats.length === 0 ? (
                                                    <div
                                                        style={{
                                                            padding:
                                                                '14px 12px',
                                                            fontSize: 12.5,
                                                            color: '#5A6478',
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        Aucun navire ne
                                                        correspond. La liste est
                                                        gérée par le CGC —
                                                        aucune saisie libre
                                                        n'est possible.
                                                    </div>
                                                ) : (
                                                    resultats.map((n) => (
                                                        <div
                                                            key={n.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            className="ea-row"
                                                            onMouseDown={() =>
                                                                choisirNavire(n)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                    'Enter'
                                                                ) {
                                                                    choisirNavire(
                                                                        n,
                                                                    );
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection:
                                                                    'column',
                                                                gap: 2,
                                                                padding:
                                                                    '8px 12px',
                                                                cursor: 'pointer',
                                                                borderBottom:
                                                                    '1px solid #F0F2F7',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    color: '#1A1F2E',
                                                                }}
                                                            >
                                                                {n.name}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: 11.5,
                                                                    color: '#5A6478',
                                                                }}
                                                            >
                                                                {[
                                                                    n.pavillon,
                                                                    n.typeCode,
                                                                    n.modeExploitation,
                                                                    n.armement,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    )}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                    <span style={AIDE}>
                                        Liste gérée par le CGC — aucune saisie
                                        libre.
                                    </span>
                                    {form.errors.navire_id ? (
                                        <Alerte>{form.errors.navire_id}</Alerte>
                                    ) : null}
                                </div>

                                {/* Attributs du navire — lecture seule. */}
                                {navire ? (
                                    <div
                                        style={{
                                            background: '#F7FAFF',
                                            border: '1px solid #D6E2F5',
                                            borderRadius: 6,
                                            padding: '11px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 26,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <Attribut
                                            label="Pavillon"
                                            valeur={navire.pavillon}
                                        />
                                        <Attribut
                                            label="Type"
                                            valeur={[
                                                navire.typeCode,
                                                navire.typeLabel,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        />
                                        <Attribut
                                            label="Exploitation"
                                            valeur={navire.modeExploitation}
                                        />
                                        <Attribut
                                            label="N° IMO"
                                            valeur={navire.imo}
                                        />
                                        <div
                                            style={{
                                                flex: 1,
                                                minWidth: 150,
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    color: '#7A88A6',
                                                    textAlign: 'right',
                                                }}
                                            >
                                                Attributs issus du référentiel
                                                CGC — lecture seule
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Armement + n° de voyage */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '14px 16px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        <Etiquette texte="Armement" />
                                        <select
                                            value={form.data.armement_id}
                                            onChange={(e) =>
                                                form.setData(
                                                    'armement_id',
                                                    e.target.value,
                                                )
                                            }
                                            aria-label="Armement représenté"
                                            style={SELECT}
                                        >
                                            <option value="">
                                                — Sélectionner l'armement —
                                            </option>
                                            {armements.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span style={AIDE}>
                                            Rempli automatiquement d'après le
                                            navire — modifiable.
                                        </span>
                                        {form.errors.armement_id ? (
                                            <Alerte>
                                                {form.errors.armement_id}
                                            </Alerte>
                                        ) : null}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        <Etiquette
                                            texte="N° de voyage"
                                            requis
                                        />
                                        <input
                                            type="text"
                                            value={form.data.voyage}
                                            onChange={(e) =>
                                                form.setData(
                                                    'voyage',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="ex. 26-114S"
                                            aria-label="Numéro de voyage"
                                            style={{
                                                ...CHAMP,
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                                textTransform: 'uppercase',
                                            }}
                                        />
                                        <span style={AIDE}>
                                            Navire + n° de voyage = clé unique
                                            de l'escale.
                                        </span>
                                        {form.errors.voyage ? (
                                            <Alerte>
                                                {form.errors.voyage}
                                            </Alerte>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Port + poste + date prévisionnelle */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '14px 16px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        <Etiquette texte="Port" requis />
                                        <select
                                            value={form.data.port_id}
                                            onChange={(e) =>
                                                changerPort(e.target.value)
                                            }
                                            aria-label="Port de l'escale"
                                            style={SELECT}
                                        >
                                            <option value="">
                                                — Sélectionner le port —
                                            </option>
                                            {ports.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span style={AIDE}>
                                            Il préfixe le numéro du dossier et
                                            ventile les statistiques.
                                        </span>
                                        {form.errors.port_id ? (
                                            <Alerte>
                                                {form.errors.port_id}
                                            </Alerte>
                                        ) : null}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                        }}
                                    >
                                        <Etiquette
                                            texte="Poste prévu"
                                            optionnel
                                        />
                                        <select
                                            value={form.data.poste_quai_id}
                                            onChange={(e) =>
                                                form.setData(
                                                    'poste_quai_id',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={port === null}
                                            aria-label="Poste à quai prévu"
                                            style={{
                                                ...SELECT,
                                                background:
                                                    port === null
                                                        ? '#F5F7FA'
                                                        : SELECT.background,
                                                color:
                                                    port === null
                                                        ? '#A6AFC0'
                                                        : '#1A1F2E',
                                            }}
                                        >
                                            <option value="">
                                                — À préciser ultérieurement —
                                            </option>
                                            {(port?.postes ?? []).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.code}
                                                </option>
                                            ))}
                                        </select>
                                        <span style={AIDE}>
                                            Confirmé ensuite par la situation
                                            portuaire.
                                        </span>
                                        {form.errors.poste_quai_id ? (
                                            <Alerte>
                                                {form.errors.poste_quai_id}
                                            </Alerte>
                                        ) : null}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        maxWidth: 340,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            color: '#3A4356',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 7,
                                        }}
                                    >
                                        {etiquetteDate}
                                        <span
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: '#B26200',
                                                background: '#FDF1E3',
                                                border: '1px solid #F0CFA0',
                                                borderRadius: 4,
                                                padding: '1px 6px',
                                            }}
                                        >
                                            Prévisionnel
                                        </span>
                                    </span>
                                    <input
                                        type="datetime-local"
                                        value={form.data.eta_prevue}
                                        onChange={(e) =>
                                            form.setData(
                                                'eta_prevue',
                                                e.target.value,
                                            )
                                        }
                                        aria-label={etiquetteDate}
                                        style={{
                                            ...CHAMP,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    />
                                    <span style={AIDE}>
                                        Annonce du consignataire. La date qui
                                        fait foi viendra de la situation
                                        portuaire.
                                    </span>
                                    {form.errors.eta_prevue ? (
                                        <Alerte>
                                            {form.errors.eta_prevue}
                                        </Alerte>
                                    ) : null}
                                </div>
                            </div>
                        </Section>

                        {/* ── 3. Ce qui vient ensuite ── */}
                        <Section rang={3} titre="Contrôle d'incohérence">
                            <div
                                style={{
                                    padding: '13px 16px 15px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                }}
                            >
                                {complet && !form.hasErrors ? (
                                    <Note ton="info">
                                        Aucune incohérence détectée pour ce
                                        navire, ce voyage et ce sens. Le dossier
                                        peut être ouvert.
                                    </Note>
                                ) : null}
                                <Note ton="neutre">
                                    Le{' '}
                                    <strong
                                        style={{
                                            fontWeight: 700,
                                            color: '#3A4356',
                                        }}
                                    >
                                        n° de manifeste
                                    </strong>{' '}
                                    et le contenu du manifeste seront renseignés
                                    à l'étape suivante (
                                    <strong
                                        style={{
                                            fontWeight: 700,
                                            color: '#3A4356',
                                        }}
                                    >
                                        Manifeste
                                    </strong>
                                    ), et non lors de l'ouverture du dossier.
                                </Note>
                            </div>
                        </Section>
                    </div>

                    {/* ── Aperçu du dossier ── */}
                    <aside style={{ position: 'sticky', top: 0 }}>
                        <div style={{ ...CARTE, overflow: 'hidden' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 15px',
                                    borderBottom: '1px solid #E7EBF2',
                                    background: '#FBFCFE',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#1A1F2E',
                                    }}
                                >
                                    Aperçu du dossier
                                </span>
                                <div style={{ flex: 1 }} />
                                <span
                                    style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: '#3A4356',
                                        background: '#EEF1F7',
                                        border: '1px solid #D8DEE9',
                                        borderRadius: 5,
                                        padding: '3px 10px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Brouillon
                                </span>
                            </div>
                            <div style={{ padding: '3px 15px 6px' }}>
                                {apercu.map((f) => (
                                    <div
                                        key={f.label}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            justifyContent: 'space-between',
                                            gap: 14,
                                            padding: '8px 0',
                                            borderBottom: '1px solid #F0F2F7',
                                        }}
                                    >
                                        <span style={ETIQUETTE_APERCU}>
                                            {f.label}
                                        </span>
                                        <span
                                            title={f.valeur ?? undefined}
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color:
                                                    f.valeur === null
                                                        ? '#B4BCC9'
                                                        : '#1A1F2E',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: 190,
                                                textAlign: 'right',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {f.valeur ?? '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div
                                style={{
                                    padding: '11px 15px',
                                    background: '#F5F8FD',
                                    borderTop: '1px solid #E7EBF2',
                                    fontSize: 11.5,
                                    lineHeight: 1.45,
                                    color: '#5A6478',
                                }}
                            >
                                {verrou}
                            </div>
                        </div>
                    </aside>
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
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '.05em',
                        color: '#8A93A6',
                        textTransform: 'uppercase',
                        flex: 'none',
                    }}
                >
                    À renseigner
                </span>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 15,
                        flexWrap: 'wrap',
                    }}
                >
                    {requis.map((r) => (
                        <span
                            key={r.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: r.ok ? '#21771F' : '#8A93A6',
                            }}
                        >
                            <span
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    flex: 'none',
                                    background: r.ok ? '#2F9E2F' : '#E4E8F0',
                                    color: r.ok ? '#fff' : '#B4BCC9',
                                    border: `1px solid ${r.ok ? '#2F9E2F' : '#D8DEE9'}`,
                                }}
                            >
                                {r.ok ? '✓' : ''}
                            </span>
                            {r.label}
                        </span>
                    ))}
                </div>
                <div style={{ flex: 1 }} />
                <span
                    style={{
                        fontSize: 12,
                        color: '#5A6478',
                        maxWidth: 300,
                        textAlign: 'right',
                        lineHeight: 1.35,
                    }}
                >
                    {complet
                        ? 'Tous les champs requis sont renseignés.'
                        : `Renseignez ${manquants.join(', ').toLowerCase()}.`}
                </span>
                <button
                    type="button"
                    onClick={annuler}
                    className="ea-btn-cancel"
                    style={{
                        height: 40,
                        padding: '0 18px',
                        border: '1px solid #C3CBDA',
                        borderRadius: 6,
                        background: '#fff',
                        color: '#3A4356',
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flex: 'none',
                    }}
                >
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={envoyer}
                    disabled={!complet || form.processing}
                    title={
                        complet
                            ? "Ouvrir le dossier d'escale"
                            : `Renseignez ${manquants.join(', ').toLowerCase()}`
                    }
                    className={complet ? 'ea-btn-primary' : undefined}
                    style={{
                        height: 40,
                        padding: '0 22px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        border: 'none',
                        cursor:
                            complet && !form.processing
                                ? 'pointer'
                                : 'not-allowed',
                        background: complet ? '#1D3E9C' : '#A8B4CE',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        flex: 'none',
                    }}
                >
                    {form.processing ? 'Ouverture…' : 'Ouvrir le dossier'}
                </button>
            </div>
        </>
    );
}

/** Une carte numérotée du formulaire. */
function Section({
    rang,
    titre,
    mention,
    mentionUrgente = false,
    children,
}: {
    rang: number;
    titre: string;
    mention?: string;
    mentionUrgente?: boolean;
    children: ReactNode;
}) {
    return (
        <section style={CARTE}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderBottom: '1px solid #E7EBF2',
                }}
            >
                <span
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#1D3E9C',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flex: 'none',
                    }}
                >
                    {rang}
                </span>
                <span
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1A1F2E',
                    }}
                >
                    {titre}
                </span>
                <div style={{ flex: 1 }} />
                {mention ? (
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: mentionUrgente ? '#C0392B' : '#8A93A6',
                        }}
                    >
                        {mention}
                    </span>
                ) : null}
            </div>
            {children}
        </section>
    );
}

/** L'un des deux sens, en grand : c'est le premier choix, et il est structurant. */
function BoutonSens({
    sens,
    actif,
    onChoisir,
}: {
    sens: SensRef;
    actif: boolean;
    onChoisir: () => void;
}) {
    const importation = sens.value === 'import';

    return (
        <button
            type="button"
            onClick={onChoisir}
            aria-pressed={actif}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 98,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 800,
                background: actif ? '#1D3E9C' : '#fff',
                color: actif ? '#fff' : '#1D3E9C',
                border: `1.5px solid ${actif ? '#1D3E9C' : '#C3CBDA'}`,
                boxShadow: actif ? '0 4px 14px rgba(29,62,156,.22)' : 'none',
            }}
        >
            <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                {importation ? (
                    <>
                        <rect x="4" y="9" width="13" height="9.5" rx="1.5" />
                        <path d="M18.5 13.7 H27.5" />
                        <path d="M24.3 10.4 L27.6 13.7 L24.3 17" />
                        <path d="M31 6 V22" />
                        <path
                            d="M4 26.5 q3 -2.2 6 0 t6 0 t6 0 t6 0"
                            strokeWidth="1.7"
                        />
                    </>
                ) : (
                    <>
                        <path d="M5 6 V22" />
                        <rect x="9" y="9" width="13" height="9.5" rx="1.5" />
                        <path d="M23.5 13.7 H31" />
                        <path d="M27.8 10.4 L31.1 13.7 L27.8 17" />
                        <path d="M20 26.5 q3 -2.2 6 0 t6 0" strokeWidth="1.7" />
                    </>
                )}
            </svg>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{sens.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.82 }}>
                {importation
                    ? 'Déchargement · vers le quai'
                    : 'Chargement · vers le large'}
            </span>
        </button>
    );
}

function Etiquette({
    texte,
    requis = false,
    optionnel = false,
}: {
    texte: string;
    requis?: boolean;
    optionnel?: boolean;
}) {
    return (
        <span
            style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#3A4356',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
            }}
        >
            {texte}
            {requis ? <span style={{ color: '#C0392B' }}>*</span> : null}
            {optionnel ? (
                <span style={{ fontWeight: 500, color: '#8A93A6' }}>
                    (optionnel)
                </span>
            ) : null}
        </span>
    );
}

/** Un attribut du navire, hérité du référentiel. */
function Attribut({ label, valeur }: { label: string; valeur: string | null }) {
    return (
        <div>
            <div style={{ ...ETIQUETTE_APERCU, marginBottom: 3 }}>{label}</div>
            <div
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: valeur ? '#1A1F2E' : '#B4BCC9',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {valeur || '—'}
            </div>
        </div>
    );
}

function Note({
    ton,
    children,
}: {
    ton: 'info' | 'neutre';
    children: ReactNode;
}) {
    const info = ton === 'info';

    return (
        <div
            style={{
                background: info ? '#E4F3FC' : '#F8FAFC',
                border: `1px solid ${info ? '#B5DFF7' : '#E7EBF2'}`,
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.5,
                color: info ? '#14509C' : '#5A6478',
            }}
        >
            {children}
        </div>
    );
}

function Alerte({ children }: { children: ReactNode }) {
    return (
        <div
            role="alert"
            style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                background: '#FBEAE7',
                border: '1px solid #E7B7AE',
                borderLeft: '3px solid #C0392B',
                borderRadius: 6,
                padding: '9px 11px',
                fontSize: 12,
                lineHeight: 1.45,
                color: '#A5342A',
            }}
        >
            {children}
        </div>
    );
}
