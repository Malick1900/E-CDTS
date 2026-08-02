import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import BaremeTab from '@/components/admin/bareme/bareme-tab';
import type { BaremeLigneRow } from '@/components/admin/bareme/bareme-tab';
import Toast from '@/components/admin/toast';

/*
 * Barème CDTS — la grille tarifaire du CGC (ADR-0034).
 *
 * Un volet par sens de trafic : le document officiel en tient deux, et la même
 * marchandise n'a pas le même prix selon qu'elle part ou qu'elle arrive.
 *
 * Écran réservé à l'Administrateur (`bareme.modifier`) : c'est lui qui fixe ce
 * que le port facture.
 */

type Props = {
    lignes: BaremeLigneRow[];
    sens: Array<{ value: string; label: string }>;
};

export default function Bareme({ lignes = [], sens = [] }: Props) {
    const [volet, setVolet] = useState(sens[0]?.value ?? 'export');
    const [signalCreation, setSignalCreation] = useState(0);

    const changerVolet = (cle: string) => {
        setVolet(cle);
        setSignalCreation(0);
    };

    const parSens = useMemo(() => lignes.filter((l) => l.sens === volet), [lignes, volet]);
    const libelle = sens.find((s) => s.value === volet)?.label ?? '';

    return (
        <>
            <Head title="Barème — Administration" />
            <AdminShell
                module="bareme"
                title="Barème"
                subtitle="Grille tarifaire CDTS en vigueur — montants en francs CFA, convertis en euros."
                primary={{ label: 'Nouvelle ligne', onClick: () => setSignalCreation((n) => n + 1) }}
                tabs={sens.map((s) => ({
                    key: s.value,
                    label: s.label,
                    badge: lignes.filter((l) => l.sens === s.value).length,
                }))}
                activeTab={volet}
                onTab={changerVolet}
            >
                <BaremeTab lignes={parSens} sens={volet} sensLabel={libelle} signalCreation={signalCreation} />

                <Toast />
            </AdminShell>
        </>
    );
}
