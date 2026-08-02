import { useMemo, useState } from 'react';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import { BadgeAlerte, Td, Th, Vide } from '@/components/admin/ui';
import type { MonAgentRow, MonArmementRow } from './types';

/*
 * « Mes armements » — les compagnies que la société représente au port
 * (ADR-0014).
 *
 * Écran en lecture seule, et il le restera : c'est le CGC qui rattache un
 * armement à une fiche société, sur pièces. La société n'en choisit pas la
 * liste, elle en répartit la charge.
 *
 * La fiche de l'armement y est donnée en entier — pavillon, immatriculation,
 * gérant, siège. Le consignataire est le mandataire de cette compagnie au
 * port : ces mentions sont celles avec lesquelles il correspond et engage son
 * mandant. S'y ajoute ce que lui seul peut savoir : combien de ses agents
 * couvrent l'armement, et lesquels. Un armement sans agent est un angle mort ;
 * il est signalé.
 */

/** Ce qu'on nomme avant de renvoyer au compteur — au-delà, la liste noierait la ligne. */
const NOMS_AFFICHES = 3;

export default function ArmementsTab({
    agents,
    armements,
}: {
    agents: MonAgentRow[];
    armements: MonArmementRow[];
}) {
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);

    /*
     * Lecture inverse de la matrice d'affectation : qui couvre quoi. Sur les
     * seuls accès ouverts, comme la matrice — un agent suspendu garde ses
     * affectations, mais ne déclare pas ; le compter ferait croire l'armement
     * couvert alors que personne n'y touche.
     */
    const parArmement = useMemo(() => {
        const carte = new Map<number, string[]>();

        for (const agent of agents) {
            if (agent.statut !== 'actif') {
                continue;
            }

            for (const armement of agent.armements) {
                const noms = carte.get(armement.id);

                if (noms === undefined) {
                    carte.set(armement.id, [agent.name]);
                } else {
                    noms.push(agent.name);
                }
            }
        }

        return carte;
    }, [agents]);

    const filtres = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return q === ''
            ? armements
            : armements.filter(
                  (a) =>
                      a.name.toLowerCase().includes(q) ||
                      (a.sigle?.toLowerCase().includes(q) ?? false) ||
                      (a.pays_origine?.toLowerCase().includes(q) ?? false) ||
                      (a.gerant?.toLowerCase().includes(q) ?? false) ||
                      (a.rccm_nif?.toLowerCase().includes(q) ?? false),
              );
    }, [armements, recherche]);

    const total = filtres.length;
    const pageCourante = Math.min(
        page,
        Math.max(1, Math.ceil(total / PAR_PAGE)),
    );
    const lignes = useMemo(
        () =>
            filtres.slice(
                (pageCourante - 1) * PAR_PAGE,
                pageCourante * PAR_PAGE,
            ),
        [filtres, pageCourante],
    );

    return (
        <TableCard
            recherche={recherche}
            onRecherche={(v) => {
                setRecherche(v);
                setPage(1);
            }}
            placeholder="Rechercher un nom, un sigle, un gérant, un RCCM…"
            total={total}
            unite={['armement', 'armements']}
            largeurMin={1290}
            vide={
                armements.length === 0
                    ? 'Votre société ne représente aucun armement. C’est le CGC qui les rattache à votre fiche.'
                    : 'Aucun armement ne correspond à cette recherche.'
            }
            page={pageCourante}
            parPage={PAR_PAGE}
            onPage={setPage}
            note="Cette liste est tenue par le CGC : pour représenter un armement de plus, adressez-lui la demande. Seuls les agents dont l’accès est ouvert sont comptés — un armement que personne ne couvre n’apparaîtra dans l’espace d’aucun de vos agents."
            entete={
                <tr>
                    <Th first>Armement</Th>
                    <Th w={140}>Pavillon</Th>
                    <Th w={180}>Immatriculation</Th>
                    <Th w={160}>Gérant</Th>
                    <Th w={210}>Siège</Th>
                    <Th w={110}>Navires</Th>
                    <Th w={230}>Agents affectés</Th>
                </tr>
            }
        >
            {lignes.map((armement) => {
                const noms = parArmement.get(armement.id) ?? [];

                return (
                    <tr key={armement.id} className="ea-row">
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
                                        minWidth: 44,
                                        height: 32,
                                        padding: '0 9px',
                                        borderRadius: 8,
                                        background: '#EAF1FC',
                                        border: '1px solid #CFE0F7',
                                        color: '#1D3E9C',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        letterSpacing: '.02em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {armement.sigle ??
                                        armement.name.slice(0, 3).toUpperCase()}
                                </div>
                                <span
                                    style={{
                                        fontSize: 13.5,
                                        fontWeight: 700,
                                        color: '#1A1F2E',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    {armement.name}
                                    {armement.actif ? null : (
                                        <BadgeAlerte majuscules>
                                            Désactivé
                                        </BadgeAlerte>
                                    )}
                                </span>
                            </div>
                        </Td>

                        <Td>{armement.pays_origine ?? <Vide />}</Td>

                        <Td>
                            {armement.rccm_nif === null &&
                            armement.pays_immatriculation === null ? (
                                <Vide />
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            color: '#1A1F2E',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {armement.rccm_nif ?? '—'}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {armement.pays_immatriculation ??
                                            'Pays non précisé'}
                                    </span>
                                </div>
                            )}
                        </Td>

                        <Td>{armement.gerant ?? <Vide />}</Td>

                        <Td>{armement.adresse ?? <Vide />}</Td>

                        <Td style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {armement.navires === 0 ? (
                                <span style={{ color: '#8A93A6' }}>Aucun</span>
                            ) : (
                                <>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {armement.navires}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {armement.navires > 1
                                            ? ' navires'
                                            : ' navire'}
                                    </span>
                                </>
                            )}
                        </Td>

                        <Td>
                            {noms.length === 0 ? (
                                <BadgeAlerte>Aucun agent affecté</BadgeAlerte>
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {noms.length} agent
                                        {noms.length > 1 ? 's' : ''}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {noms
                                            .slice(0, NOMS_AFFICHES)
                                            .join(' · ')}
                                        {noms.length > NOMS_AFFICHES
                                            ? ` +${noms.length - NOMS_AFFICHES}`
                                            : ''}
                                    </span>
                                </div>
                            )}
                        </Td>
                    </tr>
                );
            })}
        </TableCard>
    );
}
