/*
 * Onglet « Agents consignataires » du module Utilisateurs & habilitations.
 *
 * Écran de décision, pas de saisie : la société crée ses agents depuis son
 * portail, le CGC valide, refuse, réexamine, suspend et fixe la portée
 * (ADR-0013). Rien ne se supprime — un compte refusé reste la trace opposable
 * de la décision (ADR-0024).
 */
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/components/admin/confirm-dialog';
import type { ConfirmEtat } from '@/components/admin/confirm-dialog';
import { BandeauInfo } from '@/components/admin/ui';
import {
    AgentActions,
    AgentArmBadges,
    avatarStyle,
    initials,
    RefusDialog,
    STATUT_META,
} from './agents-ui';
import type { AgentActionHandlers } from './agents-ui';
import type { AgentRow, AgentStatut } from './types';

type FiltreStatut = 'tous' | AgentStatut;

const CHIPS: { key: FiltreStatut; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'actif', label: 'Actifs' },
    { key: 'desactive', label: 'Désactivés' },
    { key: 'refuse', label: 'Refusés' },
];

const BASE = '/admin/utilisateurs/agents';

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

export default function AgentsTab({
    agents,
    peutGerer,
    rechercheInitiale = '',
}: {
    agents: AgentRow[];
    peutGerer: boolean;
    rechercheInitiale?: string;
}) {
    // Pré-remplie quand on arrive depuis la fiche d'une société : « traiter les
    // comptes en attente » doit atterrir sur ses comptes, pas sur la liste
    // entière (la recherche filtre déjà sur le nom de la société).
    const [search, setSearch] = useState(rechercheInitiale);
    const [filtre, setFiltre] = useState<FiltreStatut>('tous');
    const [enCours, setEnCours] = useState(false);

    const [refusId, setRefusId] = useState<number | null>(null);
    const [erreurRefus, setErreurRefus] = useState<string | undefined>(
        undefined,
    );
    const [confirm, setConfirm] = useState<ConfirmEtat | null>(null);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return agents.filter((a) => {
            const matchStatut = filtre === 'tous' || a.statut === filtre;
            const matchSearch =
                q === '' ||
                a.name.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                (a.consignataire_name ?? '').toLowerCase().includes(q);

            return matchStatut && matchSearch;
        });
    }, [agents, filtre, search]);

    /** Toutes les décisions passent par le même PATCH ; seule l'URL change. */
    const decider = (
        agent: AgentRow,
        action: string,
        donnees: Record<string, string | number[]> = {},
        onOk?: () => void,
    ) => {
        router.patch(`${BASE}/${agent.id}/${action}`, donnees, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setEnCours(true),
            onFinish: () => setEnCours(false),
            onSuccess: () => onOk?.(),
            onError: (e: Record<string, string>) =>
                setErreurRefus(e.motif_refus ?? e.statut_validation),
        });
    };

    const handlersFor = (agent: AgentRow): AgentActionHandlers => ({
        onValidate: () => decider(agent, 'validation'),
        onRefuse: () => {
            setErreurRefus(undefined);
            setRefusId(agent.id);
        },
        onReexamine: () => decider(agent, 'reexamen'),
        onToggle: () => {
            const desactivation = agent.statut === 'actif';

            setConfirm({
                titre: desactivation
                    ? 'Désactiver ce compte agent ?'
                    : 'Réactiver ce compte agent ?',
                corps: desactivation
                    ? "L'agent ne pourra plus se connecter ni déclarer. Ses dossiers et ses affectations restent intacts."
                    : "L'agent retrouve l'accès au portail, avec les armements qui lui sont affectés.",
                libelle: desactivation ? 'Désactiver' : 'Réactiver',
                statLabel: 'Agent',
                statValue: `${agent.name} · ${agent.consignataire_name ?? '—'}`,
                danger: desactivation,
                onOk: () => {
                    setConfirm(null);
                    decider(agent, 'activation');
                },
            });
        },
    });

    const refusAgent =
        refusId === null
            ? null
            : (agents.find((a) => a.id === refusId) ?? null);

    return (
        <>
            {!peutGerer && (
                <div style={{ padding: '18px 26px 0' }}>
                    <BandeauInfo titre="Consultation seule">
                        Valider ou refuser un compte agent engage le CGC
                        vis-à-vis d’une société : la décision relève de
                        l’Administrateur (ADR-0013). Vous pouvez consulter les
                        demandes et leur suivi, sans y statuer.
                    </BandeauInfo>
                </div>
            )}

            <div style={{ padding: '18px 26px 26px' }}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #D8DEE9',
                        borderRadius: 8,
                        boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderBottom: '1px solid #E7EBF2',
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
                                style={{
                                    position: 'absolute',
                                    left: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                aria-hidden="true"
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
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher un agent…"
                                aria-label="Rechercher un agent"
                                style={{
                                    width: 250,
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
                        <div
                            role="group"
                            aria-label="Filtrer par statut"
                            style={{
                                display: 'flex',
                                gap: 2,
                                background: '#EEF1F7',
                                border: '1px solid #D8DEE9',
                                borderRadius: 7,
                                padding: 3,
                            }}
                        >
                            {CHIPS.map((ch) => {
                                const on = ch.key === filtre;

                                return (
                                    <button
                                        key={ch.key}
                                        onClick={() => setFiltre(ch.key)}
                                        className={on ? undefined : 'ea-chip'}
                                        aria-pressed={on}
                                        style={{
                                            height: 26,
                                            padding: '0 11px',
                                            border: 'none',
                                            borderRadius: 5,
                                            background: on
                                                ? '#fff'
                                                : 'transparent',
                                            color: on ? '#1D3E9C' : '#5A6478',
                                            fontSize: 12,
                                            fontWeight: on ? 700 : 600,
                                            cursor: 'pointer',
                                            boxShadow: on
                                                ? '0 1px 2px rgba(20,44,115,.12)'
                                                : 'none',
                                        }}
                                    >
                                        {ch.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ flex: 1 }} />
                        <span
                            style={{
                                fontSize: 12,
                                color: '#8A93A6',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {rows.length} agent{rows.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                minWidth: 1020,
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                            }}
                        >
                            <thead>
                                <tr>
                                    <th
                                        style={{
                                            background: '#1D3E9C',
                                            color: '#fff',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            letterSpacing: '.05em',
                                            textTransform: 'uppercase',
                                            textAlign: 'left',
                                            padding: '9px 16px',
                                            borderBottom: '2px solid #142C73',
                                        }}
                                    >
                                        Agent
                                    </th>
                                    <th
                                        style={{
                                            background: '#1D3E9C',
                                            color: '#fff',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            letterSpacing: '.05em',
                                            textTransform: 'uppercase',
                                            textAlign: 'left',
                                            padding: '9px 12px',
                                            borderBottom: '2px solid #142C73',
                                            width: 200,
                                        }}
                                    >
                                        Consignataire
                                    </th>
                                    <th
                                        style={{
                                            background: '#1D3E9C',
                                            color: '#fff',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            letterSpacing: '.05em',
                                            textTransform: 'uppercase',
                                            textAlign: 'left',
                                            padding: '9px 12px',
                                            borderBottom: '2px solid #142C73',
                                        }}
                                    >
                                        Armements affectés
                                    </th>
                                    <th
                                        style={{
                                            background: '#1D3E9C',
                                            color: '#fff',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            letterSpacing: '.05em',
                                            textTransform: 'uppercase',
                                            textAlign: 'left',
                                            padding: '9px 12px',
                                            borderBottom: '2px solid #142C73',
                                            width: 126,
                                        }}
                                    >
                                        Statut
                                    </th>
                                    {peutGerer && (
                                        <th
                                            style={{
                                                background: '#1D3E9C',
                                                color: '#fff',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                letterSpacing: '.05em',
                                                textTransform: 'uppercase',
                                                textAlign: 'right',
                                                padding: '9px 16px',
                                                borderBottom:
                                                    '2px solid #142C73',
                                                width: 220,
                                            }}
                                        >
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            style={{
                                                padding: '34px 16px',
                                                textAlign: 'center',
                                                fontSize: 13,
                                                color: '#8A93A6',
                                                borderBottom:
                                                    '1px solid #E7EBF2',
                                            }}
                                        >
                                            Aucun agent ne correspond à ces
                                            critères.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((a) => {
                                        const meta = STATUT_META[a.statut];

                                        return (
                                            <tr key={a.id}>
                                                <td
                                                    style={{
                                                        padding: '10px 16px',
                                                        borderBottom:
                                                            '1px solid #E7EBF2',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <div
                                                            style={avatarStyle(
                                                                a.statut,
                                                            )}
                                                        >
                                                            {initials(a.name)}
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection:
                                                                    'column',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    gap: 7,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 13,
                                                                        fontWeight: 700,
                                                                        color: '#1A1F2E',
                                                                    }}
                                                                >
                                                                    {a.name}
                                                                </span>
                                                                {a.est_titulaire ? (
                                                                    <span
                                                                        title="Titulaire du compte de la société : il gère les comptes de ses agents"
                                                                        style={{
                                                                            fontSize: 10,
                                                                            fontWeight: 800,
                                                                            letterSpacing:
                                                                                '.03em',
                                                                            textTransform:
                                                                                'uppercase',
                                                                            color: '#1D3E9C',
                                                                            background:
                                                                                '#EEF3FF',
                                                                            border: '1px solid #C3D0F0',
                                                                            borderRadius: 4,
                                                                            padding:
                                                                                '1px 6px',
                                                                        }}
                                                                    >
                                                                        Titulaire
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: '#5A6478',
                                                                }}
                                                            >
                                                                {a.email}
                                                            </span>
                                                            <Trace agent={a} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderBottom:
                                                            '1px solid #E7EBF2',
                                                        fontSize: 12.5,
                                                        color: '#3A4356',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    {a.consignataire_name ??
                                                        '—'}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderBottom:
                                                            '1px solid #E7EBF2',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 5,
                                                            maxWidth: 280,
                                                        }}
                                                    >
                                                        <AgentArmBadges
                                                            armements={
                                                                a.armements
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderBottom:
                                                            '1px solid #E7EBF2',
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <span style={meta.pill}>
                                                        <span
                                                            style={meta.dot}
                                                        />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                {peutGerer && (
                                                    <td
                                                        style={{
                                                            padding:
                                                                '10px 16px',
                                                            borderBottom:
                                                                '1px solid #E7EBF2',
                                                            verticalAlign:
                                                                'middle',
                                                        }}
                                                    >
                                                        <AgentActions
                                                            statut={a.statut}
                                                            handlers={handlersFor(
                                                                a,
                                                            )}
                                                        />
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {refusAgent ? (
                <RefusDialog
                    agent={refusAgent.name}
                    societe={refusAgent.consignataire_name ?? '—'}
                    erreur={erreurRefus}
                    enCours={enCours}
                    onClose={() => setRefusId(null)}
                    onConfirm={(motif) =>
                        decider(
                            refusAgent,
                            'refus',
                            { motif_refus: motif },
                            () => setRefusId(null),
                        )
                    }
                />
            ) : null}

            <ConfirmDialog etat={confirm} onFermer={() => setConfirm(null)} />
        </>
    );
}

/**
 * Trace de la dernière décision du CGC (ADR-0024). Affichée sur les comptes
 * refusés, où elle porte l'information utile — qui a tranché, quand, et ce que
 * la société doit corriger avant de soumettre à nouveau.
 */
function Trace({ agent }: { agent: AgentRow }) {
    if (agent.statut !== 'refuse' || agent.decide_le === null) {
        return null;
    }

    const le = DATE_COURTE.format(new Date(agent.decide_le));
    const par = agent.decide_par ?? 'le CGC';

    return (
        <span
            title={agent.motif_refus ?? undefined}
            style={{
                fontSize: 11,
                color: '#96271C',
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            Refusé par {par} le {le}
            {agent.motif_refus ? ` — ${agent.motif_refus}` : ''}
        </span>
    );
}
