import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import Banniere from '@/components/dossiers/banniere';
import ManifesteActions from '@/components/dossiers/manifeste-actions';
import ManifesteChoix from '@/components/dossiers/manifeste-choix';
import ManifesteConnaissement from '@/components/dossiers/manifeste-connaissement';
import ManifesteImport from '@/components/dossiers/manifeste-import';
import ManifesteTableauEcran from '@/components/dossiers/manifeste-tableau';
import type {
    ConnaissementSaisi,
    DossierManifeste,
    EtapeRef,
    ManifesteTableau,
    Teinte,
    TypeRef,
} from '@/components/dossiers/types';
import { teinteEtape } from '@/components/dossiers/types';

/*
 * Le manifeste d'un dossier d'escale — l'écran où atterrit un dossier ouvert,
 * en cours de renseignement ou en dépouillement.
 *
 * Deux visages selon ce que le dossier porte. Sans manifeste, l'écran propose
 * les deux voies de renseignement. Avec, il déroule le tableau de
 * dépouillement : une ligne par conteneur, plus une par part hors conteneur,
 * chacune qualifiée et chiffrée au barème en vigueur.
 */

type Props = {
    dossier: DossierManifeste;
    /** Les six jalons du circuit, dans l'ordre. */
    circuit: EtapeRef[];
    /** La nomenclature, déjà bornée au sens du dossier. */
    types: TypeRef[];
    peutQualifier: boolean;
    /** Nul tant qu'aucun manifeste n'est rattaché au dossier. */
    manifeste: ManifesteTableau | null;
    /**
     * Le connaissement ouvert en correction, désigné par `?bl=` — nul le reste
     * du temps. Il vient du serveur plutôt que d'un second appel : un seul état
     * à tenir, et un lien qui se repartage.
     */
    connaissement: ConnaissementSaisi | null;
};

/**
 * Le titre de la carte suit qui tient la plume : le consignataire renseigne
 * (WF4), le CGC dépouille (WF5). C'est l'étape qui le dit, pas le compte —
 * l'écran est le même des deux côtés.
 */
function titreCarte(
    etape: string,
    aUnManifeste: boolean,
    importEnCours: boolean,
): string {
    if (etape === 'depouillement') {
        return 'Dépouillement du manifeste';
    }

    if (importEnCours) {
        return 'Importer un manifeste (XML SYDONIA)';
    }

    return aUnManifeste ? 'Manifeste de l’escale' : 'Renseigner le manifeste';
}

/** L'état du document, dans les encres de l'étape. */
function etatDuDocument(
    etape: string,
    manifeste: ManifesteTableau | null,
): { texte: string; teinte: Teinte } {
    if (etape === 'depouillement') {
        return { texte: 'En dépouillement', teinte: teinteEtape(etape) };
    }

    return {
        texte: manifeste?.etatLabel ?? 'Brouillon — saisie en cours',
        teinte: teinteEtape(etape),
    };
}

export default function DossierManifesteEcran({
    dossier,
    circuit = [],
    types = [],
    peutQualifier = false,
    manifeste = null,
    connaissement = null,
}: Props) {
    const etat = etatDuDocument(dossier.etape, manifeste);
    const url = `/dossiers/${dossier.id}/manifeste`;

    // La déclaration d'un connaissement neuf n'a pas d'URL : elle ne désigne
    // rien qui existe. La correction, si — d'où les deux états.
    const [declaration, setDeclaration] = useState(false);
    // La méthode choisie tant qu'aucun manifeste n'est rattaché. Elle vit ici
    // et non dans la carte : c'est l'en-tête, au-dessus, qui change avec elle.
    const [importXml, setImportXml] = useState(false);
    const saisieManuelle = manifeste?.modeSaisie === 'manuel';

    /** Ouvrir un connaissement en correction, c'est naviguer vers lui. */
    const corriger = (blId: number) =>
        router.get(
            url,
            { bl: blId },
            { preserveState: true, preserveScroll: true },
        );

    /** Le refermer, c'est quitter son adresse — sans recharger la page. */
    const fermer = () => {
        setDeclaration(false);

        if (connaissement !== null) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <ActivityShell active="dossiers">
            <Head title={`Manifeste — ${dossier.numero}`} />

            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#F5F7FA',
                }}
            >
                <Banniere dossier={dossier} circuit={circuit} />

                <main
                    style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        // Quand la place manque, c'est la page qui défile —
                        // jamais le tableau qui se comprime.
                        overflow: 'auto',
                        padding: '16px 24px 18px',
                    }}
                >
                    <div
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #D8DEE9',
                            borderRadius: 8,
                            boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                            flex: '1 1 auto',
                            minHeight: 420,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '0 18px',
                                borderBottom: '1px solid #D8DEE9',
                                flex: 'none',
                                minHeight: 50,
                                flexWrap: 'wrap',
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: '#1A1F2E',
                                }}
                            >
                                {titreCarte(
                                    dossier.etape,
                                    manifeste !== null,
                                    importXml,
                                )}
                            </h2>

                            {manifeste === null && importXml ? (
                                <button
                                    type="button"
                                    onClick={() => setImportXml(false)}
                                    style={{
                                        height: 28,
                                        padding: '0 11px',
                                        border: '1px solid #C3D0F0',
                                        borderRadius: 6,
                                        background: '#F4F7FE',
                                        color: '#1D3E9C',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ↵ Changer de méthode
                                </button>
                            ) : null}
                            <span
                                style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: etat.teinte.encre,
                                    background: etat.teinte.fond,
                                    border: `1px solid ${etat.teinte.bord}`,
                                    borderRadius: 5,
                                    padding: '3px 9px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {etat.texte}
                            </span>
                            <span
                                style={{
                                    marginLeft: 'auto',
                                    fontSize: 12,
                                    color: '#5A6478',
                                }}
                            >
                                {manifeste === null
                                    ? 'Aucune expédition déclarée'
                                    : manifeste.numero === null
                                      ? `${manifeste.modeLabel} · n° attribué à la transmission`
                                      : `${manifeste.modeLabel} · n° ${manifeste.numero}`}
                            </span>
                        </div>

                        {manifeste === null ? (
                            importXml ? (
                                <ManifesteImport
                                    url={url}
                                    navire={dossier.navire}
                                    voyage={dossier.voyage}
                                    onRetour={() => setImportXml(false)}
                                />
                            ) : (
                                <ManifesteChoix
                                    voyage={dossier.voyage}
                                    url={url}
                                    peutDeclarer={peutQualifier}
                                    onImporter={() => setImportXml(true)}
                                />
                            )
                        ) : (
                            <>
                                <ManifesteActions
                                    manifeste={manifeste}
                                    url={url}
                                    peutDeclarer={peutQualifier}
                                    onDeclarer={() => setDeclaration(true)}
                                />
                                <ManifesteTableauEcran
                                    manifeste={manifeste}
                                    types={types}
                                    peutQualifier={peutQualifier}
                                    url={url}
                                    onCorriger={
                                        saisieManuelle && peutQualifier
                                            ? corriger
                                            : undefined
                                    }
                                />
                            </>
                        )}
                    </div>
                </main>
            </div>

            {declaration || connaissement !== null ? (
                <ManifesteConnaissement
                    url={url}
                    connaissement={connaissement}
                    onFermer={fermer}
                />
            ) : null}

            <Toast />
        </ActivityShell>
    );
}
