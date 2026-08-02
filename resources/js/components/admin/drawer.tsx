import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fieldInput, fieldLabel, fieldSelect, SearchIcon } from './ui';

/*
 * Tiroir latéral de saisie — unique porte d'entrée pour créer ET modifier une
 * ligne, sur tous les écrans d'administration. Il ne fournit que la coquille et
 * les primitives de champ ; chaque onglet décrit ses propres champs.
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

export function Drawer({
    titre,
    soustitre,
    valider,
    peutValider,
    enCours,
    onFermer,
    onValider,
    children,
}: DrawerProps) {
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

    const actif = peutValider && !enCours;

    return (
        <>
            <div
                onClick={onFermer}
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
                aria-label={titre}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 452,
                    maxWidth: '100%',
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
                            {titre}
                        </h3>
                        <span style={{ fontSize: 11.5, color: '#5A6478' }}>
                            {soustitre}
                        </span>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={onFermer}
                        title="Fermer"
                        aria-label="Fermer"
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

                <form
                    onSubmit={(e) => {
                        e.preventDefault();

                        if (actif) {
                            onValider();
                        }
                    }}
                    style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            overflow: 'auto',
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}
                    >
                        {children}
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
                                flex: 1,
                            }}
                        >
                            Champs marqués{' '}
                            <span style={{ color: '#C0392B' }}>*</span>{' '}
                            obligatoires.
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
                            type="submit"
                            disabled={!actif}
                            className={actif ? 'ea-btn-primary' : undefined}
                            style={{
                                height: 38,
                                padding: '0 18px',
                                border: 'none',
                                borderRadius: 6,
                                background: actif ? '#1D3E9C' : '#C3CBDA',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: actif ? 'pointer' : 'not-allowed',
                            }}
                        >
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
export function Field({
    label,
    requis,
    aide,
    erreur,
    children,
}: {
    label: string;
    requis?: boolean;
    aide?: string;
    erreur?: string;
    children: ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={fieldLabel}>
                {label} {requis && <span style={{ color: '#C0392B' }}>*</span>}
            </span>
            {children}
            {aide && !erreur && (
                <span
                    style={{ fontSize: 11, color: '#8A93A6', lineHeight: 1.4 }}
                >
                    {aide}
                </span>
            )}
            {erreur && (
                <span style={{ fontSize: 11, color: '#C0392B' }}>{erreur}</span>
            )}
        </div>
    );
}

/**
 * Séparateur de rubrique dans un tiroir. Utile dès qu'un formulaire mêle deux
 * objets distincts — la société et le compte de son titulaire, par exemple —
 * pour que le lecteur voie où l'un finit et l'autre commence.
 */
export function Section({ titre, aide }: { titre: string; aide?: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                paddingTop: 6,
                borderTop: '1px solid #E7EBF2',
            }}
        >
            <span
                style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '.05em',
                    color: '#8A93A6',
                    textTransform: 'uppercase',
                }}
            >
                {titre}
            </span>
            {aide ? (
                <span
                    style={{
                        fontSize: 11.5,
                        color: '#5A6478',
                        lineHeight: 1.45,
                    }}
                >
                    {aide}
                </span>
            ) : null}
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
    /** Nature de la saisie — pour le clavier mobile et le gestionnaire de mots de passe. */
    type?: 'text' | 'email' | 'password';
    autoComplete?: string;
};

