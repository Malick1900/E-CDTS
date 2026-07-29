/*
 * Briques d'interface de l'onglet « Agents consignataires » : présentation des
 * statuts, tiroir d'affectation aux armements, actions de ligne et dialogue de
 * refus motivé.
 *
 * L'écran ne crée pas de compte — la société s'en charge depuis son portail
 * (ADR-0013). Le CGC ne fait que statuer, d'où des actions de décision plutôt
 * qu'un formulaire de saisie.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AgentStatut, ArmementBadge } from './types';

/* ══════════ Présentation des statuts ══════════ */

/** Métadonnées de présentation des pastilles de statut. */
export const STATUT_META: Record<AgentStatut, { label: string; pill: CSSProperties; dot: CSSProperties }> = {
    actif: {
        label: 'Actif',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#1E7A34', background: '#E6F4EA', border: '1px solid #B8E0C2', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#2F9E2F', flex: 'none' },
    },
    en_attente: {
        label: 'En attente',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#B26200', background: '#FDF1E3', border: '1px solid #F0CFA0', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#E07B00', flex: 'none' },
    },
    desactive: {
        label: 'Désactivé',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#5A6478', background: '#EEF1F7', border: '1px solid #D8DEE9', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#8A93A6', flex: 'none' },
    },
    refuse: {
        label: 'Refusé',
        pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '2px 10px', borderRadius: 20, color: '#C0392B', background: '#FBEAE7', border: '1px solid #E0B4AD', whiteSpace: 'nowrap' },
        dot: { width: 6, height: 6, borderRadius: '50%', background: '#C0392B', flex: 'none' },
    },
};

/** Initiales pour l'avatar d'un nom complet. */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '??';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Style de l'avatar d'un agent selon son statut. */
export function avatarStyle(statut: AgentStatut): CSSProperties {
    const background = statut === 'en_attente' ? '#E07B00' : statut === 'actif' ? '#1D3E9C' : '#8A93A6';

    return {
        width: 34,
        height: 34,
        borderRadius: '50%',
        background,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flex: 'none',
    };
}

/* ══════════ Tiroir : affectation aux armements ══════════ */

type AffectationDrawerProps = {
    title: string;
    subtitle: string;
    hint: string;
    sectionLabel: string;
    emptyLabel: string;
    /** Armements proposés à la sélection — ceux de la société de l'agent. */
    candidates: ArmementBadge[];
    /** Identifiants cochés à l'ouverture. */
    selectedIds: number[];
    enCours: boolean;
    onClose: () => void;
    onSave: (ids: number[]) => void;
};

const OVERLAY_STYLE: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(20,31,46,.42)', zIndex: 52, animation: 'ecdtsFade .18s ease' };
const PANEL_STYLE: CSSProperties = { position: 'fixed', top: 0, right: 0, bottom: 0, width: 460, background: '#fff', zIndex: 53, boxShadow: '-14px 0 40px rgba(20,44,115,.22)', display: 'flex', flexDirection: 'column', animation: 'ecdtsPanel .22s ease' };

