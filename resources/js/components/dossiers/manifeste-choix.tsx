import { useForm } from '@inertiajs/react';
import type { CSSProperties, ReactNode } from 'react';

/*
 * Le choix du mode de renseignement du manifeste (WF4).
 *
 * Deux voies, et une seule normale : l'import du XML SYDONIA, qui déplie le
 * fichier en tableau et pré-remplit ce qui peut l'être. La saisie manuelle
 * existe pour les cas où le manifeste électronique fait défaut — elle n'est pas
 * une commodité, c'est un filet.
 *
 * **Aucune des deux ne demande de n° de manifeste.** e-CDTS l'attribue quand le
 * manifeste est acquis : au dépôt en import, à la transmission en saisie
 * manuelle (ADR-0046). Jusque-là le dossier vit sous son numéro provisoire, ce
 * qui est exactement son état.
 */

type ManifesteChoixProps = {
    /** Le voyage dont on va déclarer les expéditions. */
    voyage: string;
    /** L'URL de l'écran, racine des deux dépôts. */
    url: string;
    /** Le consignataire déclare ; l'interne CGC ne dépose rien (ADR-0007). */
    peutDeclarer: boolean;
    /** Passer à la zone de dépôt du fichier XML. */
    onImporter: () => void;
};

const CARTE: CSSProperties = {
    textAlign: 'left',
    background: '#FFFFFF',
    border: '1.5px solid #E0E5EE',
    borderRadius: 10,
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    position: 'relative',
};

const PASTILLE: CSSProperties = {
    width: 46,
    height: 46,
    borderRadius: 10,
    background: '#EAF2FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
};

const TITRE_CARTE: CSSProperties = {
    display: 'block',
    fontSize: 15,
    fontWeight: 800,
    color: '#1A1F2E',
    marginBottom: 4,
};

const CORPS_CARTE: CSSProperties = {
    display: 'block',
    fontSize: 12.5,
    color: '#5A6478',
    lineHeight: 1.5,
};

const APPUI: CSSProperties = {
    fontWeight: 700,
    color: '#3A4356',
};

const ACTION = (principale: boolean): CSSProperties => ({
    alignSelf: 'flex-start',
    // Poussé en bas de sa carte : les deux voies n'ont pas le même nombre de
    // lignes de texte, et deux boutons décalés se liraient comme deux niveaux
    // d'importance alors qu'aucun n'en a sur l'autre.
    marginTop: 'auto',
    height: 34,
    padding: '0 16px',
    border: principale ? 'none' : '1px solid #C3D0F0',
    borderRadius: 6,
    background: principale ? '#1D3E9C' : '#F4F7FE',
    color: principale ? '#FFFFFF' : '#1D3E9C',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
});

type CarteProps = {
    icone: ReactNode;
    titre: string;
    corps: ReactNode;
    /** L'étiquette verte du coin — réservée à la voie recommandée. */
    recommande?: boolean;
    action: ReactNode;
};

function Carte({
    icone,
    titre,
    corps,
    recommande = false,
    action,
}: CarteProps) {
    return (
        <div style={CARTE}>
            {recommande ? (
                <span
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#21771F',
                        background: '#E7F5E7',
                        border: '1px solid #BFE4BF',
                        borderRadius: 5,
                        padding: '2px 8px',
                    }}
                >
                    Recommandé
                </span>
            ) : null}
            <span style={PASTILLE}>{icone}</span>
            <span style={{ display: 'block' }}>
                <span style={TITRE_CARTE}>{titre}</span>
                <span style={CORPS_CARTE}>{corps}</span>
            </span>
            {action}
        </div>
    );
}

