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
    RowActions,
    StatutBadge,
    Td,
    TdTitre,
    Th,
    Vide,
} from '@/components/admin/ui';
import { useCrudTab } from '@/components/admin/use-crud-tab';
import type { ModeExploitation, NavireRow } from './types';
import { MODE_LABEL, ModeBadge, ShipIcon } from './ui';

/*
 * Référentiel Navires — entité maîtresse rapprochée du manifeste (ADR-0009).
 *
 * Le type et le mode d'exploitation sont lus par le moteur de calcul, d'où la
 * colonne Type mise en accent. Attention : `mode_exploitation_defaut` n'est
 * qu'une VALEUR PAR DÉFAUT recopiée sur l'escale à sa création — la facturation
 * lit l'escale, jamais le navire.
 */

type Form = {
    name: string;
    imo: string;
    type_navire_id: number | null;
    armement_id: number | null;
    pays_id: number | null;
    mode_exploitation_defaut: ModeExploitation | null;
};

const VIERGE: Form = {
    name: '',
    imo: '',
    type_navire_id: null,
    armement_id: null,
    pays_id: null,
    mode_exploitation_defaut: 'ligne_reguliere',
};

const filtre = (n: NavireRow, q: string) =>
    n.name.toLowerCase().includes(q) ||
    (n.imo ?? '').includes(q) ||
    (n.armement_name ?? '').toLowerCase().includes(q) ||
    (n.type_navire_name ?? '').toLowerCase().includes(q);

const depuis = (n: NavireRow): Form => ({
    name: n.name,
    imo: n.imo ?? '',
    type_navire_id: n.type_navire_id,
    armement_id: n.armement_id,
    pays_id: n.pays_id,
    mode_exploitation_defaut: n.mode_exploitation_defaut,
});

const valide = (f: Form) => f.name.trim() !== '';

const bascule = (n: NavireRow, prochain: boolean) => ({
    titre: prochain ? 'Réactiver ce navire ?' : 'Désactiver ce navire ?',
    corps: prochain
        ? 'Le navire redeviendra sélectionnable à l’ouverture des escales.'
        : 'Un navire inactif n’est plus proposé à l’ouverture des escales. Les dossiers déjà liquidés ne sont pas affectés.',
    statLabel: 'Navire',
    statValue: n.imo ? `${n.name} · IMO ${n.imo}` : n.name,
});

const MODES: ModeExploitation[] = ['ligne_reguliere', 'tramping'];

type Props = {
    navires: NavireRow[];
    optionsTypes: Option[];
    optionsArmements: Option[];
    optionsPays: Option[];
    signalCreation: number;
};

