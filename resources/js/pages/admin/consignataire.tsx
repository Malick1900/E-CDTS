import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { BlocFiche, BlocVide, CarteRattachement, FicheEntete, LARGEUR_FICHE, pastilleStyle, RetourListe, ThFiche } from '@/components/admin/fiche';
import { BadgeAlerte, StatutBadge, Td } from '@/components/admin/ui';
import { AgentArmBadges, avatarStyle, initials, STATUT_META } from '@/components/admin/users/agents-ui';
import RemplacerTitulaire from '@/components/admin/users/remplacer-titulaire';
import type { AgentFiche, ArmementRepresente, ConsignataireFiche, PortRattache } from '@/components/admin/users/types';

/*
 * Fiche d'une société consignataire.
 *
 * Elle existe parce qu'une ligne de tableau ne peut pas porter trente armements
 * ni la liste des comptes d'une société : la liste résume, la fiche déplie.
 *
 * Ce qu'elle ne fait pas : décider du sort d'un compte agent. Valider, refuser,
 * réexaminer et affecter vivent dans l'onglet Agents avec leurs règles
 * d'enchaînement ; les rejouer ici ferait deux endroits à tenir d'accord pour un
 * même geste. La fiche montre l'état, et conduit là où il se décide.
 */

const LISTE = '/admin/utilisateurs?tab=consignataires';

type Props = {
    consignataire: ConsignataireFiche;
    armements: ArmementRepresente[];
    ports: PortRattache[];
    agents: AgentFiche[];
    /** Faux pour le Superviseur : la fiche se lit, elle ne s'écrit pas (ADR-0025). */
    peutGerer: boolean;
};

const compte = (n: number, [un, plusieurs]: [string, string]) => `${n} ${n > 1 ? plusieurs : un}`;

const IconeSociete = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="8" width="16" height="12" rx="1.5" stroke="#1D3E9C" strokeWidth="1.6" />
        <path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8M9 12h2M13 12h2M9 15.5h2M13 15.5h2" stroke="#1D3E9C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const IconePort = (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="4.2" r="1.8" stroke="#1D3E9C" strokeWidth="1.5" />
        <path d="M10 6v11M6 10h8M3.6 12.4a6.4 6.4 0 0 0 12.8 0" stroke="#1D3E9C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

/**
 * Le compte maître de la société : sans lui, personne ne peut ouvrir les comptes
 * de ses agents (WF1). Son absence est donc signalée, pas laissée en blanc.
 */
