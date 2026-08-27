import { router, useForm } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { ConnaissementSaisi, ConteneurSaisi } from './types';

/*
 * La saisie d'un connaissement (WF4).
 *
 * **La saisie se fait au connaissement, jamais à la ligne du tableau.** Le
 * tableau, lui, s'affiche à plat — une ligne par boîte. Mais poids, volume et
 * colis appartiennent au BL : les demander boîte par boîte obligerait le
 * consignataire à répartir un tonnage que son manifeste papier ne répartit pas
 * (MANIFESTE-XML.md, première règle de totaux).
 *
 * D'où la forme de ce formulaire : les trois assiettes en haut, une fois pour
 * tout le connaissement ; les boîtes en dessous, sans assiette propre — elles
 * n'apportent que leur numéro, leur taille et leur tare.
 *
 * Un connaissement doit produire au moins une ligne : une boîte, ou une part
 * hors conteneur. Sans quoi il n'y aurait rien à qualifier, donc rien à
 * facturer.
 */

type ConnaissementProps = {
    /** L'URL de l'écran du manifeste, racine des dépôts. */
    url: string;
    /** Le connaissement à corriger — nul pour une déclaration nouvelle. */
    connaissement: ConnaissementSaisi | null;
    onFermer: () => void;
};

const VIDE: ConnaissementSaisi = {
    id: null,
    reference: '',
    master_reference: null,
    port_chargement: null,
    port_chargement_nom: null,
    port_dechargement: null,
    port_dechargement_nom: null,
    expediteur: null,
    destinataire: null,
    description: null,
    poids_brut_kg: null,
    volume_m3: null,
    colis: null,
    hors_conteneur: false,
    conteneurs: [],
};

const BOITE_VIDE: ConteneurSaisi = {
    reference: '',
    taille: null,
    colis: null,
    tare_kg: null,
};

const ETIQUETTE: CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#5A6478',
    letterSpacing: '.02em',
    textTransform: 'uppercase',
    marginBottom: 5,
};

const CHAMP: CSSProperties = {
    width: '100%',
    height: 34,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 13,
    color: '#1A1F2E',
    background: '#fff',
    outlineColor: '#1D3E9C',
};

const ERREUR: CSSProperties = {
    display: 'block',
    fontSize: 11.5,
    color: '#B3261E',
    marginTop: 4,
    lineHeight: 1.45,
};

const SECTION: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: '#1D3E9C',
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    margin: '4px 0 2px',
};

const GRILLE = (colonnes: string): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: colonnes,
    gap: 12,
});

/** Un champ texte, avec son étiquette et son erreur éventuelle. */
function Texte({
    id,
    label,
    valeur,
    erreur,
    onChange,
    placeholder,
    max,
}: {
    id: string;
    label: string;
    valeur: string | null;
    erreur?: string;
    onChange: (v: string | null) => void;
    placeholder?: string;
    max?: number;
}) {
    return (
        <div>
            <label style={ETIQUETTE} htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                type="text"
                value={valeur ?? ''}
                maxLength={max}
                placeholder={placeholder}
                style={CHAMP}
                onChange={(e) =>
                    onChange(e.target.value === '' ? null : e.target.value)
                }
            />
            {erreur ? <span style={ERREUR}>{erreur}</span> : null}
        </div>
    );
}

/**
 * Un champ de quantité.
 *
 * Vide ≠ zéro : une assiette absente du manifeste n'est pas une assiette nulle.
 * La ligne restera « à qualifier » plutôt que d'être facturée sur du vide.
 */
function Quantite({
    id,
    label,
    valeur,
    erreur,
    onChange,
    pas,
    suffixe,
}: {
    id: string;
    label: string;
    valeur: number | null;
    erreur?: string;
    onChange: (v: number | null) => void;
    pas?: string;
    suffixe?: string;
}) {
    return (
        <div>
            <label style={ETIQUETTE} htmlFor={id}>
                {label}
                {suffixe ? (
                    <span style={{ color: '#8A93A6' }}> ({suffixe})</span>
                ) : null}
            </label>
            <input
                id={id}
                type="number"
                min={0}
                step={pas ?? '1'}
                value={valeur ?? ''}
                placeholder="—"
                style={{ ...CHAMP, fontVariantNumeric: 'tabular-nums' }}
                onChange={(e) =>
                    onChange(
                        e.target.value === '' ? null : Number(e.target.value),
                    )
                }
            />
            {erreur ? <span style={ERREUR}>{erreur}</span> : null}
        </div>
    );
}

