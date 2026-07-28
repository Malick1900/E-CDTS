import { useEffect  } from 'react';
import type {ReactNode} from 'react';
import { fieldInput, fieldLabel, fieldSelect } from './ui';

/*
 * Tiroir latéral de saisie — unique porte d'entrée pour créer ET modifier une
 * ligne, sur les cinq référentiels. Il ne fournit que la coquille et les
 * primitives de champ ; chaque onglet décrit ses propres champs.
 */

type DrawerProps = {
    titre: string;
    soustitre: string;
    /** Libellé du bouton de validation — « Enregistrer » ou « Mettre à jour ». */
    valider: string;
    peutValider: boolean;
    enCours: boolean;
    onFermer: () => void;
    onValider: () => void;
    children: ReactNode;
};

export function Drawer({ titre, soustitre, valider, peutValider, enCours, onFermer, onValider, children }: DrawerProps) {
    // Échap ferme le tiroir : comportement attendu d'une boîte de dialogue, au
    // même titre que le clic sur le voile.
    useEffect(() => {
        const surTouche = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onFermer();
            }
        };

        window.addEventListener('keydown', surTouche);

        return () => window.removeEventListener('keydown', surTouche);
    }, [onFermer]);

    const actif = peutValider && ! enCours;

    return (
        <>
            <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(20,31,46,.42)', zIndex: 50, animation: 'ecdtsFade .18s ease' }} />
            <div role="dialog" aria-modal="true" aria-label={titre} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 452, maxWidth: '100%', background: '#fff', zIndex: 51, boxShadow: '-14px 0 40px rgba(20,44,115,.22)', display: 'flex', flexDirection: 'column', animation: 'ecdtsPanel .22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #E7EBF2', flex: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1A1F2E' }}>{titre}</h3>
                        <span style={{ fontSize: 11.5, color: '#5A6478' }}>{soustitre}</span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button type="button" onClick={onFermer} title="Fermer" aria-label="Fermer" className="ea-close" style={{ width: 30, height: 30, border: 'none', background: '#F0F2F7', color: '#5A6478', borderRadius: 6, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
                        ✕
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();

                        if (actif) {
                            onValider();
                        }
                    }}
                    style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
                >
                    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid #E7EBF2', flex: 'none', background: '#FBFCFE' }}>
                        <span style={{ fontSize: 11.5, color: '#8A93A6', flex: 1 }}>
                            Champs marqués <span style={{ color: '#C0392B' }}>*</span> obligatoires.
                        </span>
                        <button type="button" onClick={onFermer} className="ea-btn-cancel" style={{ height: 38, padding: '0 16px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#3A4356', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={! actif} className={actif ? 'ea-btn-primary' : undefined} style={{ height: 38, padding: '0 18px', border: 'none', borderRadius: 6, background: actif ? '#1D3E9C' : '#C3CBDA', color: '#fff', fontSize: 13, fontWeight: 700, cursor: actif ? 'pointer' : 'not-allowed' }}>
                            {enCours ? 'Enregistrement…' : valider}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ── Primitives de champ ───────────────────────────────────────────

/** Libellé + contrôle + message d'erreur serveur. */
export function Field({ label, requis, aide, erreur, children }: { label: string; requis?: boolean; aide?: string; erreur?: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={fieldLabel}>
                {label} {requis && <span style={{ color: '#C0392B' }}>*</span>}
            </span>
            {children}
            {aide && !erreur && <span style={{ fontSize: 11, color: '#8A93A6', lineHeight: 1.4 }}>{aide}</span>}
            {erreur && <span style={{ fontSize: 11, color: '#C0392B' }}>{erreur}</span>}
        </div>
    );
}

type TextFieldProps = {
    label: string;
    valeur: string;
    onChange: (valeur: string) => void;
    requis?: boolean;
    erreur?: string;
    aide?: string;
    placeholder?: string;
    maxLength?: number;
    /** Codes et sigles : saisie affichée en majuscules (le serveur normalise). */
    majuscules?: boolean;
    chiffres?: boolean;
};

export function TextField({ label, valeur, onChange, requis, erreur, aide, placeholder, maxLength, majuscules, chiffres }: TextFieldProps) {
    return (
        <Field label={label} requis={requis} aide={aide} erreur={erreur}>
            <input
                type="text"
                value={valeur}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-label={label}
                style={{
                    ...fieldInput,
                    borderColor: erreur ? '#E0B4AD' : '#D8DEE9',
                    textTransform: majuscules ? 'uppercase' : undefined,
                    fontWeight: majuscules ? 600 : undefined,
                    fontVariantNumeric: chiffres ? 'tabular-nums' : undefined,
                }}
            />
        </Field>
    );
}

type SelectFieldProps = {
    label: string;
    valeur: number | null;
    onChange: (valeur: number | null) => void;
    options: Array<{ value: number; label: string }>;
    requis?: boolean;
    erreur?: string;
    aide?: string;
    /** Libellé de l'option vide — les clés étrangères des référentiels sont toutes facultatives. */
    aucun?: string;
};

export function SelectField({ label, valeur, onChange, options, requis, erreur, aide, aucun = '— Non renseigné —' }: SelectFieldProps) {
    return (
        <Field label={label} requis={requis} aide={aide} erreur={erreur}>
            <select
                value={valeur ?? ''}
                onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                aria-label={label}
                style={{ ...fieldSelect, borderColor: erreur ? '#E0B4AD' : '#D8DEE9' }}
            >
                <option value="">{aucun}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </Field>
    );
}
