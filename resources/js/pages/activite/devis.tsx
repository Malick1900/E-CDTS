import { Head } from '@inertiajs/react';
import AVenir from '@/components/a-venir';
import ActivityShell from '@/components/activity-shell';

export default function Devis() {
    return (
        <ActivityShell
            active="devis"
            title="Devis & factures"
            subtitle="Les droits de trafic liquidés et leur règlement."
        >
            <Head title="Devis & factures" />
            <AVenir message="La consultation des devis et des factures sera disponible prochainement." />
        </ActivityShell>
    );
}
