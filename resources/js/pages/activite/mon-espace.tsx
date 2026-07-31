import { Head } from '@inertiajs/react';
import AVenir from '@/components/a-venir';
import ActivityShell from '@/components/activity-shell';

/*
 * L'espace d'administration de sa propre société — le lot 2. La route existe
 * dès maintenant parce que l'entrée « Administration » d'un titulaire y mène
 * (ADR-0030) : sans elle, la navigation promettrait un 404.
 */
export default function MonEspace() {
    return (
        <ActivityShell
            active="administration"
            title="Administration"
            subtitle="Gérez vos agents, leurs habilitations et les informations de votre société."
        >
            <Head title="Administration" />
            <AVenir message="La gestion de vos agents et des informations de votre société sera disponible prochainement." />
        </ActivityShell>
    );
}
