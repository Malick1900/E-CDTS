/*
 * Confirmation avant une bascule d'activation. Toujours la même forme : ce
 * qu'on s'apprête à faire, la conséquence métier, et la ligne concernée
 * rappelée noir sur blanc.
 */

export type ConfirmEtat = {
    titre: string;
    corps: string;
    /** Libellé du bouton d'action — « Désactiver » / « Réactiver ». */
    libelle: string;
    /** Nature de la ligne, ex. « Port ». */
    statLabel: string;
    /** Ligne concernée, ex. « Owendo · GAOWE ». */
    statValue: string;
    danger: boolean;
    onOk: () => void;
};

type Props = { etat: ConfirmEtat | null; onFermer: () => void };

export default function ConfirmDialog({ etat, onFermer }: Props) {
    if (!etat) {
        return null;
    }

    return (
        <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(20,31,46,.48)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ecdtsFade .18s ease' }}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={etat.titre} style={{ width: 452, maxWidth: '100%', background: '#fff', borderRadius: 9, boxShadow: '0 18px 50px rgba(20,44,115,.30)', overflow: 'hidden', animation: 'ecdtsPop .18s ease' }}>
                <div style={{ padding: '18px 22px 8px', display: 'flex', gap: 13 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: etat.danger ? '#FBEAE7' : '#EAF4FC', color: etat.danger ? '#C0392B' : '#1D3E9C' }}>
                        <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                            <path d="M10 2.5L18 16.5H2L10 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <circle cx="10" cy="14" r="0.9" fill="currentColor" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>{etat.titre}</h3>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#3A4356' }}>{etat.corps}</p>
                    </div>
                </div>

                <div style={{ padding: '6px 22px 4px' }}>
                    <div style={{ background: '#F5F8FD', border: '1px solid #D8DEE9', borderRadius: 6, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: '#5A6478', textTransform: 'uppercase' }}>{etat.statLabel}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1F2E' }}>{etat.statValue}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #E7EBF2', background: '#FBFCFE', marginTop: 8 }}>
                    <button type="button" onClick={onFermer} className="ea-btn-cancel" style={{ height: 36, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Annuler
                    </button>
                    <button type="button" onClick={etat.onOk} style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 6, background: etat.danger ? '#C0392B' : '#1D3E9C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {etat.libelle}
                    </button>
                </div>
            </div>
        </div>
    );
}
