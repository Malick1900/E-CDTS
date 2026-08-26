import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import Entete from '@/components/situation-portuaire/entete';
import PanneauAjout from '@/components/situation-portuaire/panneau-ajout';
import Tableau from '@/components/situation-portuaire/tableau';
import type {
    ConsignataireRef,
    Droits,
    MouvementRow,
    NavireRef,
    PortRef,
    PosteRef,
    Publication,
    SensRef,
    StatutRef,
} from '@/components/situation-portuaire/types';

/*
 * Situation portuaire — les mouvements de navires du port regardé.
 *
 * L'écran est le même pour tous ; ce sont les droits qui décident de ce qu'on
 * peut y faire (ADR-0013) : le consignataire lit, le conférencier saisit, le
 * superviseur publie. Rien n'est masqué par le front seul — chaque geste est
 * refait côté serveur.
 *
 * `ActivityShell` est appelé sans titre : l'écran porte son propre en-tête, qui
 * loge le sélecteur de port, l'état de publication et les deux boutons d'action.
 */

type Props = {
    ports: PortRef[];
    portCourant: PortRef | null;
    mouvements: MouvementRow[];
    postes: PosteRef[];
    navires: NavireRef[];
    consignataires: ConsignataireRef[];
    statuts: StatutRef[];
    sens: SensRef[];
    droits: Droits;
    publication: Publication;
};

/**
 * Les statuts pendant lesquels un navire tient son poste — miroir de
 * `MouvementNavireValidationRules::statutsOccupants()`. Le front les connaît
 * pour prévenir avant l'aller-retour ; le serveur reste seul juge.
 */
const STATUTS_OCCUPANTS = ['quai', 'zone'];

export default function SituationPortuaire({
    ports = [],
    portCourant = null,
    mouvements = [],
    postes = [],
    navires = [],
    consignataires = [],
    statuts = [],
    sens = [],
    droits = { renseigner: false, valider: false },
    publication = { publieeLe: null, brouillons: 0, incoherentes: 0 },
}: Props) {
    const [panneau, setPanneau] = useState(false);

    return (
        <ActivityShell active="situation-portuaire">
            <Head title="Situation portuaire" />

            {portCourant === null ? (
                <AucunPort />
            ) : (
                <div
                    style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#F5F7FA',
                    }}
                >
                    <Entete
                        ports={ports}
                        port={portCourant}
                        droits={droits}
                        publication={publication}
                        onAjouter={() => setPanneau(true)}
                    />

                    <main
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px 24px 18px',
                        }}
                    >
                        <Tableau
                            mouvements={mouvements}
                            statuts={statuts}
                            sens={sens}
                            postes={postes}
                            droits={droits}
                            port={portCourant}
                            onAjouter={() => setPanneau(true)}
                        />
                    </main>

                    {panneau && droits.renseigner ? (
                        <PanneauAjout
                            port={portCourant}
                            navires={navires}
                            postes={postes}
                            consignataires={consignataires}
                            statuts={statuts}
                            sens={sens}
                            mouvements={mouvements}
                            statutsOccupants={STATUTS_OCCUPANTS}
                            onFermer={() => setPanneau(false)}
                        />
                    ) : null}
                </div>
            )}

            <Toast />
        </ActivityShell>
    );
}

/**
 * Aucun port actif au référentiel : l'écran n'a rien à montrer, et ce n'est pas
 * un vide de saisie mais un vide de configuration — d'où un message qui pointe
 * le référentiel plutôt que le bouton d'ajout.
 */
function AucunPort() {
    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <h1
                    style={{
                        margin: '0 0 8px',
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#142C73',
                    }}
                >
                    Aucun port actif
                </h1>
                <p
                    style={{
                        margin: 0,
                        fontSize: 13,
                        color: '#5A6478',
                        lineHeight: 1.5,
                    }}
                >
                    La situation portuaire se tient par port. Activez au moins
                    un port au référentiel pour l'ouvrir.
                </p>
            </div>
        </div>
    );
}
