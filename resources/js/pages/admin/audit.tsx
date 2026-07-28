import { Head } from '@inertiajs/react';
import AdminShell from '@/components/admin/admin-shell';
import NextDelivery from '@/components/admin/next-delivery';

export default function Audit() {
    return (
        <>
            <Head title="Journal d'audit — Administration" />
            <AdminShell
                module="audit"
                title="Journal d'audit"
                subtitle="Connexions et trace des actions majeures, adossées à l'identifiant interne immuable du dossier."
            >
                <NextDelivery
                    title="Module en cours de construction"
                    description="Le journal d'audit sera livré une fois les workflows transactionnels alimentant la traçabilité en place."
                    features={[
                        'Connexions : qui s’est connecté, quand, à quelle heure.',
                        'Trace des actions majeures : ouverture, suppression, validation de dossier.',
                        'Adossé à l’identifiant interne immuable du dossier (traçabilité d’État).',
                        'Vue transversale, complémentaire du fil d’Ariane porté par chaque dossier.',
                    ]}
                />
            </AdminShell>
        </>
    );
}
