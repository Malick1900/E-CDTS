/*
 * Onglet « Agents consignataires » du module Utilisateurs & habilitations.
 * Écran front-only : barre de recherche + filtres de statut segmentés, puis
 * table de tous les agents (toutes sociétés). Réutilise le tiroir d'affectation
 * et les actions d'agent définis dans consignataires-tab.
 * Toutes les actions modifient l'état local (démo cliquable, aucun back).
 */
import { useMemo, useState } from 'react';
import { AffectationDrawer, AgentActions, AgentArmBadges } from './consignataires-tab';
import type { AgentActionHandlers } from './consignataires-tab';
import {
    AGENTS,
    CONSIGNATAIRES,
    STATUT_META,
    armementsByIds,
    avatarStyle,
    initials,
} from './fake-data';
import type { Agent, AgentStatut } from './fake-data';

type FiltreStatut = 'tous' | AgentStatut;

const CHIPS: { key: FiltreStatut; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'actif', label: 'Actifs' },
    { key: 'desactive', label: 'Désactivés' },
    { key: 'refuse', label: 'Refusés' },
];

export default function AgentsTab() {
    // DONNÉES FACTICES — à câbler (phase ultérieure)
    const [agents, setAgents] = useState<Agent[]>(AGENTS);

    const [search, setSearch] = useState('');
    const [filtre, setFiltre] = useState<FiltreStatut>('tous');
    const [affectAgentId, setAffectAgentId] = useState<string | null>(null);

    const consignById = useMemo(() => new Map(CONSIGNATAIRES.map((c) => [c.id, c])), []);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return agents.filter((a) => {
            const matchStatut = filtre === 'tous' || a.statut === filtre;
            const consignName = consignById.get(a.consignataireId)?.name ?? '';
            const matchSearch = q === '' || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || consignName.toLowerCase().includes(q);

            return matchStatut && matchSearch;
        });
    }, [agents, filtre, search, consignById]);

    const setAgentStatut = (agentId: string, statut: AgentStatut) => {
        setAgents((cur) => cur.map((a) => (a.id === agentId ? { ...a, statut } : a)));
    };

    const handlersFor = (agent: Agent): AgentActionHandlers => ({
        onValidate: () => setAgentStatut(agent.id, 'actif'),
        onRefuse: () => setAgentStatut(agent.id, 'refuse'),
        onToggle: () => setAgentStatut(agent.id, agent.statut === 'actif' ? 'desactive' : 'actif'),
        onReexamine: () => setAgentStatut(agent.id, 'en_attente'),
        onAffect: () => setAffectAgentId(agent.id),
    });

    const affectAgent = affectAgentId ? agents.find((a) => a.id === affectAgentId) ?? null : null;
    const affectConsign = affectAgent ? consignById.get(affectAgent.consignataireId) ?? null : null;

    const closeDrawer = () => setAffectAgentId(null);

    const saveDrawer = (ids: string[]) => {
        if (affectAgentId) {
            setAgents((cur) => cur.map((a) => (a.id === affectAgentId ? { ...a, armementIds: ids } : a)));
        }

        setAffectAgentId(null);
    };

    return (
        <>
            <div style={{ padding: '18px 26px 26px' }}>
                <div style={{ background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true"><circle cx="6" cy="6" r="4.6" stroke="#8A93A6" strokeWidth="1.5" /><path d="M9.5 9.5L13 13" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un agent…" aria-label="Rechercher un agent" style={{ width: 250, height: 34, border: '1px solid #D8DEE9', borderRadius: 6, padding: '0 12px 0 32px', fontSize: 13, color: '#1A1F2E', background: '#fff', outlineColor: '#1D3E9C' }} />
                        </div>
                        <div role="group" aria-label="Filtrer par statut" style={{ display: 'flex', gap: 2, background: '#EEF1F7', border: '1px solid #D8DEE9', borderRadius: 7, padding: 3 }}>
                            {CHIPS.map((ch) => {
                                const on = ch.key === filtre;

                                return (
                                    <button
                                        key={ch.key}
                                        onClick={() => setFiltre(ch.key)}
                                        className={on ? undefined : 'ea-chip'}
                                        aria-pressed={on}
                                        style={{ height: 26, padding: '0 11px', border: 'none', borderRadius: 5, background: on ? '#fff' : 'transparent', color: on ? '#1D3E9C' : '#5A6478', fontSize: 12, fontWeight: on ? 700 : 600, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(20,44,115,.12)' : 'none' }}
                                    >
                                        {ch.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{rows.length} agent{rows.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: 1020, borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 16px', borderBottom: '2px solid #142C73' }}>Agent</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73', width: 200 }}>Consignataire</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73' }}>Armements affectés</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73', width: 126 }}>Statut</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'right', padding: '9px 16px', borderBottom: '2px solid #142C73', width: 220 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '34px 16px', textAlign: 'center', fontSize: 13, color: '#8A93A6', borderBottom: '1px solid #E7EBF2' }}>Aucun agent ne correspond à ces critères.</td>
                                    </tr>
                                ) : rows.map((a) => {
                                    const meta = STATUT_META[a.statut];
                                    const consignName = consignById.get(a.consignataireId)?.name ?? '—';

                                    return (
                                        <tr key={a.id}>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={avatarStyle(a.statut)}>{initials(a.name)}</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}>{a.name}</span>
                                                        <span style={{ fontSize: 11, color: '#5A6478' }}>{a.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#3A4356', verticalAlign: 'middle' }}>{consignName}</td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 280 }}><AgentArmBadges ids={a.armementIds} /></div>
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><span style={meta.pill}><span style={meta.dot} />{meta.label}</span></td>
                                            <td style={{ padding: '10px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><AgentActions statut={a.statut} handlers={handlersFor(a)} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {affectAgent && affectConsign ? (
                <AffectationDrawer
                    title="Affectation aux armements"
                    subtitle={`${affectAgent.name} · ${affectConsign.name}`}
                    hint="L'agent ne pourra opérer (dossiers, manifestes, devis) que sur les armements cochés, parmi ceux représentés par sa société."
                    sectionLabel={`Armements de ${affectConsign.name}`}
                    emptyLabel="Cette société ne représente encore aucun armement."
                    candidates={armementsByIds(affectConsign.armementIds)}
                    selectedIds={affectAgent.armementIds}
                    onClose={closeDrawer}
                    onSave={saveDrawer}
                />
            ) : null}
        </>
    );
}