export function TextField({
    label,
    valeur,
    onChange,
    requis,
    erreur,
    aide,
    placeholder,
    maxLength,
    majuscules,
    chiffres,
    type = 'text',
    autoComplete,
}: TextFieldProps) {
    return (
        <Field label={label} requis={requis} aide={aide} erreur={erreur}>
            <input
                type={type}
                autoComplete={autoComplete}
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
    /** Libellé de l'option vide — la plupart des rattachements sont facultatifs. */
    aucun?: string;
};

type MultiSelectFieldProps = {
    label: string;
    /** Identifiants cochés. L'ordre est indifférent : le serveur fait un `sync()`. */
    valeurs: number[];
    onChange: (valeurs: number[]) => void;
    options: Array<{ value: number; label: string }>;
    erreur?: string;
    aide?: string;
    /** Message affiché quand le référentiel source est vide. */
    vide: string;
    /** Singulier puis pluriel du décompte, ex. `['armement', 'armements']`. */
    unite: [string, string];
};

/** Au-delà de ce nombre d'options, la liste ne se parcourt plus à l'œil. */
const SEUIL_RECHERCHE = 8;

/**
 * Rattachement N-N : une liste de cases à cocher plutôt qu'un `<select multiple>`,
 * dont la sélection multiple au clavier n'est comprise de personne.
 *
 * Deux aménagements pour les référentiels longs — le catalogue des armements en
 * compte des dizaines, là où les ports tiennent sur une main :
 * - les entrées déjà cochées remontent en tête, **dans l'ordre figé à
 *   l'ouverture** : sans ce gel, cocher une case la ferait sauter sous le
 *   curseur ;
 * - un champ de recherche apparaît au-delà du seuil, pour ne pas imposer de
 *   faire défiler une boîte de 190 pixels à la recherche d'une compagnie.
 */
export function MultiSelectField({
    label,
    valeurs,
    onChange,
    options,
    erreur,
    aide,
    vide,
    unite,
}: MultiSelectFieldProps) {
    // On ajoute en fin de liste sans réordonner : un identifiant rattaché à une
    // entrée désactivée — donc absent des options — n'est jamais perdu au passage.
    const basculer = (value: number) => {
        onChange(
            valeurs.includes(value)
                ? valeurs.filter((v) => v !== value)
                : [...valeurs, value],
        );
    };

    const compte = valeurs.length;
    const avecRecherche = options.length > SEUIL_RECHERCHE;

    const [recherche, setRecherche] = useState('');

    // Photographie de la sélection à l'ouverture : c'est elle qui fixe l'ordre,
    // et non la sélection courante, qui change à chaque clic.
    const [cochesInitiaux] = useState(() => new Set(valeurs));

    const visibles = useMemo(() => {
        // Le tri de JS est stable : l'ordre alphabétique reçu du serveur est
        // conservé à l'intérieur de chaque groupe.
        const ordonnees = [...options].sort(
            (a, b) =>
                Number(cochesInitiaux.has(b.value)) -
                Number(cochesInitiaux.has(a.value)),
        );
        const q = recherche.trim().toLowerCase();

        return q === ''
            ? ordonnees
            : ordonnees.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, cochesInitiaux, recherche]);

    return (
        <Field label={label} aide={aide} erreur={erreur}>
            {options.length === 0 ? (
                <span style={{ fontSize: 12, color: '#8A93A6' }}>{vide}</span>
            ) : (
                <>
                    {avecRecherche && (
                        <div style={{ position: 'relative' }}>
                            <SearchIcon />
                            <input
                                type="text"
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder={`Filtrer parmi ${options.length} ${unite[1]}…`}
                                aria-label={`Filtrer ${label}`}
                                style={{
                                    ...fieldInput,
                                    height: 32,
                                    padding: '0 10px 0 30px',
                                }}
                            />
                        </div>
                    )}
                    <div
                        role="group"
                        aria-label={label}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            maxHeight: 190,
                            overflowY: 'auto',
                            border: `1px solid ${erreur ? '#E0B4AD' : '#D8DEE9'}`,
                            borderRadius: 6,
                            padding: 8,
                            background: '#fff',
                        }}
                    >
                        {visibles.length === 0 ? (
                            <span
                                style={{
                                    fontSize: 12,
                                    color: '#8A93A6',
                                    padding: '6px 8px',
                                }}
                            >
                                Aucune entrée ne correspond.
                            </span>
                        ) : (
                            visibles.map((o) => {
                                const coche = valeurs.includes(o.value);

                                return (
                                    <label
                                        key={o.value}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 9,
                                            padding: '6px 8px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            background: coche
                                                ? '#F5F8FD'
                                                : 'transparent',
                                            border: `1px solid ${coche ? '#C3D0F0' : 'transparent'}`,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={coche}
                                            onChange={() => basculer(o.value)}
                                            style={{
                                                width: 15,
                                                height: 15,
                                                accentColor: '#1D3E9C',
                                                flex: 'none',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                color: '#1A1F2E',
                                            }}
                                        >
                                            {o.label}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                    <span
                        style={{
                            fontSize: 11,
                            color: '#8A93A6',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {compte} {compte > 1 ? unite[1] : unite[0]} sélectionné
                        {compte > 1 ? 's' : ''}
                    </span>
                </>
            )}
        </Field>
    );
}

export function SelectField({
    label,
    valeur,
    onChange,
    options,
    requis,
    erreur,
    aide,
    aucun = '— Non renseigné —',
}: SelectFieldProps) {
    return (
        <Field label={label} requis={requis} aide={aide} erreur={erreur}>
            <select
                value={valeur ?? ''}
                onChange={(e) =>
                    onChange(
                        e.target.value === '' ? null : Number(e.target.value),
                    )
                }
                aria-label={label}
                style={{
                    ...fieldSelect,
                    borderColor: erreur ? '#E0B4AD' : '#D8DEE9',
                }}
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
