import type { ModeExploitation } from './types';

/*
 * Vocabulaire visuel propre au maritime. Le reste — jetons de style, cellules
 * de tableau, badge de statut, actions de ligne — est partagé par tout le
 * panneau et vit dans `components/admin/ui.tsx`.
 */

export const ShipIcon = () => (
    <svg width="20" height="15" viewBox="0 0 30 22" fill="none" style={{ flex: 'none' }}>
        <path d="M3 11h24l-3.4 6H6.4L3 11z" fill="#1D3E9C" />
        <rect x="12.2" y="4" width="4.6" height="6" fill="#7EC8F0" />
        <path d="M1 20c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2" stroke="#7EC8F0" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
);

export const PortIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flex: 'none' }}>
        <path d="M8 1.5c-2.4 0-4.3 1.9-4.3 4.2C3.7 9 8 14.3 8 14.3s4.3-5.3 4.3-8.6C12.3 3.4 10.4 1.5 8 1.5z" stroke="#1D3E9C" strokeWidth="1.3" />
        <circle cx="8" cy="5.7" r="1.7" stroke="#1D3E9C" strokeWidth="1.3" />
    </svg>
);

export const MODE_LABEL: Record<ModeExploitation, string> = {
    ligne_reguliere: 'Ligne régulière',
    tramping: 'Tramping',
};

/** Mode d'exploitation par défaut du navire — lu par le moteur de calcul. */
export function ModeBadge({ mode }: { mode: ModeExploitation | null }) {
    if (!mode) {
        return <span style={{ color: '#8A93A6' }}>—</span>;
    }

    const reg = mode === 'ligne_reguliere';

    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, borderRadius: 5, padding: '2px 9px',
                color: reg ? '#14509C' : '#B26200',
                background: reg ? '#E4F0FF' : '#FDF1E3',
                border: `1px solid ${reg ? '#B9D3F5' : '#F0CFA0'}`,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: reg ? '#1D3E9C' : '#E07B00', flex: 'none' }} />
            {MODE_LABEL[mode]}
        </span>
    );
}
