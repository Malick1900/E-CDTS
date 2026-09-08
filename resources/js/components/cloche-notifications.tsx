/*
 * Cloche de notifications de l'en-tête — partagée par les deux coquilles.
 *
 * `ActivityShell` et `AdminShell` ont chacune leur en-tête mais la même zone de
 * droite : cloche puis puce utilisateur. Le composant est *contrôlé* — il ne
 * détient pas son ouverture — parce que les deux menus de cette zone sont
 * exclusifs et que la fermeture au clic-dehors est arbitrée par la coquille.
 *
 * Le panneau n'a rien à lister pour l'instant : aucune notification n'est
 * encore poussée en application (celles d'`app/Notifications` partent par
 * courriel). Il montre donc l'état vide, et c'est le seul état qu'il connaît.
 */

type Props = {
    ouvert: boolean;
    onToggle: () => void;
    /**
     * Distance entre le haut de la zone de menus et le panneau. Les deux
     * en-têtes n'ont pas la même hauteur : la valeur suit celle du menu du
     * compte de la coquille appelante.
     */
    top: number;
};

function IconeCloche({ size, color }: { size: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            style={color ? { color } : undefined}
        >
            <path
                d="M10 2.6a4.8 4.8 0 0 0-4.8 4.8c0 4.2-1.3 5.6-1.3 5.6h12.2s-1.3-1.4-1.3-5.6A4.8 4.8 0 0 0 10 2.6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M8.4 16.2a1.8 1.8 0 0 0 3.2 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function ClocheNotifications({ ouvert, onToggle, top }: Props) {
    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                aria-label="Notifications"
                aria-expanded={ouvert}
                className="ea-iconbtn"
                style={{
                    position: 'relative',
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    border: '1px solid #D8DEE9',
                    background: ouvert ? '#EEF2FB' : '#fff',
                    color: '#5A6478',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flex: 'none',
                }}
            >
                <IconeCloche size={18} />
            </button>

            {ouvert ? (
                <div
                    style={{
                        position: 'absolute',
                        top,
                        right: 0,
                        width: 288,
                        background: '#fff',
                        border: '1px solid #D8DEE9',
                        borderRadius: 11,
                        boxShadow: '0 12px 32px rgba(20,31,46,.16)',
                        zIndex: 40,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            padding: '11px 14px',
                            borderBottom: '1px solid #EDF0F5',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#1A1F2E',
                        }}
                    >
                        Notifications
                    </div>
                    <div
                        style={{
                            padding: '22px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            color: '#8A93A6',
                            textAlign: 'center',
                        }}
                    >
                        <IconeCloche size={26} color="#C3CAD6" />
                        <span style={{ fontSize: 12.5 }}>
                            Aucune notification pour le moment.
                        </span>
                    </div>
                </div>
            ) : null}
        </>
    );
}
