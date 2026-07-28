import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import AgentsTab from '@/components/admin/users/agents-tab';
import ConsignatairesTab from '@/components/admin/users/consignataires-tab';
import { pendingAgentsCount } from '@/components/admin/users/fake-data';
import InternesTab from '@/components/admin/users/internes-tab';
import type { UserRow } from '@/components/admin/users/internes-tab';

/*
 * Module « Utilisateurs & habilitations » (Phase 2 + coquille).
 * Page hôte à trois onglets : Internes CGC (backend réel), Consignataires et
 * Agents consignataires (front-only, données factices à câbler). Le bouton
 * primaire « Nouvel utilisateur » ne concerne que l'onglet Internes.
 */

type Props = {
    users: UserRow[];
    assignableRoles: string[];
};

type TabKey = 'internes' | 'consignataires' | 'agents';

const TAB_LABELS: Record<TabKey, string> = {
    internes: 'Internes CGC',
    consignataires: 'Consignataires',
    agents: 'Agents consignataires',
};

export default function Utilisateurs({ users, assignableRoles }: Props) {
    const [tab, setTab] = useState<TabKey>('internes');
    const [creatingSignal, setCreatingSignal] = useState(0);

    return (
        <>
            <Head title="Utilisateurs & habilitations — Administration" />
            <AdminShell
                module="users"
                title="Utilisateurs & habilitations"
                subtitle="Comptes internes du CGC, sociétés consignataires et agents — habilitations par rôles cumulables (RBAC)."
                crumbSub={TAB_LABELS[tab]}
                usersAlert={pendingAgentsCount}
                primary={tab === 'internes' ? { label: 'Nouvel utilisateur', onClick: () => setCreatingSignal((n) => n + 1) } : undefined}
                tabs={[
                    { key: 'internes', label: TAB_LABELS.internes },
                    { key: 'consignataires', label: TAB_LABELS.consignataires },
                    { key: 'agents', label: TAB_LABELS.agents, badge: pendingAgentsCount },
                ]}
                activeTab={tab}
                onTab={(key) => setTab(key as TabKey)}
            >
                {tab === 'internes' ? (
                    <InternesTab users={users} assignableRoles={assignableRoles} creatingSignal={creatingSignal} />
                ) : null}
                {tab === 'consignataires' ? <ConsignatairesTab /> : null}
                {tab === 'agents' ? <AgentsTab /> : null}
            </AdminShell>
        </>
    );
}
