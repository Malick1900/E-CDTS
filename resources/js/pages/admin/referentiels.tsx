import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import ArmementsTab from '@/components/admin/referentiels/armements-tab';
import NaviresTab from '@/components/admin/referentiels/navires-tab';
import PaysTab from '@/components/admin/referentiels/pays-tab';
import PortsTab from '@/components/admin/referentiels/ports-tab';
import type {
    ArmementRow,
    NavireRow,
    PaysRow,
    PortRow,
    TypeNavireRow,
} from '@/components/admin/referentiels/types';
import TypesNavireTab from '@/components/admin/referentiels/types-navire-tab';
import Toast from '@/components/admin/toast';

/*
 * Référentiels — données maîtres du CGC, écriture réservée (ADR-0015).
 *
 * Page hôte volontairement mince : elle ne fait que choisir l'onglet, préparer
 * les listes déroulantes partagées et router le bouton « Ajouter » du bandeau.
 * Toute la mécanique d'un référentiel vit dans son onglet
 * (`components/admin/referentiels/`).
 */

type Onglet = 'navires' | 'armements' | 'ports' | 'types' | 'pays';

type Props = {
    typesNavire: TypeNavireRow[];
    pays: PaysRow[];
    ports: PortRow[];
    armements: ArmementRow[];
    navires: NavireRow[];
};

const LIBELLE_AJOUT: Record<Onglet, string> = {
    navires: 'Nouveau navire',
    armements: 'Nouvel armement',
    ports: 'Nouveau port',
    types: 'Nouveau type',
    pays: 'Nouveau pays',
};

export default function Referentiels({
    typesNavire = [],
    pays = [],
    ports = [],
    armements = [],
    navires = [],
}: Props) {
    const [onglet, setOnglet] = useState<Onglet>('navires');

    /*
     * Le bouton « Ajouter » vit dans l'AdminShell, le tiroir vit dans l'onglet :
     * on les relie par un compteur. Chaque clic l'incrémente, l'onglet actif
     * réagit à la variation. Le changement d'onglet le remet à 0 pour qu'un
     * onglet fraîchement monté n'ouvre pas son tiroir tout seul.
     */
    const [signalCreation, setSignalCreation] = useState(0);

    const changerOnglet = (cle: string) => {
        setOnglet(cle as Onglet);
        setSignalCreation(0);
    };

    // Listes déroulantes : on ne propose que les lignes actives — une entrée
    // désactivée disparaît de la saisie sans casser les rattachements existants.
    const optionsPays = useMemo(
        () =>
            pays
                .filter((p) => p.actif)
                .map((p) => ({ value: p.id, label: p.name })),
        [pays],
    );
    const optionsTypes = useMemo(
        () =>
            typesNavire
                .filter((t) => t.actif)
                .map((t) => ({ value: t.id, label: `${t.code} — ${t.name}` })),
        [typesNavire],
    );
    const optionsArmements = useMemo(
        () =>
            armements
                .filter((a) => a.actif)
                .map((a) => ({ value: a.id, label: a.name })),
        [armements],
    );

    return (
        <>
            <Head title="Référentiels — Administration" />
            <AdminShell
                module="ref"
                title="Référentiels"
                subtitle="Données maîtres du CGC (écriture réservée) — navires, armements, ports, types de navire et pays."
                primary={{
                    label: LIBELLE_AJOUT[onglet],
                    onClick: () => setSignalCreation((n) => n + 1),
                }}
                tabs={[
                    { key: 'navires', label: 'Navires', badge: navires.length },
                    {
                        key: 'armements',
                        label: 'Armements',
                        badge: armements.length,
                    },
                    { key: 'ports', label: 'Ports', badge: ports.length },
                    {
                        key: 'types',
                        label: 'Types de navire',
                        badge: typesNavire.length,
                    },
                    { key: 'pays', label: 'Pays', badge: pays.length },
                ]}
                activeTab={onglet}
                onTab={changerOnglet}
            >
                {onglet === 'navires' && (
                    <NaviresTab
                        navires={navires}
                        optionsTypes={optionsTypes}
                        optionsArmements={optionsArmements}
                        optionsPays={optionsPays}
                        signalCreation={signalCreation}
                    />
                )}
                {onglet === 'armements' && (
                    <ArmementsTab
                        armements={armements}
                        optionsPays={optionsPays}
                        signalCreation={signalCreation}
                    />
                )}
                {onglet === 'ports' && (
                    <PortsTab
                        ports={ports}
                        optionsPays={optionsPays}
                        signalCreation={signalCreation}
                    />
                )}
                {onglet === 'types' && (
                    <TypesNavireTab
                        typesNavire={typesNavire}
                        signalCreation={signalCreation}
                    />
                )}
                {onglet === 'pays' && (
                    <PaysTab pays={pays} signalCreation={signalCreation} />
                )}

                <Toast />
            </AdminShell>
        </>
    );
}
