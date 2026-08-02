import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import { card, Td, Th } from '@/components/admin/ui';
import { avatarStyle, initials } from '@/components/admin/users/agents-ui';
import type { ArmementBadge } from '@/components/admin/users/types';
import type { MonAgentRow } from './types';

/*
 * « Affectations » — qui déclare pour quel armement (ADR-0009).
 *
 * Une matrice plutôt qu'un tiroir par agent : la question que se pose un
 * titulaire n'est pas « que fait Untel ? » mais « qui couvre cet armement ? »,
 * et seule une vue croisée y répond d'un coup d'œil. Une case = une ligne du
 * pivot, cochée ou non ; il n'y a rien à enregistrer.
 *
 * Seuls les agents dont l'accès est ouvert y figurent : affecter un armement à
 * un compte que le CGC n'a pas validé, ou dont l'accès est suspendu, n'aurait
 * aucun effet. Les affectations d'un agent suspendu sont conservées et
 * réapparaissent avec lui.
 */

/** Largeur d'une colonne d'armement — assez pour un sigle, pas plus. */
const COLONNE = 118;

export default function AffectationsTab({
    agents,
    armements,
}: {
    agents: MonAgentRow[];
    armements: ArmementBadge[];
}) {
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);
    /** La case en cours d'aller-retour, pour ne pas la faire cliquer deux fois. */
    const [enCours, setEnCours] = useState<string | null>(null);

    const actifs = useMemo(
        () => agents.filter((a) => a.statut === 'actif'),
        [agents],
    );

    const filtres = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return q === ''
            ? actifs
            : actifs.filter(
                  (a) =>
                      a.name.toLowerCase().includes(q) ||
                      a.email.toLowerCase().includes(q),
              );
    }, [actifs, recherche]);

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

    const basculer = (agent: MonAgentRow, armement: ArmementBadge) => {
        const cle = `${agent.id}-${armement.id}`;

        if (enCours !== null) {
            return;
        }

        router.patch(
            `/mon-espace/affectations/${agent.id}/${armement.id}`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setEnCours(cle),
                onFinish: () => setEnCours(null),
            },
        );
    };

    // Sans colonne, la matrice n'a pas de sens : on dit pourquoi plutôt que
    // d'afficher un tableau amputé de sa moitié.
    if (armements.length === 0) {
        return (
            <div style={{ padding: '18px 26px 26px' }}>
                <div
                    style={{
                        ...card,
                        padding: '44px 24px',
                        textAlign: 'center',
                        color: '#8A93A6',
                        fontSize: 13,
                        lineHeight: 1.6,
                    }}
                >
                    Votre société ne représente aucun armement pour le moment.
                    <br />
                    C’est le CGC qui les rattache à votre fiche — les
                    affectations deviendront possibles ensuite.
                </div>
            </div>
        );
    }

    return (
        <TableCard
            recherche={recherche}
            onRecherche={(v) => {
                setRecherche(v);
                setPage(1);
            }}
            placeholder="Rechercher un agent…"
            total={total}
            unite={['agent actif', 'agents actifs']}
            largeurMin={320 + COLONNE * armements.length}
            vide={
                actifs.length === 0
                    ? 'Aucun agent actif. Un agent reçoit ses affectations une fois son compte validé par le CGC.'
                    : 'Aucun agent ne correspond à cette recherche.'
            }
            page={pageCourante}
            parPage={PAR_PAGE}
            onPage={setPage}
            note="Une affectation dit sur quels armements un agent peut déclarer — elle ne lui donne aucun droit supplémentaire. Un agent sans affectation se connecte, mais ne voit aucune escale. Seuls les agents dont l'accès est ouvert figurent ici ; les affectations d'un agent suspendu sont conservées et reviennent avec lui."
            entete={
                <tr>
                    <Th first>Agent</Th>
                    {armements.map((a) => (
                        <Th key={a.id} w={COLONNE} center>
                            {a.sigle ?? a.name}
                        </Th>
                    ))}
                </tr>
            }
        >
            {lignes.map((agent) => {
                const affectes = new Set(agent.armements.map((a) => a.id));

                return (
                    <tr key={agent.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 11,
                                }}
                            >
                                <div style={avatarStyle(agent.statut)}>
                                    {initials(agent.name)}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13.5,
                                            fontWeight: 700,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {agent.name}
                                        {agent.est_moi ? (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: '#1D3E9C',
                                                    background: '#EAF1FC',
                                                    border: '1px solid #CFE0F7',
                                                    borderRadius: 5,
                                                    padding: '1px 6px',
                                                }}
                                            >
                                                Vous · titulaire
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {affectes.size === 0
                                            ? 'Aucun armement'
                                            : `${affectes.size} armement${affectes.size > 1 ? 's' : ''}`}
                                        {agent.job_title
                                            ? ` · ${agent.job_title}`
                                            : ''}
                                    </span>
                                </div>
                            </div>
                        </Td>

                        {armements.map((armement) => {
                            const coche = affectes.has(armement.id);
                            const attente =
                                enCours === `${agent.id}-${armement.id}`;

                            return (
                                <Td
                                    key={armement.id}
                                    style={{ textAlign: 'center' }}
                                >
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={coche}
                                        aria-label={`${armement.name} — ${agent.name}`}
                                        title={armement.name}
                                        disabled={enCours !== null}
                                        onClick={() =>
                                            basculer(agent, armement)
                                        }
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 5,
                                            border: `1px solid ${coche ? '#1D3E9C' : '#C3CBDA'}`,
                                            background: coche
                                                ? '#1D3E9C'
                                                : '#fff',
                                            color: '#fff',
                                            cursor:
                                                enCours === null
                                                    ? 'pointer'
                                                    : 'progress',
                                            opacity: attente ? 0.5 : 1,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                        }}
                                    >
                                        {coche ? (
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                            >
                                                <path
                                                    d="M3.5 8.5l3 3 6-7"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        ) : null}
                                    </button>
                                </Td>
                            );
                        })}
                    </tr>
                );
            })}
        </TableCard>
    );
}
