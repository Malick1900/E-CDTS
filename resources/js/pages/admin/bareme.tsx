import { Head } from '@inertiajs/react';
import AdminShell from '@/components/admin/admin-shell';
import NextDelivery from '@/components/admin/next-delivery';

export default function Bareme() {
    return (
        <>
            <Head title="Barème — Administration" />
            <AdminShell
                module="bareme"
                title="Barème"
                subtitle="Grille tarifaire par nomenclature CGC — valeurs uniquement, versionnées. Le moteur codé lit cette grille."
            >
                <NextDelivery
                    title="Module en cours de construction"
                    description="L'édition de la grille tarifaire sera livrée après le référentiel et la gestion des utilisateurs."
                    features={[
                        'Saisie de la grille nomenclature CGC ↔ prix ↔ unité payante.',
                        'Versionnement : on n’écrase jamais un tarif, on crée une nouvelle version.',
                        'Un devis déjà liquidé reste attaché à son barème d’origine.',
                        'Distinction ligne régulière / tramping et sec / frigo lue par le moteur.',
                    ]}
                />
            </AdminShell>
        </>
    );
}