export default function NaviresTab({
    navires,
    optionsTypes,
    optionsArmements,
    optionsPays,
    signalCreation,
}: Props) {
    const ref = useCrudTab({
        base: '/admin/referentiels/navires',
        lignes: navires,
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
                placeholder="Rechercher un navire, un n° IMO…"
                total={ref.total}
                unite={['navire', 'navires']}
                largeurMin={1180}
                vide={
                    ref.recherche
                        ? 'Aucun navire ne correspond à la recherche.'
                        : 'Aucun navire — ajoutez-en un avec « Nouveau navire ».'
                }
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                apercu={
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: '#5A6478',
                        }}
                    >
                        <span
                            style={{
                                width: 11,
                                height: 11,
                                borderRadius: 3,
                                background: '#7EC8F0',
                                flex: 'none',
                            }}
                        />
                        Type &amp; mode d’exploitation : lus par le moteur de
                        calcul
                    </span>
                }
                note="Le mode d’exploitation porté ici n’est qu’une valeur par défaut : elle est recopiée sur l’escale à sa création, et seule l’escale fait foi pour la facturation."
                entete={
                    <tr>
                        <Th first>Navire</Th>
                        <Th w={200} accent>
                            Type
                        </Th>
                        <Th w={170}>Mode d’exploitation</Th>
                        <Th>Armement rattaché</Th>
                        <Th w={140}>Pavillon</Th>
                        <Th w={120}>Code IMO</Th>
                        <Th w={120}>Statut</Th>
                        <Th w={104} center>
                            Actions
                        </Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((n) => (
                    <tr key={n.id} className="ea-row">
                        <TdTitre icon={<ShipIcon />}>{n.name}</TdTitre>
                        <Td
                            style={{
                                borderLeft: '3px solid #7EC8F0',
                                background: '#FBFDFF',
                            }}
                        >
                            {n.type_navire_code ? (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 7,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#3A4356',
                                            background: '#EEF1F7',
                                            border: '1px solid #D8DEE9',
                                            borderRadius: 5,
                                            padding: '2px 7px',
                                        }}
                                    >
                                        {n.type_navire_code}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {n.type_navire_name}
                                    </span>
                                </span>
                            ) : (
                                <Vide />
                            )}
                        </Td>
                        <Td>
                            <ModeBadge mode={n.mode_exploitation_defaut} />
                        </Td>
                        <Td>{n.armement_name ?? <Vide />}</Td>
                        <Td>{n.pays_name ?? <Vide />}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {n.imo ?? <Vide />}
                        </Td>
                        <Td>
                            <StatutBadge actif={n.actif} />
                        </Td>
                        <RowActions
                            actif={n.actif}
                            onEdit={() => ref.ouvrirEdition(n)}
                            onToggle={() => ref.demanderBascule(n)}
                        />
                    </tr>
                ))}
            </TableCard>

            {ref.mode && (
                <Drawer
                    titre={
                        ref.mode === 'creation'
                            ? 'Nouveau navire'
                            : 'Modifier le navire'
                    }
                    soustitre="Référentiel Navires — lu par le moteur de calcul."
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
                        label="Nom du navire"
                        requis
                        placeholder="ex. Maersk Cadiz"
                        valeur={ref.form.name}
                        onChange={(v) => ref.champ('name', v)}
                        erreur={ref.erreurs.name}
                    />
                    <TextField
                        label="Code IMO"
                        chiffres
                        maxLength={7}
                        placeholder="ex. 9412367"
                        valeur={ref.form.imo}
                        onChange={(v) => ref.champ('imo', v)}
                        erreur={ref.erreurs.imo}
                        aide="Sept chiffres. Facultatif : tous les navires n’ont pas d’IMO."
                    />
                    <SelectField
                        label="Type de navire"
                        valeur={ref.form.type_navire_id}
                        onChange={(v) => ref.champ('type_navire_id', v)}
                        options={optionsTypes}
                        erreur={ref.erreurs.type_navire_id}
                    />

                    <Field
                        label="Mode d’exploitation par défaut"
                        aide="Recopié sur l’escale à sa création ; seul le CGC peut l’y modifier."
                        erreur={ref.erreurs.mode_exploitation_defaut}
                    >
                        <div style={{ display: 'flex', gap: 8 }}>
                            {MODES.map((mode) => {
                                const actif =
                                    ref.form.mode_exploitation_defaut === mode;

                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() =>
                                            ref.champ(
                                                'mode_exploitation_defaut',
                                                actif ? null : mode,
                                            )
                                        }
                                        style={{
                                            flex: 1,
                                            height: 36,
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            fontSize: 12.5,
                                            fontWeight: 700,
                                            border: `1px solid ${actif ? '#1D3E9C' : '#D8DEE9'}`,
                                            background: actif
                                                ? '#EEF3FF'
                                                : '#fff',
                                            color: actif
                                                ? '#1D3E9C'
                                                : '#5A6478',
                                        }}
                                    >
                                        {MODE_LABEL[mode]}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>

                    <SelectField
                        label="Armement rattaché"
                        valeur={ref.form.armement_id}
                        onChange={(v) => ref.champ('armement_id', v)}
                        options={optionsArmements}
                        erreur={ref.erreurs.armement_id}
                    />
                    <SelectField
                        label="Pavillon"
                        valeur={ref.form.pays_id}
                        onChange={(v) => ref.champ('pays_id', v)}
                        options={optionsPays}
                        erreur={ref.erreurs.pays_id}
                    />
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
