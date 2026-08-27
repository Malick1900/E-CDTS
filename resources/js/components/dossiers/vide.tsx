import { Link } from '@inertiajs/react';

/*
 * Le tableau sans lignes — deux vides très différents.
 *
 * Un périmètre vide est un début : il n'y a rien parce que rien n'a encore été
 * ouvert, et la réponse est le bouton d'ouverture. Un filtrage vide est une
 * impasse de lecture : les dossiers existent, la recherche les a écartés, et la
 * réponse est de relâcher les filtres. Les confondre laisserait un
 * consignataire chercher un bouton devant une liste qu'il vient de filtrer.
 */

type VideProps = {
    /** Vrai quand des dossiers existent mais que le filtrage les écarte tous. */
    filtre: boolean;
    peutOuvrir: boolean;
};

export default function Vide({ filtre, peutOuvrir }: VideProps) {
    return (
        <div
            style={{
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FBFCFE',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: 430, padding: 30 }}>
                <svg
                    width="132"
                    height="88"
                    viewBox="0 0 132 88"
                    fill="none"
                    aria-hidden="true"
                    style={{ marginBottom: 8 }}
                >
                    <rect
                        x="76"
                        y="42"
                        width="52"
                        height="26"
                        fill="#EEF1F7"
                        stroke="#D8DEE9"
                        strokeWidth="1.4"
                    />
                    <path
                        d="M90 42 V14 H114"
                        stroke="#C6CDD9"
                        strokeWidth="2.6"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M114 14 v9"
                        stroke="#C6CDD9"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    <rect x="80" y="50" width="13" height="8" fill="#B5DFF7" />
                    <rect x="96" y="50" width="13" height="8" fill="#7EC8F0" />
                    <path d="M8 54 h46 l-7 12 H15 z" fill="#DCE3EE" />
                    <rect x="20" y="47" width="20" height="7" fill="#C6CDD9" />
                    <path
                        d="M4 74 q7 -4 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
                        stroke="#B5DFF7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                    <path
                        d="M4 80 q7 -4 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
                        stroke="#D6E8F7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                </svg>

                <h3
                    style={{
                        margin: '0 0 6px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1A1F2E',
                    }}
                >
                    {filtre
                        ? 'Aucun dossier ne correspond aux filtres'
                        : "Aucun dossier d'escale"}
                </h3>
                <p
                    style={{
                        margin: '0 0 18px',
                        fontSize: 13,
                        color: '#5A6478',
                        lineHeight: 1.5,
                    }}
                >
                    {filtre
                        ? "Ajustez la recherche, le sens, l'étape ou le port pour retrouver un dossier."
                        : peutOuvrir
                          ? "Vous n'avez pas encore ouvert de dossier d'escale."
                          : "Aucun dossier n'a encore été ouvert par les consignataires."}
                </p>

                {!filtre && peutOuvrir ? (
                    <Link
                        href="/dossiers/nouveau"
                        className="ea-btn-primary"
                        style={{
                            height: 38,
                            padding: '0 18px',
                            border: 'none',
                            borderRadius: 7,
                            background: '#1D3E9C',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            textDecoration: 'none',
                        }}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M8 3v10M3 8h10"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                        Ouvrir un dossier d'escale
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
