import ConfirmDialog from './confirm-dialog';
import { Drawer, TextField } from './drawer';
import ReferentielCard from './referentiel-card';
import { PAR_PAGE  } from './types';
import type {PaysRow} from './types';
import { CodeChip, RowActions, StatutBadge, Td, Th, Vide } from './ui';
import { useReferentiel } from './use-referentiel';

/*
 * Référentiel Pays (ISO 3166-1 alpha-2) — pavillon des navires, origine et
 * immatriculation des armements, pays des ports.
 */

type Form = { code: string; name: string };

const VIERGE: Form = { code: '', name: '' };

const filtre = (p: PaysRow, q: string) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

const depuis = (p: PaysRow): Form => ({ code: p.code, name: p.name });

const valide = (f: Form) => f.code.trim() !== '' && f.name.trim() !== '';

const bascule = (p: PaysRow, prochain: boolean) => ({
    titre: prochain ? 'Réactiver ce pays ?' : 'Désactiver ce pays ?',
    corps: prochain
        ? 'Le pays redeviendra sélectionnable (pavillon, origine et immatriculation).'
        : 'Un pays inactif n’est plus proposé à la saisie. Les navires, ports et armements déjà rattachés ne sont pas affectés.',
    statLabel: 'Pays',
    statValue: `${p.code} — ${p.name}`,
});

/** « 2 navires · 1 port », ou un tiret si le pays n'est encore utilisé nulle part. */
function utilisations(p: PaysRow) {
    const parts = [
        p.navires_count > 0 ? `${p.navires_count} navire${p.navires_count > 1 ? 's' : ''}` : null,
        p.ports_count > 0 ? `${p.ports_count} port${p.ports_count > 1 ? 's' : ''}` : null,
    ].filter(Boolean);

    return parts.length === 0 ? <Vide /> : parts.join(' · ');
}

export default function PaysTab({ pays, signalCreation }: { pays: PaysRow[]; signalCreation: number }) {
    const ref = useReferentiel({ ressource: 'pays', lignes: pays, filtre, vierge: VIERGE, depuis, valide, bascule, signalCreation });

    return (
        <>
            <ReferentielCard
                recherche={ref.recherche}
                onRecherche={ref.setRecherche}
                placeholder="Rechercher un pays, un code ISO…"
                total={ref.total}
                unite={['pays', 'pays']}
                largeurMin={720}
                vide={ref.recherche ? 'Aucun pays ne correspond à la recherche.' : 'Aucun pays — ajoutez-en un avec « Nouveau pays ».'}
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                note="Un pays peut être désactivé — il disparaît alors de la saisie — mais jamais supprimé : les navires, ports et armements déjà rattachés restent intacts."
                entete={
                    <tr>
                        <Th w={90} first>Code</Th>
                        <Th>Nom du pays</Th>
                        <Th w={170}>Utilisations</Th>
                        <Th w={120}>Statut</Th>
                        <Th w={104} center>Actions</Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((p) => (
                    <tr key={p.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <CodeChip>{p.code}</CodeChip>
                        </Td>
                        <Td style={{ fontSize: 13, color: '#1A1F2E' }}>{p.name}</Td>
                        <Td style={{ fontVariantNumeric: 'tabular-nums', color: '#5A6478' }}>{utilisations(p)}</Td>
                        <Td>
                            <StatutBadge actif={p.actif} />
                        </Td>
                        <RowActions actif={p.actif} onEdit={() => ref.ouvrirEdition(p)} onToggle={() => ref.demanderBascule(p)} />
                    </tr>
                ))}
            </ReferentielCard>

            {ref.mode && (
                <Drawer
                    titre={ref.mode === 'creation' ? 'Nouveau pays' : 'Modifier le pays'}
                    soustitre="Référentiel Pays — code ISO 3166-1 alpha-2."
                    valider={ref.mode === 'creation' ? 'Enregistrer' : 'Mettre à jour'}
                    peutValider={ref.peutValider}
                    enCours={ref.enCours}
                    onFermer={ref.fermer}
                    onValider={ref.valider}
                >
                    <TextField label="Code ISO" requis majuscules maxLength={2} placeholder="ex. GA" valeur={ref.form.code} onChange={(v) => ref.champ('code', v)} erreur={ref.erreurs.code} aide="Deux lettres, norme ISO 3166-1 alpha-2." />
                    <TextField label="Nom du pays" requis placeholder="ex. Gabon" valeur={ref.form.name} onChange={(v) => ref.champ('name', v)} erreur={ref.erreurs.name} />
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
