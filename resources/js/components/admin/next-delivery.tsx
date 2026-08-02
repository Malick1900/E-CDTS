/*
 * Carte « Prochaine livraison » — écran d'attente d'un module admin pas encore
 * développé. Reproduit la maquette Claude Design. Le titre, le descriptif et la
 * liste des fonctionnalités à venir sont passés en props.
 */
type Props = {
    title: string;
    description: string;
    features: string[];
};

export default function NextDelivery({ title, description, features }: Props) {
    return (
        <div
            style={{
                padding: '40px 26px',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    maxWidth: 560,
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #D8DEE9',
                    borderRadius: 10,
                    boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                    padding: '34px 34px 30px',
                    textAlign: 'center',
                }}
            >
                <svg
                    width="150"
                    height="96"
                    viewBox="0 0 150 96"
                    fill="none"
                    style={{ marginBottom: 12 }}
                    aria-hidden="true"
                >
                    <rect
                        x="88"
                        y="46"
                        width="56"
                        height="30"
                        fill="#EEF1F7"
                        stroke="#D8DEE9"
                        strokeWidth="1.4"
                    />
                    <path
                        d="M104 46 V14 H132"
                        stroke="#C6CDD9"
                        strokeWidth="2.6"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M132 14 v10"
                        stroke="#C6CDD9"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    <rect x="93" y="55" width="14" height="9" fill="#B5DFF7" />
                    <rect x="111" y="55" width="14" height="9" fill="#7EC8F0" />
                    <path d="M8 60 h52 l-8 14 H16 z" fill="#DCE3EE" />
                    <rect x="22" y="52" width="22" height="8" fill="#C6CDD9" />
                    <path
                        d="M4 82 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
                        stroke="#B5DFF7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                    <path
                        d="M4 89 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
                        stroke="#D6E8F7"
                        strokeWidth="1.8"
                        fill="none"
                    />
                </svg>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '.07em',
                        color: '#B26200',
                        background: '#FDF1E3',
                        border: '1px solid #F0CFA0',
                        borderRadius: 20,
                        padding: '3px 12px',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}
                >
                    Prochaine livraison
                </div>
                <h3
                    style={{
                        margin: '0 0 8px',
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#142C73',
                    }}
                >
                    {title}
                </h3>
                <p
                    style={{
                        margin: '0 auto 18px',
                        maxWidth: 420,
                        fontSize: 13,
                        color: '#5A6478',
                        lineHeight: 1.55,
                    }}
                >
                    {description}
                </p>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 9,
                        textAlign: 'left',
                        maxWidth: 440,
                        margin: '0 auto',
                    }}
                >
                    {features.map((f) => (
                        <div
                            key={f}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                padding: '10px 13px',
                                border: '1px solid #E7EBF2',
                                borderRadius: 8,
                                background: '#FBFCFE',
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                style={{ flex: 'none', marginTop: 1 }}
                            >
                                <circle
                                    cx="8"
                                    cy="8"
                                    r="7"
                                    fill="#EAF4FC"
                                    stroke="#B9DEF5"
                                    strokeWidth="1"
                                />
                                <path
                                    d="M5 8.2l2 2 4-4.4"
                                    stroke="#1D3E9C"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span
                                style={{
                                    fontSize: 12.5,
                                    color: '#3A4356',
                                    lineHeight: 1.45,
                                }}
                            >
                                {f}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