export default function ManifesteConnaissement({
    url,
    connaissement,
    onFermer,
}: ConnaissementProps) {
    const depart = connaissement ?? VIDE;
    const correction = depart.id !== null;

    const form = useForm<ConnaissementSaisi>({ ...depart });
    const [retrait, setRetrait] = useState(false);
    const [boites, setBoites] = useState<ConteneurSaisi[]>(
        depart.conteneurs.length > 0
            ? depart.conteneurs
            : depart.hors_conteneur
              ? []
              : [{ ...BOITE_VIDE }],
    );

    const majBoite = (index: number, patch: Partial<ConteneurSaisi>) =>
        setBoites((liste) =>
            liste.map((b, i) => (i === index ? { ...b, ...patch } : b)),
        );

    const enregistrer = () => {
        // Les boîtes sans numéro n'ont jamais été saisies : ce sont des lignes
        // ouvertes puis laissées, pas des conteneurs anonymes.
        const retenues = boites.filter((b) => b.reference.trim() !== '');

        form.transform((donnees) => ({ ...donnees, conteneurs: retenues }));

        const options = { preserveScroll: true, onSuccess: onFermer };

        if (correction) {
            form.put(`${url}/connaissements/${depart.id}`, options);
        } else {
            form.post(`${url}/connaissements`, options);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={
                correction
                    ? 'Corriger un connaissement'
                    : 'Déclarer un connaissement'
            }
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                background: 'rgba(20,44,115,.34)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onFermer();
                }
            }}
        >
            <div
                style={{
                    background: '#FFFFFF',
                    borderRadius: 10,
                    boxShadow: '0 12px 40px rgba(20,44,115,.24)',
                    width: 'min(920px, 100%)',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid #D8DEE9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flex: 'none',
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#1A1F2E',
                        }}
                    >
                        {correction
                            ? `Corriger le connaissement ${depart.reference}`
                            : 'Déclarer un connaissement'}
                    </h3>
                    <button
                        type="button"
                        onClick={onFermer}
                        aria-label="Fermer"
                        style={{
                            marginLeft: 'auto',
                            border: 'none',
                            background: 'none',
                            color: '#8A93A6',
                            fontSize: 20,
                            lineHeight: 1,
                            cursor: 'pointer',
                            padding: 4,
                        }}
                    >
                        ×
                    </button>
                </div>

                <div
                    style={{
                        padding: '16px 20px',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                    }}
                >
                    <div style={SECTION}>Identification</div>
                    <div style={GRILLE('1fr 1fr')}>
                        <Texte
                            id="bl-reference"
                            label="N° de connaissement"
                            valeur={form.data.reference}
                            erreur={form.errors.reference}
                            max={64}
                            onChange={(v) => form.setData('reference', v ?? '')}
                        />
                        <Texte
                            id="bl-master"
                            label="Connaissement mère (dégroupage)"
                            valeur={form.data.master_reference}
                            erreur={form.errors.master_reference}
                            max={64}
                            placeholder="Laisser vide si BL simple"
                            onChange={(v) =>
                                form.setData('master_reference', v)
                            }
                        />
                    </div>

                    <div style={GRILLE('1fr 1fr')}>
                        <Texte
                            id="bl-expediteur"
                            label="Expéditeur"
                            valeur={form.data.expediteur}
                            erreur={form.errors.expediteur}
                            onChange={(v) => form.setData('expediteur', v)}
                        />
                        <Texte
                            id="bl-destinataire"
                            label="Destinataire"
                            valeur={form.data.destinataire}
                            erreur={form.errors.destinataire}
                            placeholder="« TO ORDER » pour un BL à ordre"
                            onChange={(v) => form.setData('destinataire', v)}
                        />
                    </div>

                    <div style={GRILLE('1fr 1fr')}>
                        <Texte
                            id="bl-chargement"
                            label="Port de chargement (UN/LOCODE)"
                            valeur={form.data.port_chargement}
                            erreur={form.errors.port_chargement}
                            max={8}
                            placeholder="BEANR"
                            onChange={(v) => form.setData('port_chargement', v)}
                        />
                        <Texte
                            id="bl-dechargement"
                            label="Port de déchargement (UN/LOCODE)"
                            valeur={form.data.port_dechargement}
                            erreur={form.errors.port_dechargement}
                            max={8}
                            placeholder="GAOWE"
                            onChange={(v) =>
                                form.setData('port_dechargement', v)
                            }
                        />
                    </div>

                    <div>
                        <label style={ETIQUETTE} htmlFor="bl-description">
                            Désignation de la marchandise
                        </label>
                        <textarea
                            id="bl-description"
                            value={form.data.description ?? ''}
                            rows={2}
                            maxLength={2000}
                            placeholder="Telle qu'elle figure au manifeste — elle sert de base à la catégorisation"
                            style={{
                                ...CHAMP,
                                height: 'auto',
                                padding: '8px 10px',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                            onChange={(e) =>
                                form.setData(
                                    'description',
                                    e.target.value === ''
                                        ? null
                                        : e.target.value,
                                )
                            }
                        />
                        {form.errors.description ? (
                            <span style={ERREUR}>
                                {form.errors.description}
                            </span>
                        ) : null}
                    </div>

                    <div style={SECTION}>
                        Assiettes du connaissement — jamais par boîte
                    </div>
                    <div style={GRILLE('1fr 1fr 1fr')}>
                        <Quantite
                            id="bl-poids"
                            label="Poids brut"
                            suffixe="kg"
                            valeur={form.data.poids_brut_kg}
                            erreur={form.errors.poids_brut_kg}
                            onChange={(v) => form.setData('poids_brut_kg', v)}
                        />
                        <Quantite
                            id="bl-volume"
                            label="Volume"
                            suffixe="m³"
                            pas="0.001"
                            valeur={form.data.volume_m3}
                            erreur={form.errors.volume_m3}
                            onChange={(v) => form.setData('volume_m3', v)}
                        />
                        <Quantite
                            id="bl-colis"
                            label="Colis / unités"
                            valeur={form.data.colis}
                            erreur={form.errors.colis}
                            onChange={(v) => form.setData('colis', v)}
                        />
                    </div>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 11.5,
                            color: '#8A93A6',
                            lineHeight: 1.5,
                        }}
                    >
                        Laissez vide ce que le manifeste ne donne pas. Une case
                        vide n'est pas une quantité nulle&nbsp;: la ligne
                        restera «&nbsp;à qualifier&nbsp;» plutôt que d'être
                        facturée sur du vide.
                    </p>

                    <div style={SECTION}>Conteneurs</div>

                    {boites.length === 0 ? (
                        <p
                            style={{
                                margin: 0,
                                fontSize: 12.5,
                                color: '#5A6478',
                            }}
                        >
                            Aucun conteneur — ce connaissement est entièrement
                            hors conteneur.
                        </p>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}
                        >
                            {boites.map((boite, index) => (
                                <div
                                    // Les boîtes n'ont pas d'identité propre
                                    // avant d'être nommées : le rang en tient
                                    // lieu le temps de la saisie.
                                    key={index}
                                    style={{
                                        ...GRILLE('2fr 1fr 1fr 1fr auto'),
                                        alignItems: 'end',
                                    }}
                                >
                                    <Texte
                                        id={`ctn-ref-${index}`}
                                        label="N° de conteneur"
                                        valeur={boite.reference}
                                        max={24}
                                        placeholder="MSCU1234567"
                                        erreur={
                                            form.errors[
                                                `conteneurs.${index}.reference` as keyof typeof form.errors
                                            ]
                                        }
                                        onChange={(v) =>
                                            majBoite(index, {
                                                reference: v ?? '',
                                            })
                                        }
                                    />
                                    <div>
                                        <label
                                            style={ETIQUETTE}
                                            htmlFor={`ctn-taille-${index}`}
                                        >
                                            Taille
                                        </label>
                                        <select
                                            id={`ctn-taille-${index}`}
                                            value={boite.taille ?? ''}
                                            style={CHAMP}
                                            onChange={(e) =>
                                                majBoite(index, {
                                                    taille:
                                                        e.target.value === ''
                                                            ? null
                                                            : Number(
                                                                  e.target
                                                                      .value,
                                                              ),
                                                })
                                            }
                                        >
                                            <option value="">—</option>
                                            <option value="20">20′</option>
                                            <option value="40">40′</option>
                                            <option value="45">45′</option>
                                        </select>
                                    </div>
                                    <Quantite
                                        id={`ctn-colis-${index}`}
                                        label="Colis"
                                        valeur={boite.colis}
                                        onChange={(v) =>
                                            majBoite(index, { colis: v })
                                        }
                                    />
                                    <Quantite
                                        id={`ctn-tare-${index}`}
                                        label="Tare"
                                        suffixe="kg"
                                        valeur={boite.tare_kg}
                                        onChange={(v) =>
                                            majBoite(index, { tare_kg: v })
                                        }
                                    />
                                    <button
                                        type="button"
                                        aria-label={`Retirer le conteneur ${index + 1}`}
                                        onClick={() =>
                                            setBoites((liste) =>
                                                liste.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                        style={{
                                            height: 34,
                                            padding: '0 12px',
                                            border: '1px solid #E4C4C1',
                                            borderRadius: 6,
                                            background: '#FDF0EF',
                                            color: '#B3261E',
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Retirer
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            setBoites((liste) => [...liste, { ...BOITE_VIDE }])
                        }
                        style={{
                            alignSelf: 'flex-start',
                            height: 32,
                            padding: '0 14px',
                            border: '1px solid #C3D0F0',
                            borderRadius: 6,
                            background: '#F4F7FE',
                            color: '#1D3E9C',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        + Ajouter un conteneur
                    </button>

                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 9,
                            fontSize: 12.5,
                            color: '#3A4356',
                            lineHeight: 1.5,
                            background: '#FBFCFE',
                            border: '1px solid #E7EBF2',
                            borderRadius: 6,
                            padding: '10px 12px',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={form.data.hors_conteneur}
                            style={{ marginTop: 2, flex: 'none' }}
                            onChange={(e) =>
                                form.setData('hors_conteneur', e.target.checked)
                            }
                        />
                        <span>
                            Ce connaissement porte de la marchandise{' '}
                            <strong>hors conteneur</strong> (vrac, roulier,
                            conventionnel). Une ligne supplémentaire lui sera
                            réservée dans le tableau, avec les assiettes
                            ci-dessus.
                        </span>
                    </label>

                    {form.errors.conteneurs ? (
                        <span style={ERREUR}>{form.errors.conteneurs}</span>
                    ) : null}
                </div>

                <div
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #D8DEE9',
                        display: 'flex',
                        gap: 10,
                        justifyContent: 'flex-end',
                        background: '#FBFCFE',
                        flex: 'none',
                    }}
                >
                    {/* Retirer un connaissement emporte ses boîtes : le
                    retrait vit ici plutôt qu'en colonne du tableau, où il
                    s'offrirait à chacune des lignes d'un même BL. */}
                    {correction ? (
                        retrait ? (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginRight: 'auto',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#B3261E',
                                }}
                            >
                                Retirer ce connaissement et ses
                                conteneurs&nbsp;?
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(
                                            `${url}/connaissements/${depart.id}`,
                                            {
                                                preserveScroll: true,
                                                onSuccess: onFermer,
                                            },
                                        )
                                    }
                                    style={{
                                        height: 32,
                                        padding: '0 13px',
                                        border: '1px solid #E4C4C1',
                                        borderRadius: 6,
                                        background: '#FDF0EF',
                                        color: '#B3261E',
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Confirmer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRetrait(false)}
                                    style={{
                                        height: 32,
                                        padding: '0 13px',
                                        border: '1px solid #D8DEE9',
                                        borderRadius: 6,
                                        background: '#fff',
                                        color: '#3A4356',
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Annuler
                                </button>
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setRetrait(true)}
                                style={{
                                    marginRight: 'auto',
                                    height: 34,
                                    padding: '0 14px',
                                    border: '1px solid #E4C4C1',
                                    borderRadius: 6,
                                    background: '#fff',
                                    color: '#B3261E',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Retirer
                            </button>
                        )
                    ) : null}

                    <button
                        type="button"
                        onClick={onFermer}
                        style={{
                            height: 34,
                            padding: '0 16px',
                            border: '1px solid #D8DEE9',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#3A4356',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={enregistrer}
                        disabled={
                            form.processing || form.data.reference.trim() === ''
                        }
                        style={{
                            height: 34,
                            padding: '0 18px',
                            border: 'none',
                            borderRadius: 6,
                            background:
                                form.processing ||
                                form.data.reference.trim() === ''
                                    ? '#E4E8F0'
                                    : '#1D3E9C',
                            color:
                                form.processing ||
                                form.data.reference.trim() === ''
                                    ? '#98A2B4'
                                    : '#FFFFFF',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor:
                                form.processing ||
                                form.data.reference.trim() === ''
                                    ? 'not-allowed'
                                    : 'pointer',
                        }}
                    >
                        {correction
                            ? 'Enregistrer la correction'
                            : 'Déclarer le connaissement'}
                    </button>
                </div>
            </div>
        </div>
    );
}
