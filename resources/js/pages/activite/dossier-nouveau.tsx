import { Head, Link } from '@inertiajs/react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import Frise from '@/components/dossiers/frise';
import OuvertureConfirmee from '@/components/dossiers/ouverture-confirmee';
import OuvertureFormulaire from '@/components/dossiers/ouverture-formulaire';
import type {
    ArmementRef,
    DossierOuvert,
    EtapeRef,
    NavireRef,
    PortAvecPostes,
    SensRef,
} from '@/components/dossiers/types';
import { formatDateHeure } from '@/components/dossiers/types';

/*
 * Ouvrir un dossier d'escale (WF3).
 *
 * Un écran, deux moments : le formulaire, puis le dossier qui vient d'être
 * ouvert. Le second n'est pas une modale de succès — c'est le dossier lui-même,
 * atteignable par son URL, rechargeable, et borné par le périmètre du compte
 * comme n'importe quelle autre lecture.
 */

type Props = {
    consignataire: string;
    navires: NavireRef[];
    armements: ArmementRef[];
    ports: PortAvecPostes[];
    sens: SensRef[];
    circuit: EtapeRef[];
    /** Le dossier tout juste ouvert — nul tant qu'on remplit le formulaire. */
    ouvert: DossierOuvert | null;
};

export default function DossierNouveau({
    consignataire = '',
    navires = [],
    armements = [],
    ports = [],
    sens = [],
    circuit = [],
    ouvert = null,
}: Props) {
    const titre =
        ouvert === null
            ? "Ouvrir un dossier d'escale"
            : "Dossier d'escale ouvert";

    return (
        <ActivityShell active="dossiers">
            <Head title={titre} />

            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#F5F7FA',
                }}
            >
                {/* ══ Fil d'Ariane + titre ══ */}
                <section
                    style={{
                        background: '#FFFFFF',
                        borderBottom: '1px solid #D8DEE9',
                        flex: 'none',
                        position: 'relative',
                    }}
                >
                    <div style={{ padding: '13px 24px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#5A6478',
                                marginBottom: 9,
                            }}
                        >
                            <Link
                                href="/dossiers"
                                style={{
                                    color: '#5A6478',
                                    textDecoration: 'none',
                                }}
                            >
                                Dossiers d'escale
                            </Link>
                            <span style={{ color: '#B4BCC9' }}>›</span>
                            <span style={{ fontWeight: 600, color: '#1A1F2E' }}>
                                {ouvert === null
                                    ? 'Nouveau dossier'
                                    : ouvert.numero}
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 32,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5,
                                    maxWidth: 660,
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: '#142C73',
                                        letterSpacing: '-.01em',
                                        lineHeight: 1.12,
                                    }}
                                >
                                    {titre}
                                </h1>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        color: '#5A6478',
                                    }}
                                >
                                    {ouvert === null
                                        ? 'Le dossier sera transmissible uniquement une fois la date à quai (import) ou de départ (export) confirmée par la situation portuaire.'
                                        : `Dossier ouvert le ${formatDateHeure(ouvert.ouvertLe)}.`}
                                </p>
                            </div>

                            {ouvert === null ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        paddingTop: 2,
                                    }}
                                >
                                    <Frise
                                        circuit={circuit}
                                        courante="ouvert"
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div
                        aria-hidden="true"
                        style={{
                            height: 9,
                            backgroundImage:
                                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-opacity='0.5' stroke-width='1.4'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'repeat-x',
                            backgroundPosition: 'bottom 2px left 0',
                        }}
                    />
                </section>

                {ouvert === null ? (
                    <OuvertureFormulaire
                        consignataire={consignataire}
                        navires={navires}
                        armements={armements}
                        ports={ports}
                        sens={sens}
                    />
                ) : (
                    <OuvertureConfirmee dossier={ouvert} circuit={circuit} />
                )}
            </div>

            <Toast />
        </ActivityShell>
    );
}
