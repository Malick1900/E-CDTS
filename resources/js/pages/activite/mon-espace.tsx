import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import AffectationsTab from '@/components/mon-espace/affectations-tab';
import AgentsTab from '@/components/mon-espace/agents-tab';
import ArmementsTab from '@/components/mon-espace/armements-tab';
import NaviresTab from '@/components/mon-espace/navires-tab';
import SocieteTab from '@/components/mon-espace/societe-tab';
import type {
    MonAgentRow,
    MonArmementRow,
    MonNavireRow,
    MonSocieteFiche,
} from '@/components/mon-espace/types';

/*
 * L'espace d'administration de sa propre société (lot 2).
 *
 * Cinq sous-écrans, du plus quotidien au plus rare : ses agents, ce sur quoi
 * ils opèrent, les armements que la société représente, leur flotte, puis sa
 * propre fiche. Les deux premiers se pilotent, les trois autres se consultent.
 *
 * Ce partage n'est pas une restriction d'information mais de responsabilité :
 * le CGC tient ces référentiels, la société ne les écrit pas — mais elle les
 * lit en entier. Sur une plateforme d'État, ce que l'administration détient sur
 * un administré doit lui être ouvert ; il n'y a rien à sous-entendre.
 *
 * Rien n'est décidé ici sur le périmètre : le serveur n'envoie déjà que ce qui
 * relève de la société du compte connecté.
 */

type Onglet = 'agents' | 'affectations' | 'armements' | 'navires' | 'societe';

type Props = {
    compteurs: { agents: number; armements: number; navires: number };
    agents: MonAgentRow[];
    /** Les armements que la société représente — colonnes de la matrice. */
    armements: MonArmementRow[];
    /** La flotte de ces armements, telle que le référentiel la détient. */
    navires: MonNavireRow[];
    /** La fiche du dossier client, en lecture seule. */
    societe: MonSocieteFiche;
};

export default function MonEspace({
    compteurs,
    agents,
    armements,
    navires,
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
                {
                    key: 'navires',
                    label: 'Navires',
                    badge: compteurs.navires,
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

            {onglet === 'navires' ? <NaviresTab navires={navires} /> : null}

            {onglet === 'societe' ? <SocieteTab societe={societe} /> : null}
        </ActivityShell>
    );
}
