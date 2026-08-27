import { Head, router } from '@inertiajs/react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import Entete from '@/components/dossiers/entete';
import Tableau from '@/components/dossiers/tableau';
import type {
    DossierRow,
    EtapeRef,
    Filtres,
    PortRef,
    Resume,
    SensRef,
} from '@/components/dossiers/types';

/*
 * Dossiers d'escale — l'écran d'accueil du module.
 *
 * On y voit ce qui existe, et on y ouvre. Rien d'autre : le circuit lui-même
 * (manifeste, dépouillement, devis) vit sur ses propres écrans.
 *
 * `ActivityShell` est appelé sans titre : l'écran porte son propre en-tête, qui
 * loge le bouton d'ouverture là où la coquille mettrait sa carte de contexte.
 */

type Props = {
    dossiers: DossierRow[];
    page: number;
    parPage: number;
    total: number;
    filtres: Filtres;
    resume: Resume;
    liquide: number;
    etapes: EtapeRef[];
    sens: SensRef[];
    ports: PortRef[];
    peutOuvrir: boolean;
    perimetre: string;
};

export default function Dossiers({
    dossiers = [],
    page = 1,
    parPage = 15,
    total = 0,
    filtres = { q: '', sens: 'all', etape: 'all', port: null },
    resume = { tous: 0, ouverts: 0, enCours: 0, clotures: 0 },
    liquide = 0,
    etapes = [],
    sens = [],
    ports = [],
    peutOuvrir = false,
    perimetre = '',
}: Props) {
    /**
     * Filtrer, c'est naviguer : l'état vit dans l'URL, pas dans le composant.
     * Un dossier qu'on a cherché se repartage par son lien, et le retour
     * arrière ramène la liste telle qu'on l'avait laissée.
     *
     * Les valeurs neutres sont retirées de la requête plutôt qu'envoyées à
     * « all » — une URL ne devrait dire que ce qui a été choisi.
     */
    const filtrer = (patch: Record<string, string | number | null>) => {
        const demande: Record<string, string | number> = {
            q: filtres.q,
            sens: filtres.sens,
            etape: filtres.etape,
            port: filtres.port ?? 'all',
            page,
            ...patch,
        };

        const parametres: Record<string, string | number> = {};

        for (const [cle, valeur] of Object.entries(demande)) {
            const neutre =
                valeur === '' ||
                valeur === null ||
                valeur === 'all' ||
                (cle === 'page' && valeur === 1);

            if (!neutre) {
                parametres[cle] = valeur;
            }
        }

        router.get('/dossiers', parametres, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <ActivityShell active="dossiers">
            <Head title="Dossiers d'escale" />

            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#F5F7FA',
                }}
            >
                <Entete
                    resume={resume}
                    etape={filtres.etape}
                    onEtape={(etape) => filtrer({ etape, page: 1 })}
                    peutOuvrir={peutOuvrir}
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
                        dossiers={dossiers}
                        page={page}
                        parPage={parPage}
                        total={total}
                        totalPerimetre={resume.tous}
                        liquide={liquide}
                        filtres={filtres}
                        etapes={etapes}
                        sens={sens}
                        ports={ports}
                        peutOuvrir={peutOuvrir}
                        perimetre={perimetre}
                        onFiltrer={filtrer}
                    />
                </main>
            </div>

            <Toast />
        </ActivityShell>
    );
}
