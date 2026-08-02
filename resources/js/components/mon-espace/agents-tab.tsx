import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/components/admin/confirm-dialog';
import type { ConfirmEtat } from '@/components/admin/confirm-dialog';
import { Drawer, Field, TextField } from '@/components/admin/drawer';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import { fieldSelect, iconBtn, Td, Th } from '@/components/admin/ui';
import {
    AgentArmBadges,
    avatarStyle,
    initials,
    STATUT_META,
} from '@/components/admin/users/agents-ui';
import type { AgentStatut } from '@/components/admin/users/types';
import type { MonAgentRow } from './types';

/*
 * « Mes agents » — les comptes de la société, tenus par son titulaire.
 *
 * La société propose, le CGC dispose (ADR-0013) : on crée ici une demande, pas
 * un accès. D'où un compte créé inactif, en attente, et sans mot de passe —
 * l'agent définira le sien depuis le lien reçu une fois la demande validée.
 *
 * Quatre états possibles, et le refus en fait partie : le montrer avec son
 * motif est ce qui permet de corriger puis de soumettre à nouveau. L'escamoter
 * laisserait le titulaire attendre indéfiniment une réponse déjà donnée.
 */

type Form = {
    first_name: string;
    last_name: string;
    phone: string;
    job_title: string;
    email: string;
};

const dates = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
});

const FILTRES: Array<{ value: AgentStatut | 'tous'; label: string }> = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente du CGC' },
    { value: 'actif', label: 'Actifs' },
    { value: 'desactive', label: 'Suspendus' },
    { value: 'refuse', label: 'Refusés' },
];

