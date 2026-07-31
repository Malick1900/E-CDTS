import { Head } from '@inertiajs/react';
import AVenir from '@/components/a-venir';
import ActivityShell from '@/components/activity-shell';

export default function SituationPortuaire() {
    return (
        <ActivityShell
            active="situation-portuaire"
            title="Situation portuaire"
            subtitle="Les escales annoncées et en cours sur les ports du Gabon."
        >
            <Head title="Situation portuaire" />
            <AVenir message="La saisie et la consultation de la situation portuaire seront disponibles prochainement." />
        </ActivityShell>
    );
}
