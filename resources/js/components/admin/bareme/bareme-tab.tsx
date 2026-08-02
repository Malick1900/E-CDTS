import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/components/admin/confirm-dialog';
import type { ConfirmEtat } from '@/components/admin/confirm-dialog';
import { Drawer, Field, TextField } from '@/components/admin/drawer';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import { CodeChip, fieldSelect, iconBtn, PowerIcon, StatutBadge, Td, Th } from '@/components/admin/ui';

/*
 * Le barème CDTS — un volet par sens de trafic (ADR-0034).
 *
 * Le montant se saisit en francs CFA, comme le document officiel du CGC ;
 * l'euro qui l'accompagne vient du serveur et ne s'écrit pas. La parité qui
 * relie les deux ne descend jamais jusqu'ici : le front affiche deux montants,
 * il n'en calcule aucun.
 *
 * Deux gestes distincts sur une ligne : la désactiver — elle sort de
 * l'exploitation mais reste dans la grille, et revient d'un clic — ou la
 * supprimer, ce qui l'efface pour de bon.
 */

export type BaremeLigneRow = {
    id: number;
    reference: string;
    sens: string;
    designation: string;
    montant_cfa: number;
    montant_euro: number;
    actif: boolean;
};

type Form = {
    reference: string;
    sens: string;
    designation: string;
    montant_cfa: string;
};

const francs = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

type Props = {
    lignes: BaremeLigneRow[];
    /** Sens du volet courant — il préremplit le tiroir de création. */
    sens: string;
    sensLabel: string;
    signalCreation: number;
};

