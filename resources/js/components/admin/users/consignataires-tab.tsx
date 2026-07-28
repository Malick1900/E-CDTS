/*
 * Onglet « Consignataires » du module Utilisateurs & habilitations.
 * Écran front-only : liste des sociétés consignataires puis vue détail
 * (en-tête société, armements représentés en N-N, comptes agents avec actions).
 * Le tiroir d'affectation agent ↔ armements est partagé avec l'onglet Agents.
 * Toutes les actions modifient l'état local (démo cliquable, aucun back).
 */
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
    AGENTS,
    ARMEMENTS,
    CONSIGNATAIRES,
    STATUT_META,
    armementsByIds,
    avatarStyle,
    initials,
} from './fake-data';
import type { Agent, Armement, Consignataire } from './fake-data';

/* ══════════ Tiroir partagé : affectation aux armements ══════════ */

type AffectationDrawerProps = {
    title: string;
    subtitle: string;
    hint: string;
    sectionLabel: string;
    emptyLabel: string;
    /** Armements proposés à la sélection. */
    candidates: Armement[];
    /** Identifiants cochés à l'ouverture. */
    selectedIds: string[];
    onClose: () => void;
    onSave: (ids: string[]) => void;
};

const OVERLAY_STYLE: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(20,31,46,.42)', zIndex: 52, animation: 'ecdtsFade .18s ease' };
const PANEL_STYLE: CSSProperties = { position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, background: '#fff', zIndex: 53, boxShadow: '-14px 0 40px rgba(20,44,115,.22)', display: 'flex', flexDirection: 'column', animation: 'ecdtsPanel .22s ease' };