export default function ManifesteChoix({
    voyage,
    url,
    peutDeclarer,
    onImporter,
}: ManifesteChoixProps) {
    // La saisie manuelle n'a rien à demander : le clic ouvre le manifeste vide.
    const manuel = useForm({});

    return (
        <div
            style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'auto',
                background: '#F8FAFC',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    maxWidth: 840,
                    width: '100%',
                    padding: '26px 22px 30px',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h3
                        style={{
                            margin: '0 0 6px',
                            fontSize: 17,
                            fontWeight: 800,
                            color: '#1A1F2E',
                        }}
                    >
                        Renseigner le manifeste de l'escale
                    </h3>
                    <p
                        style={{
                            margin: '0 auto',
                            maxWidth: 560,
                            fontSize: 13,
                            color: '#5A6478',
                            lineHeight: 1.5,
                        }}
                    >
                        Les expéditions du voyage {voyage} se déclarent de deux
                        manières. Le manifeste pourra être transmis au CGC une
                        fois toutes les lignes qualifiées.
                    </p>
                </div>

                {peutDeclarer ? null : (
                    <div
                        style={{
                            marginBottom: 16,
                            background: '#FDF1E3',
                            border: '1px solid #F0CFA0',
                            borderRadius: 6,
                            padding: '11px 13px',
                            fontSize: 12,
                            color: '#B26200',
                            lineHeight: 1.5,
                        }}
                    >
                        Ce dossier n'a pas encore reçu son manifeste. C'est au
                        consignataire de le déposer&nbsp;; le dépouillement
                        commencera à sa transmission.
                    </div>
                )}

                {/* Les cartes s'étirent à la plus haute des deux : une voie
                plus courte à décrire n'est pas une voie mineure. */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                    }}
                >
                    <Carte
                        recommande
                        titre="Importer un manifeste XML"
                        icone={
                            <svg
                                width="24"
                                height="26"
                                viewBox="0 0 24 26"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M4 1.5h10l6 6V24.5H4V1.5z"
                                    fill="#fff"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M14 1.5v6h6"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                                <path
                                    d="M6.5 15.5l2 3.2M8.5 15.5l-2 3.2M11 15.5v3.2M11 15.5h1.6a1 1 0 0 1 0 2H11M15 15.5v3.2h2.2"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            </svg>
                        }
                        corps={
                            <>
                                Déposez le fichier{' '}
                                <strong style={APPUI}>
                                    XML issu de SYDONIA
                                </strong>
                                . Les expéditions sont analysées et pré-remplies
                                automatiquement.
                            </>
                        }
                        action={
                            peutDeclarer ? (
                                <button
                                    type="button"
                                    style={ACTION(true)}
                                    onClick={onImporter}
                                >
                                    Importer un fichier
                                </button>
                            ) : null
                        }
                    />

                    <Carte
                        titre="Saisie manuelle"
                        icone={
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="16"
                                    rx="1.5"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M3 9h18M9 9v11"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.3"
                                />
                                <path
                                    d="M14.3 13.6l1.9 1.9 3.1-3.3"
                                    stroke="#2F9E2F"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        }
                        corps={
                            <>
                                Saisissez les expéditions{' '}
                                <strong style={APPUI}>
                                    connaissement par connaissement
                                </strong>{' '}
                                d'après le manifeste papier. Le PDF sera à
                                joindre avant transmission.
                            </>
                        }
                        action={
                            peutDeclarer ? (
                                <button
                                    type="button"
                                    style={ACTION(false)}
                                    disabled={manuel.processing}
                                    onClick={() =>
                                        manuel.post(`${url}/saisie`, {
                                            preserveScroll: true,
                                        })
                                    }
                                >
                                    Saisir à la main
                                </button>
                            ) : null
                        }
                    />
                </div>

                <div
                    style={{
                        marginTop: 16,
                        display: 'flex',
                        gap: 9,
                        alignItems: 'flex-start',
                        background: '#E4F3FC',
                        border: '1px solid #B5DFF7',
                        borderRadius: 6,
                        padding: '11px 13px',
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                        style={{ flex: 'none', marginTop: 1 }}
                    >
                        <circle
                            cx="8"
                            cy="8"
                            r="7"
                            stroke="#14509C"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M8 7v4"
                            stroke="#14509C"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                        />
                        <circle cx="8" cy="4.6" r="1" fill="#14509C" />
                    </svg>
                    <span
                        style={{
                            fontSize: 12,
                            color: '#14509C',
                            lineHeight: 1.5,
                        }}
                    >
                        Le dossier porte un <strong>numéro provisoire</strong>{' '}
                        jusqu'à ce que son manifeste soit acquis&nbsp;: au dépôt
                        du fichier en import, à la transmission au CGC en saisie
                        manuelle. L'import XML est la voie normale pour les
                        lignes régulières.
                    </span>
                </div>
            </div>
        </div>
    );
}