function Titulaire({ fiche, peutGerer, onRemplacer }: { fiche: ConsignataireFiche; peutGerer: boolean; onRemplacer: () => void }) {
    const bouton = !peutGerer ? null : (
        <button
            type="button"
            onClick={onRemplacer}
            className="ea-btn-cancel"
            style={{ height: 26, padding: '0 10px', border: '1px solid #C3CBDA', borderRadius: 5, background: '#fff', color: '#3A4356', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
            {fiche.titulaire_user_id === null ? 'Désigner' : 'Remplacer'}
        </button>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid #E7EBF2' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: '#8A93A6', textTransform: 'uppercase' }}>Titulaire du compte</span>
            {fiche.titulaire_user_id === null ? (
                <span style={{ fontSize: 12.5, color: '#B26200' }}>À désigner — personne ne peut créer les comptes des agents.</span>
            ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}>{fiche.titulaire_name}</span>
                    <span style={{ fontSize: 11.5, color: '#8A93A6' }}>{fiche.titulaire_email}</span>
                    {fiche.titulaire_job_title && <span style={{ fontSize: 11.5, color: '#8A93A6' }}>· {fiche.titulaire_job_title}</span>}
                </div>
            )}
            <div style={{ flex: 1 }} />
            {bouton}
        </div>
    );
}

export default function ConsignataireFichePage({ consignataire, armements = [], ports = [], agents = [], peutGerer = false }: Props) {
    const [remplace, setRemplace] = useState(false);

    const enAttente = agents.filter((a) => a.statut === 'en_attente').length;

    return (
        <>
            <Head title={`${consignataire.name} — Utilisateurs & habilitations`} />
            <AdminShell
                module="users"
                title="Utilisateurs & habilitations"
                subtitle="Fiche d’une société cliente : armements représentés, ports de rattachement et comptes de ses agents."
                crumbSub={consignataire.name}
            >
                <div style={{ padding: '16px 26px 28px', maxWidth: LARGEUR_FICHE }}>
                    <RetourListe href={LISTE}>Consignataires</RetourListe>

                    <FicheEntete
                        icone={IconeSociete}
                        titre={consignataire.name}
                        metas={[consignataire.sigle, consignataire.pays_immatriculation_name, consignataire.rccm_nif, consignataire.email, consignataire.telephone]}
                        aside={<StatutBadge actif={consignataire.actif} />}
                    >
                        <Titulaire fiche={consignataire} peutGerer={peutGerer} onRemplacer={() => setRemplace(true)} />
                    </FicheEntete>

                    <BlocFiche
                        titre="Armements représentés"
                        compte={compte(armements.length, ['armement', 'armements'])}
                        note={
                            <>
                                Relation <strong style={{ fontWeight: 700, color: '#5A6478' }}>N-N</strong> : un armement peut être représenté par plusieurs
                                sociétés, et les agents de celle-ci n’opèrent que sur les armements ci-dessus. Le rattachement se modifie depuis « Modifier »
                                dans la liste des consignataires.
                            </>
                        }
                    >
                        {armements.length === 0 ? (
                            <BlocVide>Aucun armement représenté — cette société ne peut consigner aucune escale.</BlocVide>
                        ) : (
                            armements.map((a) => (
                                <CarteRattachement
                                    key={a.id}
                                    pastille={<div style={pastilleStyle}>{(a.sigle ?? a.name.slice(0, 3)).toUpperCase()}</div>}
                                    titre={a.name}
                                    soustitre={a.pays_origine_name}
                                    badge={a.partage ? <BadgeAlerte majuscules>Partagé</BadgeAlerte> : undefined}
                                />
                            ))
                        )}
                    </BlocFiche>

                    <BlocFiche titre="Ports de rattachement" compte={compte(ports.length, ['port', 'ports'])}>
                        {ports.length === 0 ? (
                            <BlocVide>Aucun port de rattachement.</BlocVide>
                        ) : (
                            ports.map((p) => (
                                <CarteRattachement
                                    key={p.id}
                                    pastille={<div style={pastilleStyle}>{p.code ?? IconePort}</div>}
                                    titre={p.name}
                                    soustitre={p.pays_name}
                                />
                            ))
                        )}
                    </BlocFiche>

                    <BlocFiche
                        titre="Comptes agents créés par cette société"
                        compte={compte(agents.length, ['compte', 'comptes'])}
                        badge={enAttente > 0 ? <BadgeAlerte>{compte(enAttente, ['en attente', 'en attente'])}</BadgeAlerte> : undefined}
                        action={
                            agents.length === 0 ? undefined : (
                                <Link
                                    href={`/admin/utilisateurs?tab=agents&q=${encodeURIComponent(consignataire.name)}`}
                                    className="ea-btn-cancel"
                                    style={{ height: 32, padding: '0 12px', border: '1px solid #C3CBDA', borderRadius: 6, background: '#fff', color: '#1D3E9C', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    {enAttente > 0 ? 'Traiter les comptes en attente' : 'Gérer ces comptes'}
                                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                        <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            )
                        }
                        plat
                        note="Les décisions — valider, refuser, réexaminer, affecter — se prennent dans l’onglet « Agents consignataires », où elles sont tracées (ADR-0024)."
                    >
                        {agents.length === 0 ? (
                            <div style={{ padding: '18px', fontSize: 12.5, color: '#8A93A6' }}>
                                Aucun compte agent. {consignataire.titulaire_user_id === null ? 'Désignez d’abord un titulaire : c’est lui qui les crée.' : 'Le titulaire les crée depuis son espace ; le CGC les valide.'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: 820, borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <ThFiche>Agent</ThFiche>
                                            <ThFiche>Armements affectés</ThFiche>
                                            <ThFiche w={140}>Statut</ThFiche>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.map((a) => {
                                            const meta = STATUT_META[a.statut];

                                            return (
                                                <tr key={a.id} className="ea-row">
                                                    <Td style={{ padding: '10px 18px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={avatarStyle(a.statut)}>{initials(a.name)}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}>
                                                                    {a.name}
                                                                    {a.est_titulaire && (
                                                                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#1D3E9C', background: '#EEF3FF', border: '1px solid #C3D0F0', borderRadius: 4, padding: '1px 6px' }}>
                                                                            Titulaire
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span style={{ fontSize: 11, color: '#5A6478' }}>{a.email}</span>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <AgentArmBadges armements={a.armements} />
                                                    </Td>
                                                    <Td>
                                                        <span style={meta.pill}>
                                                            <span style={meta.dot} />
                                                            {meta.label}
                                                        </span>
                                                    </Td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </BlocFiche>
                </div>
            </AdminShell>

            {remplace ? <RemplacerTitulaire consignataire={consignataire} onFermer={() => setRemplace(false)} /> : null}
        </>
    );
}