export default function BaremeTab({ lignes, sens, sensLabel, signalCreation }: Props) {
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);

    const [mode, setMode] = useState<'creation' | 'edition' | null>(null);
    const [edite, setEdite] = useState<number | null>(null);
    const [form, setForm] = useState<Form>(vierge(sens));
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [enCours, setEnCours] = useState(false);
    const [confirm, setConfirm] = useState<ConfirmEtat | null>(null);

    // Absorption du signal « Ajouter » du bandeau, pendant le rendu — même
    // motif que `useCrudTab`, dont ce tableau ne peut pas se servir : il
    // supprime là où les référentiels désactivent.
    const [signalVu, setSignalVu] = useState(signalCreation);

    if (signalCreation !== signalVu) {
        setSignalVu(signalCreation);

        if (signalCreation > 0) {
            setForm(vierge(sens));
            setErreurs({});
            setEdite(null);
            setMode('creation');
        }
    }

    const filtrees = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return q === ''
            ? lignes
            : lignes.filter((l) => l.designation.toLowerCase().includes(q) || l.reference.toLowerCase().includes(q));
    }, [lignes, recherche]);

    const total = filtrees.length;
    const pageCourante = Math.min(page, Math.max(1, Math.ceil(total / PAR_PAGE)));
    const lignesPage = useMemo(
        () => filtrees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE),
        [filtrees, pageCourante],
    );

    const champ = (cle: keyof Form, valeur: string) => setForm((precedent) => ({ ...precedent, [cle]: valeur }));

    const peutValider =
        form.reference.trim() !== '' &&
        form.designation.trim() !== '' &&
        form.montant_cfa.trim() !== '' &&
        Number.isFinite(Number(form.montant_cfa));

    const valider = () => {
        if (!peutValider || enCours || mode === null) {
            return;
        }

        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setEnCours(true),
            onFinish: () => setEnCours(false),
            onSuccess: () => {
                setMode(null);
                setErreurs({});
            },
            onError: (e: Record<string, string>) => setErreurs(e),
        };

        if (mode === 'creation') {
            router.post('/admin/bareme', form, options);
        } else {
            router.patch(`/admin/bareme/${edite}`, form, options);
        }
    };

    const demanderBascule = (ligne: BaremeLigneRow) => {
        const prochain = !ligne.actif;

        setConfirm({
            titre: prochain ? 'Réactiver cette ligne ?' : 'Désactiver cette ligne ?',
            corps: prochain
                ? 'La ligne redevient tarifable et réapparaît dans l’exploitation.'
                : 'La ligne reste dans la grille mais n’est plus proposée à l’exploitation. Elle se réactive à tout moment.',
            libelle: prochain ? 'Réactiver' : 'Désactiver',
            statLabel: 'Ligne',
            statValue: `${ligne.reference} — ${ligne.designation}`,
            danger: !prochain,
            onOk: () => {
                setConfirm(null);
                router.patch(`/admin/bareme/${ligne.id}/activation`, {}, { preserveScroll: true, preserveState: true });
            },
        });
    };

    const demanderSuppression = (ligne: BaremeLigneRow) => {
        setConfirm({
            titre: 'Supprimer cette ligne du barème ?',
            corps: "La ligne disparaît définitivement de la grille tarifaire. Il n'y a pas de corbeille : pour la rétablir, il faudra la ressaisir.",
            libelle: 'Supprimer',
            statLabel: 'Ligne',
            statValue: `${ligne.reference} — ${ligne.designation}`,
            danger: true,
            onOk: () => {
                setConfirm(null);
                router.delete(`/admin/bareme/${ligne.id}`, { preserveScroll: true, preserveState: true });
            },
        });
    };

    return (
        <>
            <TableCard
                recherche={recherche}
                onRecherche={(v) => {
                    setRecherche(v);
                    setPage(1);
                }}
                placeholder="Rechercher une désignation, une référence…"
                total={total}
                unite={['ligne', 'lignes']}
                largeurMin={940}
                vide={recherche ? 'Aucune ligne ne correspond à la recherche.' : 'Aucune ligne pour ce sens de trafic.'}
                page={pageCourante}
                parPage={PAR_PAGE}
                onPage={setPage}
                note="Les montants sont ceux du barème CDTS en vigueur. Le franc CFA est la valeur de référence ; l'euro en est la conversion et ne se saisit pas. Une ligne désactivée reste dans la grille mais n'est plus proposée à l'exploitation ; la supprimer, en revanche, l'efface définitivement. Les remises et taux appliqués ne sont pas gérés ici."
                entete={
                    <tr>
                        <Th w={110} first>Référence</Th>
                        <Th>Désignation</Th>
                        <Th w={150}>Montant CFA</Th>
                        <Th w={120}>Montant €</Th>
                        <Th w={110}>Statut</Th>
                        <Th w={132} center>Actions</Th>
                    </tr>
                }
            >
                {lignesPage.map((l) => (
                    <tr key={l.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <CodeChip>{l.reference}</CodeChip>
                        </Td>
                        <Td style={{ fontSize: 13, color: '#1A1F2E' }}>{l.designation}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#1A1F2E' }}>
                            {francs.format(l.montant_cfa)} <span style={{ fontWeight: 400, color: '#8A93A6' }}>FCFA</span>
                        </Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums', color: '#3A4356' }}>{euros.format(l.montant_euro)}</Td>
                        <Td>
                            <StatutBadge actif={l.actif} />
                        </Td>
                        <Td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm(depuis(l));
                                        setErreurs({});
                                        setEdite(l.id);
                                        setMode('edition');
                                    }}
                                    title="Modifier"
                                    className="ea-icon-btn"
                                    style={iconBtn}
                                >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => demanderBascule(l)}
                                    title={l.actif ? 'Désactiver' : 'Réactiver'}
                                    className="ea-icon-btn"
                                    style={{ ...iconBtn, color: l.actif ? '#C0392B' : '#0A7D46' }}
                                >
                                    <PowerIcon />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => demanderSuppression(l)}
                                    title="Supprimer"
                                    className="ea-icon-danger"
                                    style={{ ...iconBtn, color: '#C0392B', borderColor: '#E0B4AD' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </Td>
                    </tr>
                ))}
            </TableCard>

            {mode && (
                <Drawer
                    titre={mode === 'creation' ? `Nouvelle ligne — ${sensLabel}` : 'Modifier la ligne'}
                    soustitre="Barème CDTS — montant en francs CFA."
                    valider={mode === 'creation' ? 'Enregistrer' : 'Mettre à jour'}
                    peutValider={peutValider}
                    enCours={enCours}
                    onFermer={() => {
                        setMode(null);
                        setErreurs({});
                    }}
                    onValider={valider}
                >
                    <TextField
                        label="Référence"
                        requis
                        majuscules
                        maxLength={20}
                        placeholder="ex. EXP30"
                        valeur={form.reference}
                        onChange={(v) => champ('reference', v)}
                        erreur={erreurs.reference}
                        aide="Celle du document officiel du CGC."
                    />

                    <Field label="Sens du trafic" requis erreur={erreurs.sens}>
                        <select
                            value={form.sens}
                            onChange={(e) => champ('sens', e.target.value)}
                            aria-label="Sens du trafic"
                            style={{ ...fieldSelect, borderColor: erreurs.sens ? '#E0B4AD' : '#D8DEE9' }}
                        >
                            <option value="export">Export</option>
                            <option value="import">Import</option>
                        </select>
                    </Field>

                    <TextField
                        label="Désignation"
                        requis
                        placeholder="ex. CONTENEUR 20 PIEDS SEC (DRY)"
                        valeur={form.designation}
                        onChange={(v) => champ('designation', v)}
                        erreur={erreurs.designation}
                    />
                    <TextField
                        label="Montant en francs CFA"
                        requis
                        chiffres
                        placeholder="ex. 14326.10"
                        valeur={form.montant_cfa}
                        onChange={(v) => champ('montant_cfa', v)}
                        erreur={erreurs.montant_cfa}
                        aide="L'équivalent en euros est calculé à l'enregistrement."
                    />
                </Drawer>
            )}

            <ConfirmDialog etat={confirm} onFermer={() => setConfirm(null)} />
        </>
    );
}

function vierge(sens: string): Form {
    return { reference: '', sens, designation: '', montant_cfa: '' };
}

function depuis(l: BaremeLigneRow): Form {
    return {
        reference: l.reference,
        sens: l.sens,
        designation: l.designation,
        montant_cfa: String(l.montant_cfa),
    };
}
