import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/routes';
import { edit as profileEdit } from '@/routes/profile';
import '../../css/ecdts-admin.css';

/*
 * Coquille d'activité (ADR-0030) — la coquille de tout le monde.
 *
 * Navigation horizontale, par opposition au rail vertical d'`AdminShell` qui
 * reste réservé aux quatre modules d'administration CGC. Les deux partagent le
 * bandeau institutionnel, l'en-tête d'écran et la barre d'onglets, d'où la
 * feuille de style commune.
 *
 * Les entrées de navigation ne sont pas décidées ici : le serveur envoie celles
 * que le compte a le droit de voir (`coquille.navigation`). Un écran ne peut
 * donc pas apparaître au menu sans que la permission correspondante existe.
 */

type NavEntry = { key: string; label: string; href: string };

type Coquille = {
    navigation: NavEntry[];
    qualite: string;
    contexte: { societe: string; immatriculation: string | null } | null;
};

type ActivityShellProps = {
    /** Clé de l'entrée de navigation courante (voir `HandleInertiaRequests`). */
    active: string;
    title: string;
    subtitle: string;
    /** Maillons intermédiaires du fil d'Ariane, entre « Tableau de bord » et le titre. */
    crumbs?: string[];
    children: ReactNode;
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return 'CG';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ActivityShell({
    active,
    title,
    subtitle,
    crumbs = [],
    children,
}: ActivityShellProps) {
    const page = usePage();
    const user = (page.props as { auth?: { user?: { name?: string } } }).auth
        ?.user;
    const coquille = (page.props as { coquille?: Coquille }).coquille;
    const nom = user?.name ?? 'Mon compte';
    const qualite = coquille?.qualite ?? '';
    const contexte = coquille?.contexte ?? null;

    const [openMenu, setOpenMenu] = useState(false);
    const menuZone = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openMenu) {
            return;
        }

        const onPointer = (e: MouseEvent) => {
            if (
                menuZone.current &&
                !menuZone.current.contains(e.target as Node)
            ) {
                setOpenMenu(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenMenu(false);
            }
        };

        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [openMenu]);

    return (
        <div
            className="ecdts-admin"
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 1200,
                overflow: 'hidden',
            }}
        >
            {/* ══ Bandeau institutionnel ══ */}
            <div
                style={{
                    background: '#142C73',
                    color: '#C9D4F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    height: 34,
                    flex: 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        style={{
                            width: 21,
                            height: 15,
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 'none',
                            boxShadow: '0 0 0 1px rgba(255,255,255,.25)',
                        }}
                    >
                        <div style={{ flex: 1, background: '#009E60' }} />
                        <div style={{ flex: 1, background: '#FCD116' }} />
                        <div style={{ flex: 1, background: '#3A75C4' }} />
                    </div>
                    <span
                        style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            letterSpacing: '.06em',
                            color: '#E8EDFA',
                        }}
                    >
                        RÉPUBLIQUE GABONAISE
                    </span>
                    <span style={{ fontSize: 11.5, color: '#8FA3D9' }}>
                        — Ministère des Transports, de la Marine Marchande
                        chargé de la Logistique
                    </span>
                </div>
                <span style={{ fontSize: 11.5, color: '#8FA3D9' }}>
                    Plateforme officielle de liquidation des droits de trafic
                    sectoriels
                </span>
            </div>

            {/* ══ En-tête application : identité, navigation, compte ══ */}
            <header
                style={{
                    background: '#FFFFFF',
                    borderBottom: '1px solid #D8DEE9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 28,
                    padding: '0 24px',
                    height: 64,
                    flex: 'none',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flex: 'none',
                    }}
                >
                    <img
                        src="/images/logo-cgc.webp"
                        alt="Logo du Conseil Gabonais des Chargeurs"
                        style={{
                            height: 46,
                            width: 46,
                            objectFit: 'contain',
                            borderRadius: '50%',
                            flex: 'none',
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 19,
                                fontWeight: 800,
                                color: '#142C73',
                                letterSpacing: '-.01em',
                                lineHeight: 1,
                            }}
                        >
                            e-CDTS
                        </span>
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '.09em',
                                color: '#5A6478',
                                textTransform: 'uppercase',
                            }}
                        >
                            Conseil Gabonais des Chargeurs
                        </span>
                    </div>
                </div>

                <nav
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flex: 1,
                        height: '100%',
                    }}
                >
                    {(coquille?.navigation ?? []).map((entry) => {
                        const on = entry.key === active;

                        return (
                            <Link
                                key={entry.key}
                                href={entry.href}
                                className={on ? undefined : 'ea-topnav'}
                                style={{
                                    textDecoration: 'none',
                                    fontSize: 13.5,
                                    fontWeight: on ? 700 : 500,
                                    color: on ? '#1D3E9C' : '#3A4356',
                                    padding: '0 14px',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: on
                                        ? '3px solid #1D3E9C'
                                        : '3px solid transparent',
                                    marginBottom: -1,
                                }}
                            >
                                {entry.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Puce utilisateur. La maquette n'y met pas de menu ; il en faut
                    un, sans quoi la déconnexion n'est atteignable nulle part. */}
                <div
                    ref={menuZone}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 'none',
                        position: 'relative',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setOpenMenu((o) => !o)}
                        aria-label="Menu du compte"
                        aria-expanded={openMenu}
                        className="ea-chipbtn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '4px 8px 4px 4px',
                            border: '1px solid transparent',
                            borderRadius: 10,
                            background: openMenu ? '#EEF2FB' : 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: '#1D3E9C',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12.5,
                                fontWeight: 700,
                                flex: 'none',
                            }}
                        >
                            {initials(nom)}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                alignItems: 'flex-start',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#1A1F2E',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {nom}
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: '#5A6478',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {qualite}
                            </span>
                        </div>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            style={{
                                flex: 'none',
                                color: '#8A93A6',
                                transform: openMenu
                                    ? 'rotate(180deg)'
                                    : undefined,
                                transition: 'transform .15s',
                            }}
                        >
                            <path
                                d="M4 6l4 4 4-4"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    {openMenu ? (
                        <div
                            style={{
                                position: 'absolute',
                                top: 52,
                                right: 0,
                                width: 224,
                                background: '#fff',
                                border: '1px solid #D8DEE9',
                                borderRadius: 11,
                                boxShadow: '0 12px 32px rgba(20,31,46,.16)',
                                zIndex: 40,
                                overflow: 'hidden',
                                padding: 5,
                            }}
                        >
                            <div
                                style={{
                                    padding: '8px 10px 9px',
                                    borderBottom: '1px solid #EDF0F5',
                                    marginBottom: 4,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: '#1A1F2E',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {nom}
                                </div>
                                <div style={{ fontSize: 11, color: '#5A6478' }}>
                                    {qualite}
                                </div>
                            </div>
                            <Link
                                href={profileEdit()}
                                onClick={() => setOpenMenu(false)}
                                className="ea-menuitem"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    padding: '9px 10px',
                                    borderRadius: 7,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#1A1F2E',
                                    textDecoration: 'none',
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    style={{ flex: 'none', color: '#5A6478' }}
                                >
                                    <circle
                                        cx="10"
                                        cy="7"
                                        r="3.1"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M4 16.4c0-2.9 2.7-4.6 6-4.6s6 1.7 6 4.6"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                Profil
                            </Link>
                            <Link
                                href={logout()}
                                as="button"
                                onClick={() => {
                                    setOpenMenu(false);
                                    router.flushAll();
                                }}
                                className="ea-menuitem ea-menuitem-danger"
                                data-test="logout-button"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    padding: '9px 10px',
                                    borderRadius: 7,
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#96271C',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    style={{ flex: 'none' }}
                                >
                                    <path
                                        d="M8 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h3"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M12.5 13.5 16 10l-3.5-3.5M16 10H8"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                Déconnexion
                            </Link>
                        </div>
                    ) : null}
                </div>
            </header>

            {/* ══ En-tête d'écran ══ */}
            <section
                style={{
                    background: '#FFFFFF',
                    borderBottom: '1px solid #D8DEE9',
                    flex: 'none',
                    position: 'relative',
                }}
            >
                <div style={{ padding: '14px 26px 0' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            color: '#5A6478',
                            marginBottom: 11,
                        }}
                    >
                        <Link
                            href="/dashboard"
                            style={{ color: '#5A6478', textDecoration: 'none' }}
                        >
                            Tableau de bord
                        </Link>
                        {[...crumbs, title].map((crumb, i, all) => (
                            <span key={crumb} style={{ display: 'contents' }}>
                                <span style={{ color: '#B4BCC9' }}>›</span>
                                <span
                                    style={{
                                        fontWeight:
                                            i === all.length - 1 ? 600 : 400,
                                        color:
                                            i === all.length - 1
                                                ? '#1A1F2E'
                                                : '#5A6478',
                                    }}
                                >
                                    {crumb}
                                </span>
                            </span>
                        ))}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 24,
                            flexWrap: 'wrap',
                            paddingBottom: 13,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                                maxWidth: 680,
                            }}
                        >
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: 22,
                                    fontWeight: 800,
                                    color: '#142C73',
                                    letterSpacing: '-.01em',
                                    lineHeight: 1.1,
                                }}
                            >
                                {title}
                            </h1>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 12.5,
                                    color: '#5A6478',
                                    lineHeight: 1.45,
                                }}
                            >
                                {subtitle}
                            </p>
                        </div>

                        {/* Carte de contexte : « chez qui » on est. Rien pour un
                            interne CGC, qui n'est chez personne (ADR-0030). */}
                        {contexte ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    background: '#F4F8FE',
                                    border: '1px solid #D5E1F5',
                                    borderRadius: 10,
                                    padding: '9px 15px',
                                    flex: 'none',
                                }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: '#1D3E9C',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: 'none',
                                    }}
                                >
                                    <svg
                                        width="19"
                                        height="19"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                    >
                                        <path
                                            d="M3.5 17.5V4.4a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v13.1"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M12 8.2h3.5a1 1 0 0 1 1 1v8.3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M2 17.6h16"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M5.9 6.6h3M5.9 9.6h3M5.9 12.6h3"
                                            stroke="currentColor"
                                            strokeWidth="1.4"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 9.5,
                                            fontWeight: 700,
                                            letterSpacing: '.1em',
                                            textTransform: 'uppercase',
                                            color: '#5A7BC0',
                                        }}
                                    >
                                        Espace de
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 800,
                                            color: '#142C73',
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        {contexte.societe}
                                    </span>
                                    {contexte.immatriculation ? (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: '#5A6478',
                                            }}
                                        >
                                            RCCM / NIF{' '}
                                            {contexte.immatriculation}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div
                    style={{
                        height: 9,
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-opacity='0.5' stroke-width='1.4'/%3E%3C/svg%3E\")",
                        backgroundRepeat: 'repeat-x',
                        backgroundPosition: 'bottom 2px left 0',
                        marginTop: 2,
                    }}
                />
            </section>

            {/* ══ Zone défilante ══ */}
            <main
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflow: 'auto',
                    background: '#F5F7FA',
                }}
            >
                {children}
            </main>
        </div>
    );
}
