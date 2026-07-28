import ConfirmDialog from './confirm-dialog';
import { Drawer, TextField } from './drawer';
import ReferentielCard from './referentiel-card';
import { PAR_PAGE  } from './types';
import type {TypeNavireRow} from './types';
import { CodeChip, RowActions, StatutBadge, Td, Th, Vide } from './ui';
import { useReferentiel } from './use-referentiel';

/*
 * Référentiel Types de navire — alimente la qualification du navire, elle-même
 * lue par le moteur de calcul.
 */

type Form = { code: string; name: string };

const VIERGE: Form = { code: '', name: '' };

const filtre = (t: TypeNavireRow, q: string) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);

const depuis = (t: TypeNavireRow): Form => ({ code: t.code, name: t.name });

const valide = (f: Form) => f.code.trim() !== '' && f.name.trim() !== '';

const bascule = (t: TypeNavireRow, prochain: boolean) => ({
    titre: prochain ? 'Réactiver ce type ?' : 'Désactiver ce type ?',
    corps: prochain
        ? 'Le type redeviendra sélectionnable à la saisie des navires.'
        : 'Un type inactif n’est plus proposé à la saisie des navires. Les navires déjà rattachés ne sont pas affectés.',
    statLabel: 'Type',
    statValue: `${t.code} — ${t.name}`,
});

export default function TypesNavireTab({ typesNavire, signalCreation }: { typesNavire: TypeNavireRow[]; signalCreation: number }) {
    const ref = useReferentiel({ ressource: 'types-navire', lignes: typesNavire, filtre, vierge: VIERGE, depuis, valide, bascule, signalCreation });

    return (
        <>
            <ReferentielCard
                recherche={ref.recherche}
                onRecherche={ref.setRecherche}
                placeholder="Rechercher un type, un code…"
                total={ref.total}
                unite={['type', 'types']}
                largeurMin={720}
                vide={ref.recherche ? 'Aucun type ne correspond à la recherche.' : 'Aucun type de navire — ajoutez-en un avec « Nouveau type ».'}
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                note="Référentiel extensible. Un type peut être désactivé — il disparaît alors de la saisie — mais jamais supprimé : les navires déjà rattachés restent intacts."
                entete={
                    <tr>
                        <Th w={110} first>Code</Th>
                        <Th>Désignation</Th>
                        <Th w={140}>Navires</Th>
                        <Th w={120}>Statut</Th>
                        <Th w={104} center>Actions</Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((t) => (
                    <tr key={t.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <CodeChip>{t.code}</CodeChip>
                        </Td>
                        <Td style={{ fontSize: 13, color: '#1A1F2E' }}>{t.name}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums', color: '#5A6478' }}>
                            {t.navires_count === 0 ? <Vide /> : `${t.navires_count} navire${t.navires_count > 1 ? 's' : ''}`}
                        </Td>
                        <Td>
                            <StatutBadge actif={t.actif} />
                        </Td>
                        <RowActions actif={t.actif} onEdit={() => ref.ouvrirEdition(t)} onToggle={() => ref.demanderBascule(t)} />
                    </tr>
                ))}
            </ReferentielCard>

            {ref.mode && (
                <Drawer
                    titre={ref.mode === 'creation' ? 'Nouveau type de navire' : 'Modifier le type de navire'}
                    soustitre="Référentiel Types de navire."
                    valider={ref.mode === 'creation' ? 'Enregistrer' : 'Mettre à jour'}
                    peutValider={ref.peutValider}
                    enCours={ref.enCours}
                    onFermer={ref.fermer}
                    onValider={ref.valider}
                >
                    <TextField label="Code" requis majuscules maxLength={20} placeholder="ex. PC" valeur={ref.form.code} onChange={(v) => ref.champ('code', v)} erreur={ref.erreurs.code} aide="Abréviation courte, unique dans le référentiel." />
                    <TextField label="Désignation" requis placeholder="ex. Porte-conteneurs" valeur={ref.form.name} onChange={(v) => ref.champ('name', v)} erreur={ref.erreurs.name} />
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
