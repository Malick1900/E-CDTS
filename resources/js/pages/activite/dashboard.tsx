import { Head } from '@inertiajs/react';
import ActivityShell from '@/components/activity-shell';

/*
 * Porte d'entrée commune (ADR-0030) : tout le monde arrive ici, quel que soit
 * le type de compte. Provisoirement vide — les indicateurs viendront quand les
 * modules qui les alimentent existeront.
 */
export default function Dashboard() {
    return (
        <ActivityShell
            active="dashboard"
            title="Tableau de bord"
            subtitle="Votre point d'entrée sur la plateforme e-CDTS."
        >
            <Head title="Tableau de bord" />
            <div
                style={{
                    padding: '96px 24px',
                    textAlign: 'center',
                    color: '#5A6478',
                    fontSize: 13,
                    lineHeight: 1.6,
                }}
            >
                Les indicateurs de suivi apparaîtront ici au fur et à mesure de
                la mise en service des modules.
                <br />
                Utilisez la navigation en haut de l'écran pour accéder à vos
                espaces.
            </div>
        </ActivityShell>
    );
}
