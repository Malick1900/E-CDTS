import ConfirmDialog from '@/components/admin/confirm-dialog';
import { Drawer, SelectField, TextField } from '@/components/admin/drawer';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import type { Option } from '@/components/admin/types';
import { CodeChip, RowActions, StatutBadge, Td, TdTitre, Th, Vide } from '@/components/admin/ui';
import { useCrudTab } from '@/components/admin/use-crud-tab';
import type { PortRow } from './types';
import { PortIcon } from './ui';

/*
 * Référentiel Ports d'escale (code UN/LOCODE). Le préfixe de numérotation est
 * destiné à préfixer les numéros de dossier par port ; il reste facultatif tant
 * que la règle de numérotation n'est pas figée.
 */

type Form = { name: string; code: string; pays_id: number | null; prefixe_numerotation: string };

const VIERGE: Form = { name: '', code: '', pays_id: null, prefixe_numerotation: '' };

const filtre = (p: PortRow, q: string) =>
    p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.pays_name ?? '').toLowerCase().includes(q);

const depuis = (p: PortRow): Form => ({
    name: p.name,
    code: p.code,
    pays_id: p.pays_id,
    prefixe_numerotation: p.prefixe_numerotation ?? '',
});

const valide = (f: Form) => f.name.trim() !== '' && f.code.trim() !== '';

const bascule = (p: PortRow, prochain: boolean) => ({
    titre: prochain ? 'Réactiver ce port ?' : 'Désactiver ce port ?',
    corps: prochain
        ? 'Le port redeviendra sélectionnable pour les nouvelles escales.'
        : 'Un port inactif n’est plus proposé à l’ouverture des dossiers d’escale. Les escales en cours ne sont pas affectées.',
    statLabel: 'Port',
    statValue: `${p.name} · ${p.code}`,
});

export default function PortsTab({ ports, optionsPays, signalCreation }: { ports: PortRow[]; optionsPays: Option[]; signalCreation: number }) {
    const ref = useCrudTab({ base: '/admin/referentiels/ports', lignes: ports, filtre, vierge: VIERGE, depuis, valide, bascule, signalCreation });

    return (
        <>
            <TableCard
                recherche={ref.recherche}
                onRecherche={ref.setRecherche}
                placeholder="Rechercher un port, un code…"
                total={ref.total}
                unite={['port', 'ports']}
                largeurMin={880}
                vide={ref.recherche ? 'Aucun port ne correspond à la recherche.' : 'Aucun port — ajoutez-en un avec « Nouveau port ».'}
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                note="Le code UN/LOCODE identifie le port à l’international. Un port se désactive plutôt qu’il ne se supprime : les escales déjà ouvertes restent intactes."
                entete={
                    <tr>
                        <Th first>Port</Th>
                        <Th w={170}>Code UN/LOCODE</Th>
                        <Th w={160}>Pays</Th>
                        <Th w={150}>Préfixe dossier</Th>
                        <Th w={120}>Statut</Th>
                        <Th w={104} center>Actions</Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((p) => (
                    <tr key={p.id} className="ea-row">
                        <TdTitre icon={<PortIcon />}>{p.name}</TdTitre>
                        <Td>
                            <CodeChip>{p.code}</CodeChip>
                        </Td>
                        <Td>{p.pays_name ?? <Vide />}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.prefixe_numerotation ?? <Vide />}</Td>
                        <Td>
                            <StatutBadge actif={p.actif} />
                        </Td>
                        <RowActions actif={p.actif} onEdit={() => ref.ouvrirEdition(p)} onToggle={() => ref.demanderBascule(p)} />
                    </tr>
                ))}
            </TableCard>

            {ref.mode && (
                <Drawer
                    titre={ref.mode === 'creation' ? 'Nouveau port' : 'Modifier le port'}
                    soustitre="Référentiel Ports — code UN/LOCODE."
                    valider={ref.mode === 'creation' ? 'Enregistrer' : 'Mettre à jour'}
                    peutValider={ref.peutValider}
                    enCours={ref.enCours}
                    onFermer={ref.fermer}
                    onValider={ref.valider}
                >
                    <TextField label="Nom du port" requis placeholder="ex. Owendo" valeur={ref.form.name} onChange={(v) => ref.champ('name', v)} erreur={ref.erreurs.name} />
                    <TextField label="Code UN/LOCODE" requis majuscules maxLength={10} placeholder="ex. GAOWE" valeur={ref.form.code} onChange={(v) => ref.champ('code', v)} erreur={ref.erreurs.code} aide="Identifiant international du port, unique dans le référentiel." />
                    <SelectField label="Pays" valeur={ref.form.pays_id} onChange={(v) => ref.champ('pays_id', v)} options={optionsPays} erreur={ref.erreurs.pays_id} />
                    <TextField label="Préfixe de numérotation" majuscules maxLength={10} placeholder="ex. OWE" valeur={ref.form.prefixe_numerotation} onChange={(v) => ref.champ('prefixe_numerotation', v)} erreur={ref.erreurs.prefixe_numerotation} aide="Préfixe des numéros de dossier ouverts sur ce port. Facultatif." />
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
