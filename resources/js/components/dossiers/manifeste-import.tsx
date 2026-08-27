import { router, useForm, usePage } from '@inertiajs/react';
import type { CSSProperties, DragEvent } from 'react';
import { useRef, useState } from 'react';
import ManifesteApercu from '@/components/dossiers/manifeste-apercu';

/*
 * Le dépôt du manifeste XML AWMDS (WF4).
 *
 * **Rien n'est demandé que le fichier.** Le n° de manifeste n'est pas saisi —
 * e-CDTS l'attribue au dépôt (ADR-0046) —, et la correspondance au dossier se
 * vérifie DANS le fichier, sur le navire et le voyage, plutôt qu'en la faisant
 * retaper. Un formulaire qui demande ce qu'il peut lire fabrique des écarts.
 *
 * **Trois temps : déposer, regarder, confirmer.** Le premier envoi ne fait que
 * lire — le fichier est résumé, confronté au dossier, et rien n'est écrit. Le
 * consignataire voit alors le segment général du manifeste et le verdict de
 * cohérence, puis décide. Ce n'est qu'à sa confirmation que le même fichier
 * repart pour être enregistré.
 *
 * **Le fichier ne quitte jamais le navigateur entre les deux.** Le serveur ne
 * garde rien d'un aperçu : un second envoi de quelques centaines de
 * kilo-octets coûte moins qu'une zone d'attente à purger, et un aperçu
 * abandonné ne laisse aucune trace.
 *
 * L'analyse d'un manifeste de plusieurs centaines de connaissements prend
 * quelques secondes, et un écran muet pendant ce temps se lit comme une panne
 * — d'où l'énoncé des contrôles qui s'enchaînent.
 */

type ManifesteImportProps = {
    /** L'URL de l'écran du manifeste, racine du dépôt. */
    url: string;
    /** Le navire du dossier — le fichier doit porter le même. */
    navire: string;
    /** Le voyage du dossier — même exigence. */
    voyage: string;
    /** Revenir au choix de la méthode. */
    onRetour: () => void;
};

const ZONE = (survol: boolean): CSSProperties => ({
    border: `2px dashed ${survol ? '#1D3E9C' : '#C3D0F0'}`,
    borderRadius: 12,
    background: survol ? '#F0F4FE' : '#FFFFFF',
    padding: '34px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    transition: 'border-color .12s, background .12s',
});

const PASTILLE: CSSProperties = {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: '#EAF2FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
};

const BOUTON_CLAIR: CSSProperties = {
    height: 38,
    padding: '0 22px',
    border: '1px solid #C3D0F0',
    borderRadius: 7,
    background: '#FFFFFF',
    color: '#1D3E9C',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
};

const ERREUR: CSSProperties = {
    display: 'flex',
    gap: 9,
    alignItems: 'flex-start',
    background: '#FDF0EF',
    border: '1px solid #E4C4C1',
    borderRadius: 7,
    padding: '11px 13px',
    fontSize: 12.5,
    color: '#B3261E',
    lineHeight: 1.5,
};

/** Les contrôles, dans l'ordre où le parseur les enchaîne. */
const ETAPES: Record<Phase, string[]> = {
    analyse: [
        'Lecture du fichier XML',
        'Contrôle de la structure SYDONIA',
        'Rapprochement avec le dossier',
    ],
    import: [
        'Dépliage des connaissements',
        'Pré-qualification des conteneurs',
        'Enregistrement du manifeste',
    ],
};

/** Ce que le formulaire est en train de faire — l'attente n'a pas le même sens. */
type Phase = 'analyse' | 'import';

