/*
 * Jalon d'un module pas encore construit (ADR-0030).
 *
 * L'entrée de navigation existe déjà — c'est le principe de la charpente posée
 * avant le contenu. Cet écran dit franchement qu'il n'y a rien à voir, plutôt
 * que de laisser un tableau vide faire croire à une absence de données.
 */
export default function AVenir({ message }: { message: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '96px 24px',
                textAlign: 'center',
                color: '#5A6478',
            }}
        >
            <div
                style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: '#EEF2FB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8FA3D9',
                }}
            >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                    />
                    <path
                        d="M12 7.5V12l3 2"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1F2E' }}>
                Module en cours de construction
            </span>
            <p
                style={{
                    margin: 0,
                    fontSize: 13,
                    maxWidth: 460,
                    lineHeight: 1.55,
                }}
            >
                {message}
            </p>
        </div>
    );
}
