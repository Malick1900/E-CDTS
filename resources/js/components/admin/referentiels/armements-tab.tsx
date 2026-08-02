import ConfirmDialog from '@/components/admin/confirm-dialog';
import {
    Drawer,
    Field,
    SelectField,
    TextField,
} from '@/components/admin/drawer';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import type { Option } from '@/components/admin/types';
import {
    fieldInput,
    RowActions,
    StatutBadge,
    Td,
    Th,
    Vide,
} from '@/components/admin/ui';
import { useCrudTab } from '@/components/admin/use-crud-tab';
import type { ArmementRow } from './types';

/*
 * Référentiel Armements (= armateurs / compagnies maritimes, ADR-0014).
 *
 * La relation N-N aux consignataires n'est pas encore représentable : le modèle
 * Consignataire arrive avec les comptes clients. La colonne est donc absente,
 * elle reviendra à ce moment-là.
 */

type Form = {
    name: string;
    sigle: string;
    pays_origine_id: number | null;
    pays_immatriculation_id: number | null;
    gerant: string;
    rccm_nif: string;
    adresse: string;
};

const VIERGE: Form = {
    name: '',
    sigle: '',
    pays_origine_id: null,
    pays_immatriculation_id: null,
    gerant: '',
    rccm_nif: '',
    adresse: '',
};

const filtre = (a: ArmementRow, q: string) =>
    a.name.toLowerCase().includes(q) ||
    (a.sigle ?? '').toLowerCase().includes(q) ||
    (a.pays_origine_name ?? '').toLowerCase().includes(q);

const depuis = (a: ArmementRow): Form => ({
    name: a.name,
    sigle: a.sigle ?? '',
    pays_origine_id: a.pays_origine_id,
    pays_immatriculation_id: a.pays_immatriculation_id,
    gerant: a.gerant ?? '',
    rccm_nif: a.rccm_nif ?? '',
    adresse: a.adresse ?? '',
});

const valide = (f: Form) => f.name.trim() !== '';

const bascule = (a: ArmementRow, prochain: boolean) => ({
    titre: prochain ? 'Réactiver cet armement ?' : 'Désactiver cet armement ?',
    corps: prochain
        ? 'L’armement redeviendra sélectionnable au rattachement des navires.'
        : 'Un armement inactif n’est plus proposé à la saisie. Les navires déjà rattachés ne sont pas affectés.',
    statLabel: 'Armement',
    statValue: a.sigle ? `${a.sigle} — ${a.name}` : a.name,
});

/** Pastille de la première colonne : le sigle, à défaut le début du nom. */
const initiales = (a: ArmementRow) =>
    (a.sigle ?? a.name.slice(0, 3)).toUpperCase();