export default function AgentsTab({ agents }: { agents: MonAgentRow[] }) {
    const [recherche, setRecherche] = useState('');
    const [filtre, setFiltre] = useState<AgentStatut | 'tous'>('tous');
    const [page, setPage] = useState(1);

    const [mode, setMode] = useState<'creation' | 'edition' | null>(null);
    const [edite, setEdite] = useState<MonAgentRow | null>(null);
    const [form, setForm] = useState<Form>(vierge());
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [enCours, setEnCours] = useState(false);
    const [confirm, setConfirm] = useState<ConfirmEtat | null>(null);

    const filtres = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return agents.filter((a) => {
            if (filtre !== 'tous' && a.statut !== filtre) {
                return false;
            }

            return (
                q === '' ||
                a.name.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q)
            );
        });
    }, [agents, filtre, recherche]);

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

    const champ = (cle: keyof Form, valeur: string) =>
        setForm((precedent) => ({ ...precedent, [cle]: valeur }));

    // L'adresse ne se corrige plus une fois le compte validé : elle désigne la
    // personne à qui l'accès a été accordé (règle tenue par le serveur).
    const emailFige = mode === 'edition' && edite?.statut !== 'en_attente';

    const peutValider =
        form.first_name.trim() !== '' &&
        form.last_name.trim() !== '' &&
        form.phone.trim() !== '' &&
        form.job_title.trim() !== '' &&
        (emailFige || form.email.trim() !== '');

    const options = {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setEnCours(true),
        onFinish: () => setEnCours(false),
    };

    const valider = () => {
        if (!peutValider || enCours || mode === null) {
            return;
        }

        const suite = {
            ...options,
            onSuccess: () => {
                setMode(null);
                setErreurs({});
            },
            onError: (e: Record<string, string>) => setErreurs(e),
        };

        if (mode === 'creation') {
            router.post('/mon-espace/agents', form, suite);
        } else {
            router.patch(`/mon-espace/agents/${edite?.id}`, form, suite);
        }
    };

    const ouvrirCreation = () => {
        setForm(vierge());
        setErreurs({});
        setEdite(null);
        setMode('creation');
    };

    const ouvrirEdition = (agent: MonAgentRow) => {
        setForm({
            first_name: agent.first_name ?? '',
            last_name: agent.last_name ?? '',
            phone: agent.phone ?? '',
            job_title: agent.job_title ?? '',
            email: agent.email,
        });
        setErreurs({});
        setEdite(agent);
        setMode('edition');
    };

    const demanderBascule = (agent: MonAgentRow) => {
        const reprise = agent.statut === 'desactive';

        setConfirm({
            titre: reprise ? 'Rétablir cet accès ?' : 'Suspendre cet accès ?',
            corps: reprise
                ? 'L’agent pourra de nouveau se connecter et déclarer sur les armements qui lui sont affectés.'
                : 'L’agent ne pourra plus se connecter. Son compte et ses déclarations sont conservés — l’accès se rétablit d’un clic.',
            libelle: reprise ? 'Rétablir' : 'Suspendre',
            statLabel: 'Agent',
            statValue: `${agent.name} — ${agent.email}`,
            danger: !reprise,
            onOk: () => {
                setConfirm(null);
                router.patch(
                    `/mon-espace/agents/${agent.id}/activation`,
                    {},
                    options,
                );
            },
        });
    };

    const demanderSuppression = (agent: MonAgentRow) => {
        setConfirm({
            titre: 'Supprimer cette demande ?',
            corps: 'Le CGC n’a pas encore examiné ce compte : il disparaît sans laisser de trace. Passé sa décision, un compte ne se supprime plus, il se suspend.',
            libelle: 'Supprimer',
            statLabel: 'Agent',
            statValue: `${agent.name} — ${agent.email}`,
            danger: true,
            onOk: () => {
                setConfirm(null);
                router.delete(`/mon-espace/agents/${agent.id}`, options);
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
                placeholder="Rechercher un nom, un courriel…"
                total={total}
                unite={['agent', 'agents']}
                largeurMin={940}
                vide={
                    agents.length === 0
                        ? 'Aucun agent pour le moment. Créez le premier compte de votre équipe.'
                        : 'Aucun agent ne correspond à ce filtre.'
                }
                page={pageCourante}
                parPage={PAR_PAGE}
                onPage={setPage}
                note="Un compte créé ici part en validation au CGC : il reste inactif tant que la décision n'est pas rendue. Vous ne saisissez aucun mot de passe — l'agent définira le sien depuis le lien qu'il recevra à la validation. Un compte déjà examiné ne se supprime pas : il se suspend, pour que ses déclarations restent rattachées à quelqu'un."
                apercu={
                    <>
                        <select
                            value={filtre}
                            onChange={(e) => {
                                setFiltre(
                                    e.target.value as AgentStatut | 'tous',
                                );
                                setPage(1);
                            }}
                            aria-label="Filtrer par statut"
                            style={{ ...fieldSelect, height: 34, width: 200 }}
                        >
                            {FILTRES.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={ouvrirCreation}
                            className="ea-btn-primary"
                            style={{
                                height: 34,
                                padding: '0 14px',
                                border: 'none',
                                borderRadius: 6,
                                background: '#1D3E9C',
                                color: '#fff',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                flex: 'none',
                            }}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <path
                                    d="M8 3v10M3 8h10"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Créer un agent
                        </button>
                    </>
                }
                entete={
                    <tr>
                        <Th first>Agent</Th>
                        <Th w={230}>Statut</Th>
                        <Th w={210}>Armements affectés</Th>
                        <Th w={150}>Dernière connexion</Th>
                        <Th w={150} center>
                            Actions
                        </Th>
                    </tr>
                }
            >
                {lignes.map((a) => (
                    <tr key={a.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 11,
                                }}
                            >
                                <div style={avatarStyle(a.statut)}>
                                    {initials(a.name)}
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
                                        {a.name}
                                        {a.est_moi ? (
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
                                        {a.email}
                                        {a.job_title ? ` · ${a.job_title}` : ''}
                                    </span>
                                </div>
                            </div>
                        </Td>
                        <Td>
                            <span style={STATUT_META[a.statut].pill}>
                                <span style={STATUT_META[a.statut].dot} />
                                {STATUT_META[a.statut].label}
                            </span>
                            {a.statut === 'refuse' && a.motif_refus ? (
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: '#96271C',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {a.motif_refus}
                                </div>
                            ) : null}
                        </Td>
                        <Td>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 5,
                                }}
                            >
                                <AgentArmBadges armements={a.armements} />
                            </div>
                        </Td>
                        <Td
                            style={{
                                fontSize: 12.5,
                                color: '#3A4356',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {a.last_login_at
                                ? dates.format(new Date(a.last_login_at))
                                : '—'}
                        </Td>
                        <Td>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                {a.est_moi ? (
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#8A93A6',
                                        }}
                                    >
                                        —
                                    </span>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => ouvrirEdition(a)}
                                            title="Modifier la fiche"
                                            aria-label="Modifier la fiche"
                                            className="ea-icon-btn"
                                            style={iconBtn}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                            >
                                                <path
                                                    d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.3"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>

                                        {a.statut === 'refuse' ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.patch(
                                                        `/mon-espace/agents/${a.id}/soumission`,
                                                        {},
                                                        options,
                                                    )
                                                }
                                                className="ea-btn-cancel"
                                                style={{
                                                    height: 30,
                                                    padding: '0 11px',
                                                    border: '1px solid #C3CBDA',
                                                    borderRadius: 6,
                                                    background: '#fff',
                                                    color: '#3A4356',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Soumettre à nouveau
                                            </button>
                                        ) : null}

                                        {a.statut === 'actif' ||
                                        a.statut === 'desactive' ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    demanderBascule(a)
                                                }
                                                title={
                                                    a.statut === 'actif'
                                                        ? 'Suspendre l’accès'
                                                        : 'Rétablir l’accès'
                                                }
                                                aria-label={
                                                    a.statut === 'actif'
                                                        ? 'Suspendre l’accès'
                                                        : 'Rétablir l’accès'
                                                }
                                                className="ea-icon-btn"
                                                style={{
                                                    ...iconBtn,
                                                    color:
                                                        a.statut === 'actif'
                                                            ? '#C0392B'
                                                            : '#0A7D46',
                                                }}
                                            >
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M8 2.2v5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </button>
                                        ) : null}

                                        {a.peut_supprimer ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    demanderSuppression(a)
                                                }
                                                title="Supprimer la demande"
                                                aria-label="Supprimer la demande"
                                                className="ea-icon-danger"
                                                style={{
                                                    ...iconBtn,
                                                    color: '#C0392B',
                                                    borderColor: '#E0B4AD',
                                                }}
                                            >
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8"
                                                        stroke="currentColor"
                                                        strokeWidth="1.3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </Td>
                    </tr>
                ))}
            </TableCard>

            {mode && (
                <Drawer
                    titre={
                        mode === 'creation'
                            ? 'Nouvel agent'
                            : 'Modifier la fiche de l’agent'
                    }
                    soustitre={
                        mode === 'creation'
                            ? 'La demande part en validation au CGC.'
                            : 'Corrections d’état civil et de coordonnées.'
                    }
                    valider={
                        mode === 'creation'
                            ? 'Créer la demande'
                            : 'Mettre à jour'
                    }
                    peutValider={peutValider}
                    enCours={enCours}
                    onFermer={() => {
                        setMode(null);
                        setErreurs({});
                    }}
                    onValider={valider}
                >
                    <TextField
                        label="Prénom"
                        requis
                        maxLength={255}
                        valeur={form.first_name}
                        onChange={(v) => champ('first_name', v)}
                        erreur={erreurs.first_name}
                    />
                    <TextField
                        label="Nom"
                        requis
                        maxLength={255}
                        valeur={form.last_name}
                        onChange={(v) => champ('last_name', v)}
                        erreur={erreurs.last_name}
                    />
                    <TextField
                        label="Fonction"
                        requis
                        maxLength={120}
                        placeholder="ex. Agent de transit"
                        valeur={form.job_title}
                        onChange={(v) => champ('job_title', v)}
                        erreur={erreurs.job_title}
                    />
                    <TextField
                        label="Téléphone"
                        requis
                        maxLength={30}
                        placeholder="ex. +241 01 23 45 67"
                        valeur={form.phone}
                        onChange={(v) => champ('phone', v)}
                        erreur={erreurs.phone}
                    />

                    {emailFige ? (
                        <Field
                            label="Adresse électronique"
                            aide="Non modifiable : le CGC a statué sur ce compte, et l’adresse désigne la personne à qui l’accès a été accordé."
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    color: '#5A6478',
                                    padding: '9px 0',
                                }}
                            >
                                {edite?.email}
                            </span>
                        </Field>
                    ) : (
                        <TextField
                            label="Adresse électronique"
                            requis
                            type="email"
                            autoComplete="off"
                            maxLength={255}
                            placeholder="ex. agent@societe.ga"
                            valeur={form.email}
                            onChange={(v) => champ('email', v)}
                            erreur={erreurs.email}
                            aide="C’est à cette adresse que l’agent recevra son lien de connexion une fois le compte validé."
                        />
                    )}
                </Drawer>
            )}

            <ConfirmDialog etat={confirm} onFermer={() => setConfirm(null)} />
        </>
    );
}

function vierge(): Form {
    return {
        first_name: '',
        last_name: '',
        phone: '',
        job_title: '',
        email: '',
    };
}