export default function ManifesteImport({
    url,
    navire,
    voyage,
    onRetour,
}: ManifesteImportProps) {
    const champ = useRef<HTMLInputElement>(null);
    const [survol, setSurvol] = useState(false);
    // Le fichier reste ici, entre l'aperçu et la confirmation : c'est LUI qui
    // repartira, sans que le consignataire ait à le rouvrir.
    const [fichier, setFichier] = useState<File | null>(null);
    const [phase, setPhase] = useState<Phase>('analyse');

    // L'aperçu vaut pour la réponse qui le porte, et pour elle seule : c'est
    // un flash, comme le toast. Repartir sur l'écran de dépôt suffit à le
    // congédier — rien à effacer côté serveur, qui n'a rien gardé.
    const apercu = usePage().flash.apercuManifeste ?? null;

    const form = useForm<{ fichier: File | null }>({ fichier: null });

    /** Envoyer le fichier, pour le lire ou pour l'écrire. */
    const envoyer = (choisi: File, vers: Phase) => {
        setPhase(vers);
        form.transform(() => ({ fichier: choisi }));
        form.post(vers === 'analyse' ? `${url}/xml/apercu` : `${url}/xml`, {
            preserveScroll: true,
            // Sans cela, l'aperçu remonterait la page et le fichier retenu ici
            // serait perdu au remontage : il faudrait le redéposer pour rien.
            preserveState: true,
            onError: () => setFichier(null),
            onFinish: () => {
                if (champ.current) {
                    champ.current.value = '';
                }
            },
        });
    };

    const deposer = (choisi: File | null) => {
        if (choisi === null) {
            return;
        }

        setFichier(choisi);
        envoyer(choisi, 'analyse');
    };

    /** Abandonner l'aperçu : rien n'a été écrit, il n'y a rien à défaire. */
    const recommencer = () => {
        setFichier(null);
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const survoler = (e: DragEvent, actif: boolean) => {
        e.preventDefault();
        setSurvol(actif);
    };

    // ── L'aperçu, entre le dépôt et l'écriture ───────────────────────────
    //
    // Il faut les deux : le résumé venu du serveur ET le fichier retenu ici.
    // Un aperçu sans son fichier — après un rechargement de page — ne pourrait
    // rien confirmer, et l'écran repart alors du dépôt.
    if (!form.processing && apercu && fichier !== null) {
        return (
            <ManifesteApercu
                apercu={apercu}
                onRecommencer={recommencer}
                onImporter={() => envoyer(fichier, 'import')}
            />
        );
    }

    // ── L'attente ────────────────────────────────────────────────────────
    if (form.processing) {
        return (
            <div style={{ padding: '30px 22px 34px' }}>
                <div
                    style={{
                        maxWidth: 560,
                        margin: '0 auto',
                        background: '#FFFFFF',
                        border: '1px solid #E0E5EE',
                        borderRadius: 10,
                        padding: '36px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <span
                        role="status"
                        aria-label="Traitement en cours"
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            border: '4px solid #E4E8F0',
                            borderTopColor: '#1D3E9C',
                            animation: 'tourne 900ms linear infinite',
                        }}
                    />
                    {/* L'animation ne vit qu'ici : elle n'a pas d'usage ailleurs. */}
                    <style>
                        {'@keyframes tourne{to{transform:rotate(360deg)}}'}
                    </style>

                    <span style={{ textAlign: 'center' }}>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 15,
                                fontWeight: 800,
                                color: '#1A1F2E',
                                marginBottom: 5,
                            }}
                        >
                            {phase === 'analyse'
                                ? 'Analyse du fichier en cours…'
                                : 'Import du manifeste en cours…'}
                        </span>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 12.5,
                                color: '#5A6478',
                            }}
                        >
                            {fichier?.name}
                        </span>
                    </span>

                    <ul
                        style={{
                            margin: 0,
                            padding: 0,
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                        }}
                    >
                        {ETAPES[phase].map((etape) => (
                            <li
                                key={etape}
                                style={{
                                    fontSize: 12.5,
                                    color: '#5A6478',
                                }}
                            >
                                <span style={{ color: '#8A93A6' }}>·</span>{' '}
                                {etape}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    // ── La zone de dépôt ─────────────────────────────────────────────────
    return (
        <div style={{ padding: '22px 22px 26px', overflow: 'auto' }}>
            <div
                style={{
                    maxWidth: 860,
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                }}
            >
                <div
                    style={ZONE(survol)}
                    onDragOver={(e) => survoler(e, true)}
                    onDragEnter={(e) => survoler(e, true)}
                    onDragLeave={(e) => survoler(e, false)}
                    onDrop={(e) => {
                        survoler(e, false);
                        deposer(e.dataTransfer.files?.[0] ?? null);
                    }}
                >
                    <span style={PASTILLE}>
                        <svg
                            width="26"
                            height="26"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M12 15.5V4m0 0L7.5 8.5M12 4l4.5 4.5"
                                stroke="#1D3E9C"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M3.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V15"
                                stroke="#1D3E9C"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>

                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#1A1F2E',
                        }}
                    >
                        Glissez-déposez le fichier XML ici
                    </span>
                    <span style={{ fontSize: 12.5, color: '#8A93A6' }}>ou</span>

                    <input
                        ref={champ}
                        type="file"
                        accept=".xml,text/xml,application/xml"
                        hidden
                        onChange={(e) => deposer(e.target.files?.[0] ?? null)}
                    />
                    <button
                        type="button"
                        onClick={() => champ.current?.click()}
                        style={BOUTON_CLAIR}
                    >
                        Parcourir…
                    </button>

                    <span style={{ fontSize: 12, color: '#8A93A6' }}>
                        Format accepté : XML SYDONIA (.xml) — 1 fichier
                    </span>
                </div>

                {form.errors.fichier ? (
                    <div style={ERREUR} role="alert">
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
                                stroke="currentColor"
                                strokeWidth="1.4"
                            />
                            <path
                                d="M8 4.6v4.2"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                            />
                            <circle
                                cx="8"
                                cy="11.3"
                                r=".95"
                                fill="currentColor"
                            />
                        </svg>
                        <span>
                            <strong>Import refusé.</strong>{' '}
                            {form.errors.fichier}
                        </span>
                    </div>
                ) : null}

                <div
                    style={{
                        display: 'flex',
                        gap: 9,
                        alignItems: 'flex-start',
                        background: '#F7F9FC',
                        border: '1px solid #E0E5EE',
                        borderRadius: 7,
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
                            stroke="#8A93A6"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M8 7v4"
                            stroke="#8A93A6"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                        />
                        <circle cx="8" cy="4.6" r="1" fill="#8A93A6" />
                    </svg>
                    <span
                        style={{
                            fontSize: 12,
                            color: '#5A6478',
                            lineHeight: 1.55,
                        }}
                    >
                        Le fichier doit correspondre au navire et au voyage du
                        dossier :{' '}
                        <strong style={{ color: '#1A1F2E' }}>
                            {navire} · {voyage}
                        </strong>
                        . La cohérence est vérifiée avant l'import.
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onRetour}
                    style={{
                        alignSelf: 'center',
                        border: 'none',
                        background: 'none',
                        color: '#5A6478',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                    }}
                >
                    Revenir au choix de la méthode
                </button>
            </div>
        </div>
    );
}