export default function ArmementsTab({
    armements,
    optionsPays,
    signalCreation,
}: {
    armements: ArmementRow[];
    optionsPays: Option[];
    signalCreation: number;
}) {
    const ref = useCrudTab({
        base: '/admin/referentiels/armements',
        lignes: armements,
        filtre,
        vierge: VIERGE,
        depuis,
        valide,
        bascule,
        signalCreation,
    });

    return (
        <>
            <TableCard
                recherche={ref.recherche}
                onRecherche={ref.setRecherche}
                placeholder="Rechercher un armement, un sigle…"
                total={ref.total}
                unite={['armement', 'armements']}
                largeurMin={900}
                vide={
                    ref.recherche
                        ? 'Aucun armement ne correspond à la recherche.'
                        : 'Aucun armement — ajoutez-en un avec « Nouvel armement ».'
                }
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                note="L’armement porte l’identité société de la compagnie maritime. Il se désactive plutôt qu’il ne se supprime : les navires rattachés et les dossiers déjà liquidés restent intacts."
                entete={
                    <tr>
                        <Th first>Armement (compagnie maritime)</Th>
                        <Th w={150}>Pays d’origine</Th>
                        <Th w={170}>Pays d’immatriculation</Th>
                        <Th w={110}>Navires</Th>
                        <Th w={120}>Statut</Th>
                        <Th w={104} center>
                            Actions
                        </Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((a) => (
                    <tr key={a.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 11,
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 7,
                                        background: '#EEF3FF',
                                        border: '1px solid #C3D0F0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: '#1D3E9C',
                                        flex: 'none',
                                    }}
                                >
                                    {initiales(a)}
                                </div>
                                <span
                                    style={{
                                        fontSize: 13.5,
                                        fontWeight: 700,
                                        color: '#1A1F2E',
                                    }}
                                >
                                    {a.name}
                                </span>
                            </div>
                        </Td>
                        <Td>{a.pays_origine_name ?? <Vide />}</Td>
                        <Td>{a.pays_immatriculation_name ?? <Vide />}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {a.navires_count === 0 ? (
                                <Vide />
                            ) : (
                                `${a.navires_count} navire${a.navires_count > 1 ? 's' : ''}`
                            )}
                        </Td>
                        <Td>
                            <StatutBadge actif={a.actif} />
                        </Td>
                        <RowActions
                            actif={a.actif}
                            onEdit={() => ref.ouvrirEdition(a)}
                            onToggle={() => ref.demanderBascule(a)}
                        />
                    </tr>
                ))}
            </TableCard>

            {ref.mode && (
                <Drawer
                    titre={
                        ref.mode === 'creation'
                            ? 'Nouvel armement'
                            : 'Modifier l’armement'
                    }
                    soustitre="Référentiel Armements — identité de la compagnie maritime."
                    valider={
                        ref.mode === 'creation'
                            ? 'Enregistrer'
                            : 'Mettre à jour'
                    }
                    peutValider={ref.peutValider}
                    enCours={ref.enCours}
                    onFermer={ref.fermer}
                    onValider={ref.valider}
                >
                    <TextField
                        label="Nom de l’armement"
                        requis
                        placeholder="ex. Maersk Line"
                        valeur={ref.form.name}
                        onChange={(v) => ref.champ('name', v)}
                        erreur={ref.erreurs.name}
                    />
                    <TextField
                        label="Sigle"
                        majuscules
                        maxLength={10}
                        placeholder="ex. MSK"
                        valeur={ref.form.sigle}
                        onChange={(v) => ref.champ('sigle', v)}
                        erreur={ref.erreurs.sigle}
                        aide="Abréviation affichée dans les tableaux."
                    />
                    <SelectField
                        label="Pays d’origine"
                        valeur={ref.form.pays_origine_id}
                        onChange={(v) => ref.champ('pays_origine_id', v)}
                        options={optionsPays}
                        erreur={ref.erreurs.pays_origine_id}
                    />
                    <SelectField
                        label="Pays d’immatriculation"
                        valeur={ref.form.pays_immatriculation_id}
                        onChange={(v) =>
                            ref.champ('pays_immatriculation_id', v)
                        }
                        options={optionsPays}
                        erreur={ref.erreurs.pays_immatriculation_id}
                    />
                    <TextField
                        label="Gérant"
                        placeholder="Nom du gérant"
                        valeur={ref.form.gerant}
                        onChange={(v) => ref.champ('gerant', v)}
                        erreur={ref.erreurs.gerant}
                    />
                    <TextField
                        label="RCCM / NIF"
                        placeholder="Identifiants légaux"
                        valeur={ref.form.rccm_nif}
                        onChange={(v) => ref.champ('rccm_nif', v)}
                        erreur={ref.erreurs.rccm_nif}
                    />
                    <Field label="Adresse" erreur={ref.erreurs.adresse}>
                        <textarea
                            value={ref.form.adresse}
                            onChange={(e) =>
                                ref.champ('adresse', e.target.value)
                            }
                            rows={2}
                            maxLength={255}
                            placeholder="Adresse du siège"
                            aria-label="Adresse"
                            style={{
                                ...fieldInput,
                                height: 'auto',
                                padding: '8px 10px',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                lineHeight: 1.45,
                                borderColor: ref.erreurs.adresse
                                    ? '#E0B4AD'
                                    : '#D8DEE9',
                            }}
                        />
                    </Field>
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