export function AffectationDrawer({ title, subtitle, hint, sectionLabel, emptyLabel, candidates, selectedIds, enCours, onClose, onSave }: AffectationDrawerProps) {
    const [draft, setDraft] = useState<number[]>(selectedIds);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const toggle = (id: number) => {
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
                                <span style={{ width: 30, height: 30, borderRadius: 7, background: '#EEF3FF', border: '1px solid #C3D0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#1D3E9C', flex: 'none' }}>{a.sigle ?? initials(a.name)}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', minWidth: 0, flex: 1 }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A1F2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                </span>
                            </button>
                        );
                    })}

                    {empty ? <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: '#8A93A6' }}>{emptyLabel}</div> : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid #E7EBF2', flex: 'none', background: '#FBFCFE' }}>
                    <span style={{ fontSize: 11.5, color: '#8A93A6', flex: 1 }}>{draft.length} armement{plural} sélectionné{plural}</span>
                    <button onClick={onClose} className="ea-btn-cancel" style={{ height: 38, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={() => onSave(draft)} disabled={enCours} className="ea-btn-primary" style={{ height: 38, padding: '0 18px', border: 'none', borderRadius: 6, background: '#1D3E9C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: enCours ? 'progress' : 'pointer', opacity: enCours ? 0.7 : 1 }}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>
                </div>
            </div>
        </>
    );
}

/* ══════════ Dialogue : refus motivé ══════════ */

type RefusDialogProps = {
    agent: string;
    societe: string;
    erreur?: string;
    enCours: boolean;
    onClose: () => void;
    onConfirm: (motif: string) => void;
};

/**
 * Le motif n'est pas une politesse : c'est lui qui rend la décision opposable
 * (ADR-0024) et qui dit à la société ce qu'elle doit corriger avant de
 * soumettre à nouveau. D'où un dialogue dédié plutôt que la confirmation
 * générique du socle.
 */
export function RefusDialog({ agent, societe, erreur, enCours, onClose, onConfirm }: RefusDialogProps) {
    const [motif, setMotif] = useState('');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const peutValider = motif.trim().length >= 5 && !enCours;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,31,46,.48)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ecdtsFade .18s ease' }}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Refuser le compte agent" style={{ width: 480, maxWidth: '100%', background: '#fff', borderRadius: 9, boxShadow: '0 18px 50px rgba(20,44,115,.30)', overflow: 'hidden', animation: 'ecdtsPop .18s ease' }}>
                <div style={{ padding: '18px 22px 8px', display: 'flex', gap: 13 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBEAE7', color: '#C0392B' }}>
                        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M10 2.5L18 16.5H2L10 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <circle cx="10" cy="14" r="0.9" fill="currentColor" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>Refuser ce compte agent</h3>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#3A4356' }}>
                            Le compte reste en base comme trace de la décision. La société pourra soumettre à nouveau la demande après correction.
                        </p>
                    </div>
                </div>

                <div style={{ padding: '6px 22px 4px' }}>
                    <div style={{ background: '#F5F8FD', border: '1px solid #D8DEE9', borderRadius: 6, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: '#5A6478', textTransform: 'uppercase' }}>Agent</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{agent} · {societe}</span>
                    </div>
                </div>

                <div style={{ padding: '14px 22px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="motif-refus" style={{ fontSize: 11.5, fontWeight: 700, color: '#3A4356' }}>Motif du refus</label>
                    <textarea
                        id="motif-refus"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Ex. : fonction déclarée sans rapport avec la consignation."
                        style={{ width: '100%', border: `1px solid ${erreur ? '#E0B4AD' : '#D8DEE9'}`, borderRadius: 6, padding: '9px 11px', fontSize: 13, color: '#1A1F2E', fontFamily: 'inherit', resize: 'vertical', outlineColor: '#1D3E9C' }}
                    />
                    <span style={{ fontSize: 11.5, color: erreur ? '#C0392B' : '#8A93A6' }}>
                        {erreur ?? 'Consigné avec la décision — il sera lisible sur la ligne de l’agent.'}
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #E7EBF2', background: '#FBFCFE', marginTop: 8 }}>
                    <button type="button" onClick={onClose} className="ea-btn-cancel" style={{ height: 36, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                    <button
                        type="button"
                        onClick={() => onConfirm(motif.trim())}
                        disabled={!peutValider}
                        style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 6, background: '#C0392B', color: '#fff', fontSize: 13, fontWeight: 700, cursor: peutValider ? 'pointer' : 'not-allowed', opacity: peutValider ? 1 : 0.55 }}
                    >
                        {enCours ? 'Enregistrement…' : 'Refuser le compte'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════ Actions d'agent ══════════ */

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

export function AgentActions({ statut, handlers }: { statut: AgentStatut; handlers: AgentActionHandlers }) {
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
export function AgentArmBadges({ armements }: { armements: ArmementBadge[] }) {
    if (armements.length === 0) {
        return <span style={{ fontSize: 11.5, color: '#B4BCC9' }}>Aucun</span>;
    }

    return (
        <>
            {armements.map((a) => (
                <span key={a.id} style={{ fontSize: 11, fontWeight: 600, color: '#14509C', background: '#E4F3FC', border: '1px solid #B5DFF7', borderRadius: 5, padding: '2px 8px' }}>{a.name}</span>
            ))}
        </>
    );
}
