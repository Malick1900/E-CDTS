import { Head, Link } from '@inertiajs/react';

/*
 * Refus d'autorisation.
 *
 * Écran volontairement explicatif : dans une administration, un accès refusé
 * n'est presque jamais une erreur de l'utilisateur mais le reflet de son
 * périmètre. On dit donc ce qui s'est passé, pourquoi, et à qui s'adresser —
 * plutôt que d'afficher un code d'erreur nu (ADR-0025).
 */
export default function Erreur403() {
    return (
        <>
            <Head title="Accès non autorisé — e-CDTS" />
            <div
                style={{
                    minHeight: '100vh',
                    background: '#F5F7FA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <div
                    style={{
                        maxWidth: 540,
                        width: '100%',
                        background: '#fff',
                        border: '1px solid #D8DEE9',
                        borderRadius: 12,
                        boxShadow: '0 2px 12px rgba(20,44,115,.08)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: 5,
                            background:
                                'linear-gradient(90deg,#009E60 33%,#FCD116 33% 66%,#3A75C4 66%)',
                        }}
                    />

                    <div style={{ padding: '30px 32px 28px' }}>
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 12,
                                background: '#EEF3FF',
                                border: '1px solid #C3D0F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 18,
                            }}
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 20 20"
                                fill="none"
                                style={{ color: '#1D3E9C' }}
                            >
                                <rect
                                    x="4.4"
                                    y="8.8"
                                    width="11.2"
                                    height="7.6"
                                    rx="1.6"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                                <path
                                    d="M7.1 8.8V6.6a2.9 2.9 0 0 1 5.8 0v2.2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <h1
                            style={{
                                margin: '0 0 10px',
                                fontSize: 21,
                                fontWeight: 800,
                                color: '#142C73',
                                letterSpacing: '-.01em',
                            }}
                        >
                            Cette action ne relève pas de votre profil
                        </h1>

                        <p
                            style={{
                                margin: '0 0 10px',
                                fontSize: 13.5,
                                color: '#3A4356',
                                lineHeight: 1.6,
                            }}
                        >
                            Votre compte est bien actif : c’est l’opération
                            demandée qui est réservée à un autre profil. Les
                            habilitations e-CDTS découlent des rôles attribués à
                            votre compte, et chaque action sensible en dépend
                            d’une précise.
                        </p>

                        <p
                            style={{
                                margin: '0 0 22px',
                                fontSize: 13.5,
                                color: '#3A4356',
                                lineHeight: 1.6,
                            }}
                        >
                            Si vous devez y accéder dans le cadre de vos
                            fonctions, adressez-vous à l’
                            <strong>Administrateur</strong> du Conseil Gabonais
                            des Chargeurs : lui seul peut ajuster la composition
                            des rôles.
                        </p>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <Link
                                href="/dashboard"
                                className="ea-btn-primary"
                                style={{
                                    height: 38,
                                    padding: '0 16px',
                                    borderRadius: 7,
                                    background: '#1D3E9C',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    textDecoration: 'none',
                                }}
                            >
                                Retour à la plateforme
                            </Link>
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                style={{
                                    height: 38,
                                    padding: '0 14px',
                                    border: '1px solid #D8DEE9',
                                    borderRadius: 7,
                                    background: '#fff',
                                    color: '#5A6478',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Page précédente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
