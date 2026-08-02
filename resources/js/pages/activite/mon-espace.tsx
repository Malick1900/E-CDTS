import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import AffectationsTab from '@/components/mon-espace/affectations-tab';
import AgentsTab from '@/components/mon-espace/agents-tab';
import ArmementsTab from '@/components/mon-espace/armements-tab';
import SocieteTab from '@/components/mon-espace/societe-tab';
import type {
    MonAgentRow,
    MonArmementRow,
    MonSocieteFiche,
} from '@/components/mon-espace/types';

/*
 * L'espace d'administration de sa propre société (lot 2).
 *
 * Quatre sous-écrans, du plus quotidien au plus rare : ses agents, ce sur quoi
 * ils opèrent, les armements que la société représente, puis sa fiche. Les
 * onglets sont posés d'abord, et chacun se remplit ensuite — la charpente avant
 * le contenu, comme pour le reste de la coquille (ADR-0030).
 *
 * Rien n'est décidé ici sur le périmètre : le serveur n'envoie déjà que ce qui
 * relève de la société du compte connecté.
 */

type Onglet = 'agents' | 'affectations' | 'armements' | 'societe';

type Props = {
    compteurs: { agents: number; armements: number };
    agents: MonAgentRow[];
    /** Les armements que la société représente — colonnes de la matrice. */
    armements: MonArmementRow[];
    /** La fiche du dossier client, en lecture seule. */
    societe: MonSocieteFiche;
};

export default function MonEspace({
    compteurs,
    agents,
    armements,
    societe,
}: Props) {
    const [onglet, setOnglet] = useState<Onglet>('agents');

    return (
        <ActivityShell
            active="administration"
            title="Administration"
            subtitle="Gérez vos agents, leurs habilitations et les informations de votre société."
            tabs={[
                { key: 'agents', label: 'Mes agents', badge: compteurs.agents },
                { key: 'affectations', label: 'Affectations' },
                {
                    key: 'armements',
                    label: 'Mes armements',
                    badge: compteurs.armements,
                },
                { key: 'societe', label: 'Ma société' },
            ]}
            activeTab={onglet}
            onTab={(cle) => setOnglet(cle as Onglet)}
        >
            <Head title="Administration" />
            <Toast />

            {onglet === 'agents' ? <AgentsTab agents={agents} /> : null}

            {onglet === 'affectations' ? (
                <AffectationsTab agents={agents} armements={armements} />
            ) : null}

            {onglet === 'armements' ? (
                <ArmementsTab agents={agents} armements={armements} />
            ) : null}

            {onglet === 'societe' ? <SocieteTab societe={societe} /> : null}
        </ActivityShell>
    );
}