export function AffectationDrawer({ title, subtitle, hint, sectionLabel, emptyLabel, candidates, selectedIds, onClose, onSave }: AffectationDrawerProps) {
    const [draft, setDraft] = useState<string[]>(selectedIds);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const toggle = (id: string) => {
        setDraft((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    };

    const empty = candidates.length === 0;
    const plural = draft.length > 1 ? 's' : '';

    return (
        <>
            <div onClick={onClose} style={OVERLAY_STYLE} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-label={title} style={PANEL_STYLE}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #E7EBF2', flex: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>{title}</h3>
                        <span style={{ fontSize: 11.5, color: '#5A6478', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button onClick={onClose} className="ea-close" title="Fermer" aria-label="Fermer le tiroir" style={{ width: 30, height: 30, border: 'none', background: '#F0F2F7', color: '#5A6478', borderRadius: 6, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#EAF4FC', border: '1px solid #B9DEF5', borderRadius: 7, padding: '10px 12px' }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flex: 'none', marginTop: 1 }} aria-hidden="true"><circle cx="8" cy="8" r="6.6" stroke="#1D3E9C" strokeWidth="1.3" /><path d="M8 7.2v3.6" stroke="#1D3E9C" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="4.9" r=".9" fill="#1D3E9C" /></svg>
                        <span style={{ fontSize: 12, color: '#1A3566', lineHeight: 1.45 }}>{hint}</span>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: '#8A93A6', textTransform: 'uppercase' }}>{sectionLabel}</span>

                    {candidates.map((a) => {
                        const on = draft.includes(a.id);

                        return (
                            <button
                                key={a.id}
                                onClick={() => toggle(a.id)}
                                aria-pressed={on}
                                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: `1px solid ${on ? '#1D3E9C' : '#D8DEE9'}`, borderRadius: 9, background: on ? '#F5F8FD' : '#fff', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                            >
                                <span style={{ width: 18, height: 18, borderRadius: 5, border: on ? 'none' : '1.5px solid #C3CBDA', background: on ? '#1D3E9C' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                    {on ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6.3l2.4 2.4L10 3" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                                </span>
                                <span style={{ width: 30, height: 30, borderRadius: 7, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#1D3E9C', flex: 'none' }}>{a.code}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', minWidth: 0, flex: 1 }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1F2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                    <span style={{ fontSize: 11, color: '#8A93A6' }}>{a.pays}</span>
                                </span>
                            </button>
                        );
                    })}

                    {empty ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: '#8A93A6' }}>{emptyLabel}</div> : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid #E7EBF2', flex: 'none', background: '#FBFCFE' }}>
                    <span style={{ fontSize: 11.5, color: '#8A93A6', flex: 1 }}>{draft.length} armement{plural} sélectionné{plural}</span>
                    <button onClick={onClose} className="ea-btn-cancel" style={{ height: 38, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={() => onSave(draft)} className="ea-btn-primary" style={{ height: 38, padding: '0 18px', border: 'none', borderRadius: 6, background: '#1D3E9C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
                </div>
            </div>
        </>
    );
}

/* ══════════ Actions d'agent réutilisables (icônes/boutons) ══════════ */

const CHECK_ICON = <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const AFFECT_ICON = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h9M8 4.5L11.5 8 8 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.5 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const POWER_ICON = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;

export type AgentActionHandlers = {
    onValidate: () => void;
    onRefuse: () => void;
    onAffect: () => void;
    onToggle: () => void;
    onReexamine: () => void;
};

export function AgentActions({ statut, handlers }: { statut: Agent['statut']; handlers: AgentActionHandlers }) {
    if (statut === 'en_attente') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                <button onClick={handlers.onValidate} className="ea-btn-validate" style={{ height: 30, padding: '0 12px', border: 'none', borderRadius: 6, background: '#2F9E2F', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>{CHECK_ICON}Valider</button>
                <button onClick={handlers.onRefuse} className="ea-icon-danger" style={{ height: 30, padding: '0 12px', border: '1px solid #E0B4AD', borderRadius: 6, background: '#fff', color: '#C0392B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Refuser</button>
            </div>
        );
    }

    if (statut === 'actif') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                <button onClick={handlers.onAffect} className="ea-icon-btn" title="Affecter des armements" style={{ height: 30, padding: '0 11px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#1D3E9C', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>{AFFECT_ICON}Affecter</button>
                <button onClick={handlers.onToggle} className="ea-icon-danger" title="Désactiver le compte" aria-label="Désactiver le compte" style={{ width: 30, height: 30, border: '1px solid #E0B4AD', borderRadius: 6, background: '#fff', color: '#C0392B', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{POWER_ICON}</button>
            </div>
        );
    }

    if (statut === 'refuse') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                <span style={{ fontSize: 11.5, color: '#96271C' }}>Compte refusé</span>
                <button onClick={handlers.onReexamine} className="ea-btn-cancel" style={{ height: 30, padding: '0 11px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Réexaminer</button>
            </div>
        );
    }

    // desactive : compte réactivable
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
            <button onClick={handlers.onToggle} className="ea-icon-btn" style={{ height: 30, padding: '0 11px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#1D3E9C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Réactiver</button>
        </div>
    );
}

/** Badges d'armements affectés à un agent (ou « Aucun »). */
export function AgentArmBadges({ ids }: { ids: string[] }) {
    const arms = armementsByIds(ids);

    if (arms.length === 0) {
        return <span style={{ fontSize: 11.5, color: '#B4BCC9' }}>Aucun</span>;
    }

    return (
        <>
            {arms.map((b) => (
                <span key={b.id} style={{ fontSize: 11, fontWeight: 600, color: '#14509C', background: '#E4F3FC', border: '1px solid #B5DFF7', borderRadius: 5, padding: '2px 8px' }}>{b.name}</span>
            ))}
        </>
    );
}

/* ══════════ Onglet Consignataires ══════════ */

type DrawerTarget = { kind: 'agent'; agentId: string } | { kind: 'consign'; consignId: string } | null;

export default function ConsignatairesTab() {
    // DONNÉES FACTICES — à câbler (phase ultérieure)
    const [consignataires, setConsignataires] = useState<Consignataire[]>(CONSIGNATAIRES);
    const [agents, setAgents] = useState<Agent[]>(AGENTS);

    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drawer, setDrawer] = useState<DrawerTarget>(null);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return consignataires.filter((c) => q === '' || c.name.toLowerCase().includes(q) || c.ville.toLowerCase().includes(q));
    }, [consignataires, search]);

    const selected = selectedId ? consignataires.find((c) => c.id === selectedId) ?? null : null;

    const agentsOf = (consignId: string) => agents.filter((a) => a.consignataireId === consignId);
    const pendingCount = (consignId: string) => agentsOf(consignId).filter((a) => a.statut === 'en_attente').length;

    const setAgentStatut = (agentId: string, statut: Agent['statut']) => {
        setAgents((cur) => cur.map((a) => (a.id === agentId ? { ...a, statut } : a)));
    };

    const handlersFor = (agent: Agent): AgentActionHandlers => ({
        onValidate: () => setAgentStatut(agent.id, 'actif'),
        onRefuse: () => setAgentStatut(agent.id, 'refuse'),
        onToggle: () => setAgentStatut(agent.id, agent.statut === 'actif' ? 'desactive' : 'actif'),
        onReexamine: () => setAgentStatut(agent.id, 'en_attente'),
        onAffect: () => setDrawer({ kind: 'agent', agentId: agent.id }),
    });

    const closeDrawer = () => setDrawer(null);

    const saveDrawer = (ids: string[]) => {
        if (!drawer) {
            return;
        }

        if (drawer.kind === 'agent') {
            setAgents((cur) => cur.map((a) => (a.id === drawer.agentId ? { ...a, armementIds: ids } : a)));
        } else {
            setConsignataires((cur) => cur.map((c) => (c.id === drawer.consignId ? { ...c, armementIds: ids } : c)));
        }

        setDrawer(null);
    };

    /* ─── Tiroir : dérive les props selon la cible ─── */
    let drawerNode: ReactNode = null;

    if (drawer?.kind === 'agent') {
        const agent = agents.find((a) => a.id === drawer.agentId);
        const consign = agent ? consignataires.find((c) => c.id === agent.consignataireId) : undefined;

        if (agent && consign) {
            drawerNode = (
                <AffectationDrawer
                    title="Affectation aux armements"
                    subtitle={`${agent.name} · ${consign.name}`}
                    hint="L'agent ne pourra opérer (dossiers, manifestes, devis) que sur les armements cochés, parmi ceux représentés par sa société."
                    sectionLabel={`Armements de ${consign.name}`}
                    emptyLabel="Cette société ne représente encore aucun armement."
                    candidates={armementsByIds(consign.armementIds)}
                    selectedIds={agent.armementIds}
                    onClose={closeDrawer}
                    onSave={saveDrawer}
                />
            );
        }
    } else if (drawer?.kind === 'consign') {
        const consign = consignataires.find((c) => c.id === drawer.consignId);

        if (consign) {
            drawerNode = (
                <AffectationDrawer
                    title="Armements représentés"
                    subtitle={consign.name}
                    hint="La société ne pourra consigner que les armements cochés ; ses agents n'opèrent que sur ceux-ci."
                    sectionLabel="Référentiel des armements"
                    emptyLabel="Aucun armement au référentiel."
                    candidates={ARMEMENTS}
                    selectedIds={consign.armementIds}
                    onClose={closeDrawer}
                    onSave={saveDrawer}
                />
            );
        }
    }

    /* ─── Vue détail ─── */
    if (selected) {
        const detailAgents = agentsOf(selected.id);
        const detailPending = pendingCount(selected.id);
        const detailArms = armementsByIds(selected.armementIds);
        const statutMeta = STATUT_META[selected.statut];

        return (
            <>
                <div style={{ padding: '16px 26px 28px', maxWidth: 1120 }}>
                    <button onClick={() => setSelectedId(null)} className="ea-backbtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px 0 6px', border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Consignataires
                    </button>

                    {/* En-tête société */}
                    <div style={{ background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', padding: '18px 20px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="1.5" stroke="#1D3E9C" strokeWidth="1.6" /><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8M9 12h2M13 12h2M9 15.5h2M13 15.5h2" stroke="#1D3E9C" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#142C73', letterSpacing: '-.01em' }}>{selected.name}</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#5A6478' }}>
                                        <span>{selected.ville}</span><span style={{ color: '#D8DEE9' }}>·</span>
                                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{selected.rccm}</span><span style={{ color: '#D8DEE9' }}>·</span>
                                        <a href={`mailto:${selected.email}`} style={{ textDecoration: 'none', color: '#1D3E9C' }}>{selected.email}</a>
                                    </div>
                                </div>
                            </div>
                            <span style={statutMeta.pill}><span style={statutMeta.dot} />{statutMeta.label}</span>
                        </div>
                    </div>

                    {/* Armements représentés */}
                    <div style={{ background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', marginBottom: 16, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid #E7EBF2' }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1F2E' }}>Armements représentés</h3>
                            <span style={{ fontSize: 11.5, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{detailArms.length}</span>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => setDrawer({ kind: 'consign', consignId: selected.id })} className="ea-icon-btn" style={{ height: 32, padding: '0 12px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#1D3E9C', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Affecter un armement
                            </button>
                        </div>
                        <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {detailArms.map((a) => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid #D8DEE9', borderRadius: 8, background: '#FBFCFE', minWidth: 220 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 7, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#1D3E9C', flex: 'none' }}>{a.code}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1F2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                        <span style={{ fontSize: 11, color: '#8A93A6' }}>{a.pays} · {a.share} %</span>
                                    </div>
                                </div>
                            ))}
                            {detailArms.length === 0 ? <span style={{ fontSize: 12.5, color: '#B4BCC9', padding: '4px 0' }}>Aucun armement représenté.</span> : null}
                        </div>
                        <div style={{ padding: '0 18px 14px', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.45 }}>Relation <strong style={{ fontWeight: 700, color: '#5A6478' }}>N-N</strong> : un armement peut être représenté par plusieurs consignataires ; les agents de cette société n'opèrent que sur ces armements.</div>
                    </div>

                    {/* Comptes agents */}
                    <div style={{ background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid #E7EBF2' }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1F2E' }}>Comptes agents créés par cette société</h3>
                            <span style={{ fontSize: 11.5, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{detailAgents.length}</span>
                            {detailPending > 0 ? <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', borderRadius: 5, padding: '2px 8px' }}>{detailPending} à valider</span> : null}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: 820, borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 18px', borderBottom: '1px solid #D8DEE9' }}>Agent</th>
                                        <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #D8DEE9' }}>Armements affectés</th>
                                        <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #D8DEE9', width: 130 }}>Statut</th>
                                        <th style={{ background: '#F0F3F9', color: '#3A4356', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'right', padding: '8px 18px', borderBottom: '1px solid #D8DEE9', width: 230 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailAgents.map((a) => {
                                        const meta = STATUT_META[a.statut];

                                        return (
                                            <tr key={a.id}>
                                                <td style={{ padding: '10px 18px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={avatarStyle(a.statut)}>{initials(a.name)}</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}>{a.name}</span>
                                                            <span style={{ fontSize: 11, color: '#5A6478' }}>{a.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 260 }}><AgentArmBadges ids={a.armementIds} /></div>
                                                </td>
                                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><span style={meta.pill}><span style={meta.dot} />{meta.label}</span></td>
                                                <td style={{ padding: '10px 18px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><AgentActions statut={a.statut} handlers={handlersFor(a)} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {drawerNode}
            </>
        );
    }

    /* ─── Vue liste ─── */
    return (
        <>
            <div style={{ padding: '18px 26px 26px' }}>
                <div style={{ background: '#fff', border: '1px solid #D8DEE9', borderRadius: 8, boxShadow: '0 1px 3px rgba(20,44,115,.06)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E7EBF2', background: '#FBFCFE' }}>
                        <div style={{ position: 'relative', flex: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true"><circle cx="6" cy="6" r="4.6" stroke="#8A93A6" strokeWidth="1.5" /><path d="M9.5 9.5L13 13" stroke="#8A93A6" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une société consignataire…" aria-label="Rechercher une société consignataire" style={{ width: 300, height: 34, border: '1px solid #D8DEE9', borderRadius: 6, padding: '0 12px 0 32px', fontSize: 13, color: '#1A1F2E', background: '#fff', outlineColor: '#1D3E9C' }} />
                        </div>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: 12, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{rows.length} société{rows.length > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: 960, borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 16px', borderBottom: '2px solid #142C73' }}>Société consignataire</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73' }}>Armements représentés</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73', width: 190 }}>Comptes agents</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'left', padding: '9px 12px', borderBottom: '2px solid #142C73', width: 118 }}>Statut</th>
                                    <th style={{ background: '#1D3E9C', color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'center', padding: '9px 12px', borderBottom: '2px solid #142C73', width: 96 }}>Détail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '34px 16px', textAlign: 'center', fontSize: 13, color: '#8A93A6', borderBottom: '1px solid #E7EBF2' }}>Aucune société consignataire ne correspond à votre recherche.</td>
                                    </tr>
                                ) : rows.map((c) => {
                                    const meta = STATUT_META[c.statut];
                                    const cAgents = agentsOf(c.id);
                                    const cPending = pendingCount(c.id);
                                    const armBadges = armementsByIds(c.armementIds);

                                    return (
                                        <tr key={c.id} className="ea-row" onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{c.name}</span>
                                                    <span style={{ fontSize: 11, color: '#8A93A6', fontVariantNumeric: 'tabular-nums' }}>{c.ville} · {c.rccm}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 300 }}>
                                                    {armBadges.map((a) => (
                                                        <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#3A4356', background: '#EEF1F7', border: '1px solid #D8DEE9', borderRadius: 5, padding: '2px 8px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D3E9C', flex: 'none' }} />{a.name}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1A1F2E', fontVariantNumeric: 'tabular-nums' }}>{cAgents.length} compte{cAgents.length > 1 ? 's' : ''}</span>
                                                    {cPending > 0 ? <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>{cPending} à valider</span> : null}
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #E7EBF2', verticalAlign: 'middle' }}><span style={meta.pill}><span style={meta.dot} />{meta.label}</span></td>
                                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #E7EBF2', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span className="ea-icon-btn" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#1D3E9C' }}>
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {drawerNode}
        </>
    );
}
