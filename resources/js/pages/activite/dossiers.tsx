import { Head } from '@inertiajs/react';
import AVenir from '@/components/a-venir';
import ActivityShell from '@/components/activity-shell';

export default function Dossiers() {
    return (
        <ActivityShell active="dossiers" title="Dossiers d'escale" subtitle="Le suivi de vos escales, du manifeste à la clôture.">
            <Head title="Dossiers d'escale" />
            <AVenir message="L'ouverture et le suivi des dossiers d'escale seront disponibles prochainement." />
        </ActivityShell>
    );
}
