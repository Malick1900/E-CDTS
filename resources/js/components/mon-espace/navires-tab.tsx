import { useMemo, useState } from 'react';
import { ModeBadge, ShipIcon } from '@/components/admin/referentiels/ui';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import { BadgeAlerte, CodeChip, Td, Th, Vide } from '@/components/admin/ui';
import type { MonNavireRow } from './types';

/*
 * « Mes navires » — la flotte des armements que la société représente.
 *
 * En lecture, comme le reste du dossier tenu par le CGC. Mais en lecture
 * *entière* : ce sont ces navires que la société présentera au port, et c'est
 * sur ces mentions — nom, numéro OMI, pavillon, type — que le manifeste sera
 * rapproché (ADR-0009). Un consignataire qui les découvrirait au moment d'un
 * écart de rapprochement les découvrirait trop tard.
 *
 * Le mode d'exploitation par défaut y figure aussi, bien qu'il ne se modifie
 * pas ici : c'est lui qui sera recopié sur l'escale, et il pèse sur le tarif du
 * bois à l'export. Le montrer, c'est permettre de signaler une valeur fausse
 * avant qu'elle ne fasse une facture fausse.
 */

export default function NaviresTab({ navires }: { navires: MonNavireRow[] }) {
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);

    const filtres = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return q === ''
            ? navires
            : navires.filter(
                  (n) =>
                      n.name.toLowerCase().includes(q) ||
                      (n.imo?.toLowerCase().includes(q) ?? false) ||
                      (n.armement?.toLowerCase().includes(q) ?? false) ||
                      (n.type?.toLowerCase().includes(q) ?? false) ||
                      (n.pavillon?.toLowerCase().includes(q) ?? false),
              );
    }, [navires, recherche]);

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
            placeholder="Rechercher un navire, un n° OMI, un armement…"
            total={total}
            unite={['navire', 'navires']}
            largeurMin={1120}
            vide={
                navires.length === 0
                    ? 'Aucun navire n’est encore rattaché aux armements que vous représentez. Le CGC alimente ce référentiel ; signalez-lui un navire manquant avant son escale.'
                    : 'Aucun navire ne correspond à cette recherche.'
            }
            page={pageCourante}
            parPage={PAR_PAGE}
            onPage={setPage}
            note="Référentiel tenu par le CGC, donné ici en entier : c’est sur ces mentions que votre manifeste sera rapproché. Un navire absent, un n° OMI erroné ou un mode d’exploitation inexact se signale au CGC — mieux vaut avant l’escale qu’au moment de la liquidation."
            entete={
                <tr>
                    <Th first>Navire</Th>
                    <Th w={140}>N° OMI</Th>
                    <Th w={170}>Type</Th>
                    <Th w={150}>Pavillon</Th>
                    <Th w={230}>Armement</Th>
                    <Th w={170}>Mode d’exploitation</Th>
                </tr>
            }
        >
            {lignes.map((navire) => (
                <tr key={navire.id} className="ea-row">
                    <Td style={{ padding: '10px 16px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 11,
                            }}
                        >
                            <ShipIcon />
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
                                {navire.name}
                                {navire.actif ? null : (
                                    <BadgeAlerte majuscules>
                                        Désactivé
                                    </BadgeAlerte>
                                )}
                            </span>
                        </div>
                    </Td>

                    <Td>
                        {navire.imo === null ? (
                            <Vide />
                        ) : (
                            <CodeChip>{navire.imo}</CodeChip>
                        )}
                    </Td>

                    <Td>{navire.type ?? <Vide />}</Td>

                    <Td>{navire.pavillon ?? <Vide />}</Td>

                    <Td>
                        {navire.armement === null ? (
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
                                    }}
                                >
                                    {navire.armement}
                                </span>
                                {navire.armement_sigle ? (
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {navire.armement_sigle}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </Td>

                    <Td>
                        <ModeBadge mode={navire.mode_exploitation} />
                    </Td>
                </tr>
            ))}
        </TableCard>
    );
}
