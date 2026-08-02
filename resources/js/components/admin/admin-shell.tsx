import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { logout } from '@/routes';
import '../../../css/ecdts-admin.css';

/*
 * Coquille partagée des écrans d'administration CGC.
 * Reproduit fidèlement la maquette Claude Design : bandeau institutionnel,
 * rail bleu marine (4 modules), en-tête d'écran (fil d'Ariane + chip utilisateur
 * + titre/sous-titre + action principale) et barre d'onglets optionnelle.
 * Chaque module = une route Inertia (/admin/...). Les données restent à câbler.
 */

export type AdminModule = 'users' | 'ref' | 'bareme' | 'audit';

type Tab = { key: string; label: string; badge?: number };

type AdminShellProps = {
    module: AdminModule;
    title: string;
    subtitle: string;
    /** Dernier maillon du fil d'Ariane (au-delà du module). */
    crumbSub?: string;
    primary?: { label: string; onClick: () => void };
    tabs?: Tab[];
    activeTab?: string;
    onTab?: (key: string) => void;
    children: ReactNode;
};

type ModuleMeta = {
    label: string;
    href: string;
    icon: ReactNode;
    headIcon: ReactNode;
};

const railIcon = {
    users: (
        <svg
            width="19"
            height="19"
            viewBox="0 0 20 20"
            fill="none"
            style={{ flex: 'none' }}
        >
            <circle
                cx="7"
                cy="6.4"
                r="2.9"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M2.2 16.5c0-2.9 2.1-4.9 4.8-4.9s4.8 2 4.8 4.9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <circle
                cx="14.3"
                cy="7.2"
                r="2.2"
                stroke="currentColor"
                strokeWidth="1.4"
            />
            <path
                d="M13 12c2.6-.5 4.8 1.2 4.8 4.2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
            />
        </svg>
    ),
    ref: (
        <svg
            width="19"
            height="19"
            viewBox="0 0 20 20"
            fill="none"
            style={{ flex: 'none' }}
        >
            <ellipse
                cx="10"
                cy="5"
                rx="6.4"
                ry="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M3.6 5v5c0 1.4 2.9 2.5 6.4 2.5s6.4-1.1 6.4-2.5V5"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M3.6 10v5c0 1.4 2.9 2.5 6.4 2.5s6.4-1.1 6.4-2.5v-5"
                stroke="currentColor"
                strokeWidth="1.5"
            />
        </svg>
    ),
    bareme: (
        <svg
            width="19"
            height="19"
            viewBox="0 0 20 20"
            fill="none"
            style={{ flex: 'none' }}
        >
            <path
                d="M10.6 2.5H16A1.5 1.5 0 0 1 17.5 4v5.4a1.5 1.5 0 0 1-.44 1.06l-6.1 6.1a1.5 1.5 0 0 1-2.12 0l-5.4-5.4a1.5 1.5 0 0 1 0-2.12l6.1-6.1A1.5 1.5 0 0 1 10.6 2.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle cx="13.4" cy="6.6" r="1.2" fill="currentColor" />
        </svg>
    ),
    audit: (
        <svg
            width="19"
            height="19"
            viewBox="0 0 20 20"
            fill="none"
            style={{ flex: 'none' }}
        >
            <path
                d="M10 2.2l6 2.1v4.3c0 3.7-2.5 6.6-6 7.7-3.5-1.1-6-4-6-7.7V4.3l6-2.1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M7.3 9.6l1.9 1.9 3.6-3.9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
};

const headIcon = {
    users: (
        <svg width="21" height="21" viewBox="0 0 20 20" fill="none">
            <circle cx="7" cy="6.4" r="2.9" stroke="#fff" strokeWidth="1.6" />
            <path
                d="M2.2 16.5c0-2.9 2.1-4.9 4.8-4.9s4.8 2 4.8 4.9"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <circle
                cx="14.3"
                cy="7.2"
                r="2.2"
                stroke="#fff"
                strokeWidth="1.5"
            />
            <path
                d="M13 12c2.6-.5 4.8 1.2 4.8 4.2"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    ),
    ref: (
        <svg width="21" height="21" viewBox="0 0 20 20" fill="none">
            <ellipse
                cx="10"
                cy="5"
                rx="6.4"
                ry="2.5"
                stroke="#fff"
                strokeWidth="1.6"
            />
            <path
                d="M3.6 5v5c0 1.4 2.9 2.5 6.4 2.5s6.4-1.1 6.4-2.5V5"
                stroke="#fff"
                strokeWidth="1.6"
            />
            <path
                d="M3.6 10v5c0 1.4 2.9 2.5 6.4 2.5s6.4-1.1 6.4-2.5v-5"
                stroke="#fff"
                strokeWidth="1.6"
            />
        </svg>
    ),
    bareme: (
        <svg width="21" height="21" viewBox="0 0 20 20" fill="none">
            <path
                d="M10.6 2.5H16A1.5 1.5 0 0 1 17.5 4v5.4a1.5 1.5 0 0 1-.44 1.06l-6.1 6.1a1.5 1.5 0 0 1-2.12 0l-5.4-5.4a1.5 1.5 0 0 1 0-2.12l6.1-6.1A1.5 1.5 0 0 1 10.6 2.5z"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <circle cx="13.4" cy="6.6" r="1.2" fill="#fff" />
        </svg>
    ),
    audit: (
        <svg width="21" height="21" viewBox="0 0 20 20" fill="none">
            <path
                d="M10 2.2l6 2.1v4.3c0 3.7-2.5 6.6-6 7.7-3.5-1.1-6-4-6-7.7V4.3l6-2.1z"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path
                d="M7.3 9.6l1.9 1.9 3.6-3.9"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
};

const MODULES: Record<AdminModule, ModuleMeta> = {
    users: {
        label: 'Utilisateurs & habilitations',
        href: '/admin/utilisateurs',
        icon: railIcon.users,
        headIcon: headIcon.users,
    },
    ref: {
        label: 'Référentiels',
        href: '/admin/referentiels',
        icon: railIcon.ref,
        headIcon: headIcon.ref,
    },
    bareme: {
        label: 'Barème',
        href: '/admin/bareme',
        icon: railIcon.bareme,
        headIcon: headIcon.bareme,
    },
    audit: {
        label: "Journal d'audit",
        href: '/admin/audit',
        icon: railIcon.audit,
        headIcon: headIcon.audit,
    },
};

const MODULE_ORDER: AdminModule[] = ['users', 'ref', 'bareme', 'audit'];

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

export default function AdminShell({
    module,
    title,
    subtitle,
    crumbSub,
    primary,
    tabs,
    activeTab,
    onTab,
    children,
}: AdminShellProps) {
    const page = usePage();
    const user = (page.props as { auth?: { user?: { name?: string } } }).auth
        ?.user;
    /*
     * Comptes agents en attente (ADR-0013). Donnée partagée par le serveur et
     * non prop de page : le badge vit dans le rail, donc s'affiche depuis
     * n'importe quel module de l'administration. Vaut 0 pour qui n'a pas la
     * charge des comptes clients.
     */
    const usersAlert =
        (page.props as { admin?: { agentsAValider?: number } }).admin
            ?.agentsAValider ?? 0;
    /*
     * Les modules ouverts à ce compte, filtrés par le serveur comme la
     * navigation d'activité (ADR-0030) : le rail ne propose pas un écran qui
     * répondrait 403. Le module courant y figure toujours — on n'y serait pas
     * arrivé sinon.
     */
    const ouverts = (page.props as { admin?: { modules?: AdminModule[] } })
        .admin?.modules;
    const rail = ouverts
        ? MODULE_ORDER.filter((key) => ouverts.includes(key))
        : MODULE_ORDER;
    const adminName = user?.name ?? 'Administrateur CGC';
    /*
     * Le profil du compte, tel que le serveur le calcule pour les deux
     * coquilles. Le panneau l'affichait en dur — « Administrateur — CGC » —
     * donc faux pour un Superviseur, qui n'a pourtant pas les mêmes écrans.
     */
    const adminRole = (page.props as { coquille?: { qualite?: string | null } })
        .coquille?.qualite;
    const current = MODULES[module];

    // Menus de l'en-tête : cloche notifications et puce utilisateur (exclusifs).
    const [openMenu, setOpenMenu] = useState<'notif' | 'user' | null>(null);
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
                setOpenMenu(null);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenMenu(null);
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
                    Espace d'administration — Conseil Gabonais des Chargeurs
                </span>
            </div>

            {/* ══ Corps : rail + contenu ══ */}
            <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                {/* ─── Rail de navigation ─── */}
                <aside
                    style={{
                        width: 250,
                        flex: 'none',
                        background: '#1D3E9C',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#C9D4F0',
                    }}
                >
                    <div
                        style={{
                            padding: '17px 16px 15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 11,
                            borderBottom: '1px solid rgba(255,255,255,.13)',
                        }}
                    >
                        <img
                            src="/images/logo-cgc.webp"
                            alt="Logo du Conseil Gabonais des Chargeurs"
                            style={{
                                width: 70,
                                height: 58,
                                objectFit: 'contain',
                                flex: 'none',
                                display: 'block',
                            }}
                        />
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                minWidth: 0,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: '#FFFFFF',
                                    letterSpacing: '-.01em',
                                    lineHeight: 1,
                                }}
                            >
                                e-CDTS
                            </span>
                            <span
                                style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    letterSpacing: '.13em',
                                    color: '#9DB2E8',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Administration
                            </span>
                        </div>
                    </div>

                    <nav
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            overflow: 'auto',
                            padding: '12px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                        }}
                    >
                        {rail.map((key) => {
                            const meta = MODULES[key];
                            const active = key === module;

                            return (
                                <Link
                                    key={key}
                                    href={meta.href}
                                    className={active ? undefined : 'ea-nav'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 11,
                                        padding: '10px 11px',
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: active ? 700 : 600,
                                        textAlign: 'left',
                                        textDecoration: 'none',
                                        color: active ? '#fff' : '#C9D4F0',
                                        background: active
                                            ? 'rgba(255,255,255,.15)'
                                            : 'transparent',
                                        // Liseré d'accent vertical à gauche de l'item actif (design).
                                        boxShadow: active
                                            ? 'inset 3px 0 0 #7EC8F0'
                                            : undefined,
                                    }}
                                >
                                    {meta.icon}
                                    <span
                                        style={{ flex: 1, textAlign: 'left' }}
                                    >
                                        {meta.label}
                                    </span>
                                    {key === 'users' && usersAlert ? (
                                        <span
                                            title="Comptes agents à valider"
                                            style={{
                                                minWidth: 19,
                                                height: 19,
                                                padding: '0 5px',
                                                borderRadius: 10,
                                                background: '#E07B00',
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 800,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                                flex: 'none',
                                            }}
                                        >
                                            {usersAlert}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </nav>

                    <div
                        style={{
                            flex: 'none',
                            padding: '12px 12px 14px',
                            borderTop: '1px solid rgba(255,255,255,.13)',
                        }}
                    >
                        <Link
                            href="/dashboard"
                            className="ea-backlink"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '8px 10px',
                                borderRadius: 7,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#C9D4F0',
                                textDecoration: 'none',
                            }}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 16 16"
                                fill="none"
                                style={{ flex: 'none' }}
                            >
                                <path
                                    d="M9.5 3.5L5 8l4.5 4.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            Retour à la plateforme
                        </Link>
                    </div>
                </aside>

                {/* ─── Colonne de contenu ─── */}
                <div
                    style={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#F5F7FA',
                    }}
                >
                    {/* En-tête d'écran */}
                    <section
                        style={{
                            background: '#FFFFFF',
                            borderBottom: '1px solid #D8DEE9',
                            flex: 'none',
                            position: 'relative',
                        }}
                    >
                        <div style={{ padding: '13px 26px 13px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                    marginBottom: 9,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        color: '#5A6478',
                                        minWidth: 0,
                                    }}
                                >
                                    <span style={{ color: '#8A93A6' }}>
                                        Administration
                                    </span>
                                    <span style={{ color: '#B4BCC9' }}>›</span>
                                    <span
                                        style={{
                                            fontWeight: crumbSub ? 400 : 600,
                                            color: crumbSub
                                                ? '#5A6478'
                                                : '#1A1F2E',
                                        }}
                                    >
                                        {current.label}
                                    </span>
                                    {crumbSub ? (
                                        <>
                                            <span style={{ color: '#B4BCC9' }}>
                                                ›
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color: '#1A1F2E',
                                                }}
                                            >
                                                {crumbSub}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                                <div
                                    ref={menuZone}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flex: 'none',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Cloche de notifications */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenMenu((m) =>
                                                m === 'notif' ? null : 'notif',
                                            )
                                        }
                                        aria-label="Notifications"
                                        aria-expanded={openMenu === 'notif'}
                                        className="ea-iconbtn"
                                        style={{
                                            position: 'relative',
                                            width: 36,
                                            height: 36,
                                            borderRadius: 9,
                                            border: '1px solid #D8DEE9',
                                            background:
                                                openMenu === 'notif'
                                                    ? '#EEF2FB'
                                                    : '#fff',
                                            color: '#5A6478',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flex: 'none',
                                        }}
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 20 20"
                                            fill="none"
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
                                    </button>

                                    {/* Puce utilisateur (ouvre le menu profil / déconnexion) */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenMenu((m) =>
                                                m === 'user' ? null : 'user',
                                            )
                                        }
                                        aria-label="Menu du compte"
                                        aria-expanded={openMenu === 'user'}
                                        className="ea-chipbtn"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '4px 8px 4px 4px',
                                            border: '1px solid transparent',
                                            borderRadius: 10,
                                            background:
                                                openMenu === 'user'
                                                    ? '#EEF2FB'
                                                    : 'transparent',
                                            cursor: 'pointer',
                                            flex: 'none',
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
                                            {initials(adminName)}
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
                                                {adminName}
                                            </span>
                                            {adminRole ? (
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#5A6478',
                                                        lineHeight: 1.2,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {adminRole}
                                                </span>
                                            ) : null}
                                        </div>
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            style={{
                                                flex: 'none',
                                                color: '#8A93A6',
                                                transform:
                                                    openMenu === 'user'
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

                                    {/* Popover notifications */}
                                    {openMenu === 'notif' ? (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 44,
                                                right: 0,
                                                width: 288,
                                                background: '#fff',
                                                border: '1px solid #D8DEE9',
                                                borderRadius: 11,
                                                boxShadow:
                                                    '0 12px 32px rgba(20,31,46,.16)',
                                                zIndex: 40,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding: '11px 14px',
                                                    borderBottom:
                                                        '1px solid #EDF0F5',
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
                                                <svg
                                                    width="26"
                                                    height="26"
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    style={{ color: '#C3CAD6' }}
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
                                                <span
                                                    style={{ fontSize: 12.5 }}
                                                >
                                                    Aucune notification pour le
                                                    moment.
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Menu du compte */}
                                    {openMenu === 'user' ? (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 44,
                                                right: 0,
                                                width: 224,
                                                background: '#fff',
                                                border: '1px solid #D8DEE9',
                                                borderRadius: 11,
                                                boxShadow:
                                                    '0 12px 32px rgba(20,31,46,.16)',
                                                zIndex: 40,
                                                overflow: 'hidden',
                                                padding: 5,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    padding: '8px 10px 9px',
                                                    borderBottom:
                                                        '1px solid #EDF0F5',
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
                                                        textOverflow:
                                                            'ellipsis',
                                                    }}
                                                >
                                                    {adminName}
                                                </div>
                                                {adminRole ? (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: '#5A6478',
                                                        }}
                                                    >
                                                        {adminRole}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <Link
                                                href="/profil"
                                                onClick={() =>
                                                    setOpenMenu(null)
                                                }
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
                                                    style={{
                                                        flex: 'none',
                                                        color: '#5A6478',
                                                    }}
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
                                                    setOpenMenu(null);
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
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 24,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 13,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 11,
                                            background:
                                                'linear-gradient(135deg,#1D3E9C,#142C73)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flex: 'none',
                                            boxShadow:
                                                '0 2px 8px rgba(20,44,115,.28)',
                                        }}
                                    >
                                        {current.headIcon}
                                    </div>
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
                                </div>
                                {primary ? (
                                    <button
                                        onClick={primary.onClick}
                                        className="ea-btn-primary"
                                        style={{
                                            height: 38,
                                            padding: '0 16px',
                                            border: 'none',
                                            borderRadius: 7,
                                            background: '#1D3E9C',
                                            color: '#fff',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 7,
                                            flex: 'none',
                                        }}
                                    >
                                        <svg
                                            width="15"
                                            height="15"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                        >
                                            <path
                                                d="M8 3v10M3 8h10"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        {primary.label}
                                    </button>
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
                            }}
                        />
                    </section>

                    {/* Onglets internes */}
                    {tabs && tabs.length > 0 ? (
                        <div
                            style={{
                                background: '#fff',
                                borderBottom: '1px solid #D8DEE9',
                                padding: '0 26px',
                                display: 'flex',
                                gap: 2,
                                flex: 'none',
                            }}
                        >
                            {tabs.map((t) => {
                                const on = t.key === activeTab;

                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => onTab?.(t.key)}
                                        className={on ? undefined : 'ea-tab'}
                                        style={{
                                            padding: '12px 16px 11px',
                                            border: 'none',
                                            borderBottom: on
                                                ? '2.5px solid #1D3E9C'
                                                : '2.5px solid transparent',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: on ? 700 : 600,
                                            color: on ? '#1D3E9C' : '#5A6478',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 7,
                                        }}
                                    >
                                        {t.label}
                                        {typeof t.badge === 'number' ? (
                                            <span
                                                style={{
                                                    minWidth: 18,
                                                    height: 18,
                                                    padding: '0 5px',
                                                    borderRadius: 9,
                                                    background: on
                                                        ? '#1D3E9C'
                                                        : '#D8DEE9',
                                                    color: on
                                                        ? '#fff'
                                                        : '#5A6478',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                }}
                                            >
                                                {t.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}

                    {/* Zone défilante */}
                    <main
                        style={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            overflow: 'auto',
                            position: 'relative',
                        }}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
