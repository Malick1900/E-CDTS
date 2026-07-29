import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import type { Option } from '@/components/admin/types';
import AgentsTab from '@/components/admin/users/agents-tab';
import ConsignatairesTab from '@/components/admin/users/consignataires-tab';
import InternesTab from '@/components/admin/users/internes-tab';
import type { UserRow } from '@/components/admin/users/internes-tab';
import RolesTab from '@/components/admin/users/roles-tab';
import type { AgentRow, ConsignataireRow, GroupePermissions, RoleMatriceRow } from '@/components/admin/users/types';

/*
 * Module « Utilisateurs & habilitations ».
 * Page hôte à quatre onglets : Internes CGC, Consignataires (les sociétés),
 * Agents consignataires (leurs comptes, soumis à validation du CGC) et la
 * matrice Rôles & permissions, réservée à qui détient `roles.gerer` (ADR-0025).
 */

type Props = {
    users: UserRow[];
    assignableRoles: string[];
    consignataires: ConsignataireRow[];
    agents: AgentRow[];
    optionsPays: Option[];
    optionsArmements: Option[];
    optionsPorts: Option[];
    /** Faux pour le Superviseur : le volet client passe en consultation seule. */
    peutGererClients: boolean;
    /** Nul sans `roles.gerer` — l'onglet n'existe alors pas (ADR-0025). */
    matriceRoles: RoleMatriceRow[] | null;
    cataloguePermissions: GroupePermissions[];
};

type TabKey = 'internes' | 'consignataires' | 'agents' | 'roles';

const TAB_LABELS: Record<TabKey, string> = {
    internes: 'Internes CGC',
    consignataires: 'Consignataires',
    agents: 'Agents consignataires',
    roles: 'Rôles & permissions',
};

/** Libellé du bouton primaire, par onglet. Ni l'onglet Agents (les comptes sont
 *  créés par les sociétés elles-mêmes) ni l'onglet Rôles (on recompose des rôles
 *  existants, on n'en crée pas — ADR-0025) n'en ont. */
const LIBELLE_AJOUT: Partial<Record<TabKey, string>> = {
    internes: 'Nouvel utilisateur',
    consignataires: 'Nouveau consignataire',
};

/** Garde de l'onglet demandé par l'URL : une clé inconnue retombe sur le défaut. */
const estOnglet = (cle: string | null): cle is TabKey => cle !== null && cle in TAB_LABELS;

export default function Utilisateurs({
    users,
    assignableRoles,
    consignataires = [],
    agents = [],
    optionsPays = [],
    optionsArmements = [],
    optionsPorts = [],
    peutGererClients = false,
    matriceRoles = null,
    cataloguePermissions = [],
}: Props) {
    /*
     * L'onglet et la recherche se lisent dans l'URL, pour que la fiche d'une
     * société puisse renvoyer ici sur *ses* comptes (`?tab=agents&q=…`). Une
     * valeur initiale suffit : Inertia remonte la page à chaque navigation.
     */
    const params = new URLSearchParams(usePage().url.split('?')[1] ?? '');
    const demande = params.get('tab');
    const rechercheInitiale = params.get('q') ?? '';

    const [tab, setTab] = useState<TabKey>(estOnglet(demande) ? demande : 'internes');

    /*
     * Le bouton « Ajouter » vit dans l'AdminShell, le tiroir vit dans l'onglet :
     * on les relie par un compteur. Le changement d'onglet le remet à 0 pour
     * qu'un onglet fraîchement monté n'ouvre pas son tiroir tout seul.
     */
    const [signalCreation, setSignalCreation] = useState(0);

    const changerOnglet = (cle: string) => {
        setTab(cle as TabKey);
        setSignalCreation(0);
    };

    /* Le volet client est consultable par tout gestionnaire d'utilisateurs, mais
     * seul l'Administrateur y écrit : sans ce retrait, le Superviseur verrait un
     * bouton qui ne mène qu'à un refus (ADR-0025). */
    const libelleAjout = tab === 'consignataires' && !peutGererClients ? undefined : LIBELLE_AJOUT[tab];

    return (
        <>
            <Head title="Utilisateurs & habilitations — Administration" />
            <AdminShell
                module="users"
                title="Utilisateurs & habilitations"
                subtitle="Comptes internes du CGC, sociétés consignataires et agents — habilitations par rôles cumulables (RBAC)."
                crumbSub={TAB_LABELS[tab]}
                primary={libelleAjout ? { label: libelleAjout, onClick: () => setSignalCreation((n) => n + 1) } : undefined}
                tabs={[
                    { key: 'internes', label: TAB_LABELS.internes },
                    { key: 'consignataires', label: TAB_LABELS.consignataires, badge: consignataires.length },
                    // Le badge d'onglet compte les demandes en attente, pas les
                    // agents : c'est ce qui appelle une action du CGC.
                    { key: 'agents', label: TAB_LABELS.agents, badge: agents.filter((a) => a.statut === 'en_attente').length },
                    // Pas de badge : une matrice ne compte pas d'actions à mener.
                    ...(matriceRoles ? [{ key: 'roles', label: TAB_LABELS.roles }] : []),
                ]}
                activeTab={tab}
                onTab={changerOnglet}
            >
                {tab === 'internes' ? (
                    <InternesTab users={users} assignableRoles={assignableRoles} creatingSignal={signalCreation} />
                ) : null}
                {tab === 'consignataires' ? (
                    <ConsignatairesTab
                        consignataires={consignataires}
                        optionsPays={optionsPays}
                        optionsArmements={optionsArmements}
                        optionsPorts={optionsPorts}
                        signalCreation={signalCreation}
                        peutGerer={peutGererClients}
                    />
                ) : null}
                {tab === 'agents' ? <AgentsTab agents={agents} peutGerer={peutGererClients} rechercheInitiale={rechercheInitiale} /> : null}
                {tab === 'roles' && matriceRoles ? <RolesTab roles={matriceRoles} catalogue={cataloguePermissions} /> : null}
            </AdminShell>
        </>
    );
}
