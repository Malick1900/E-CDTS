import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';

/*
 * Onglet « Internes CGC » du module Utilisateurs & habilitations (Phase 2).
 * Backend réel : liste des comptes internes, filtres (recherche/rôle/statut,
 * côté client), création/édition via panneau latéral coulissant et bascule
 * d'activation. Les garde-fous (super-admin protégé, anti-auto-blocage) sont
 * appliqués côté serveur ; l'UI se contente de désactiver l'évident.
 * Style inline fidèle au design + classes de survol de ecdts-admin.css.
 */

export type UserRow = {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    job_title: string | null;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    is_self: boolean;
    is_protected: boolean;
    /** Faux quand ce compte porte un rôle que vous ne pourriez pas attribuer (ADR-0033). */
    peut_modifier: boolean;
    roles: string[];
};

type Props = {
    users: UserRow[];
    assignableRoles: string[];
    /** Ouvre le panneau de création (piloté par le bouton primaire de la page). */
    creatingSignal: number;
};

type Editing = { mode: 'create' } | { mode: 'edit'; user: UserRow };

const STATUT = {
    actif: {
        label: 'Actif',
        fg: '#21771F',
        bg: '#E7F5E7',
        bd: '#BFE4BF',
        dot: '#2F9E2F',
    },
    desactive: {
        label: 'Désactivé',
        fg: '#96271C',
        bg: '#FBEAE7',
        bd: '#E7B7AE',
        dot: '#C0392B',
    },
} as const;

function initials(
    first: string | null,
    last: string | null,
    fallback: string,
): string {
    const a = (first ?? '').trim();
    const b = (last ?? '').trim();

    if (a || b) {
        return ((a[0] ?? '') + (b[0] ?? '')).toUpperCase() || 'CG';
    }

    const parts = fallback.trim().split(/\s+/).filter(Boolean);

    return (
        (parts.length >= 2
            ? parts[0][0] + parts[parts.length - 1][0]
            : fallback.slice(0, 2)
        ).toUpperCase() || 'CG'
    );
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
});

function formatLastLogin(iso: string | null): string {
    if (!iso) {
        return 'Jamais';
    }

    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? 'Jamais' : dateFmt.format(d);
}

export default function InternesTab({
    users,
    assignableRoles,
    creatingSignal,
}: Props) {
    const [editing, setEditing] = useState<Editing | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statutFilter, setStatutFilter] = useState('all');
    const seenSignal = useRef(creatingSignal);

    const form = useForm<{
        first_name: string;
        last_name: string;
        phone: string;
        job_title: string;
        email: string;
        password: string;
        password_confirmation: string;
        roles: string[];
    }>({
        first_name: '',
        last_name: '',
        phone: '',
        job_title: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [],
    });

    const openCreate = () => {
        form.clearErrors();
        form.setDefaults({
            first_name: '',
            last_name: '',
            phone: '',
            job_title: '',
            email: '',
            password: '',
            password_confirmation: '',
            roles: [],
        });
        form.reset();
        setEditing({ mode: 'create' });
    };

    // Le bouton « Nouvel utilisateur » vit dans l'en-tête (page hôte) : il
    // incrémente creatingSignal, ce qui déclenche l'ouverture du panneau ici.
    useEffect(() => {
        if (creatingSignal !== seenSignal.current) {
            seenSignal.current = creatingSignal;
            openCreate();
        }
    });

    const openEdit = (user: UserRow) => {
        form.clearErrors();
        form.setData({
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            phone: user.phone ?? '',
            job_title: user.job_title ?? '',
            email: user.email,
            password: '',
            password_confirmation: '',
            roles: [...user.roles],
        });
        setEditing({ mode: 'edit', user });
    };

    const close = () => setEditing(null);

    const toggleRole = (role: string) => {
        form.setData(
            'roles',
            form.data.roles.includes(role)
                ? form.data.roles.filter((r) => r !== role)
                : [...form.data.roles, role],
        );
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (!editing) {
            return;
        }

        const options = { preserveScroll: true, onSuccess: () => close() };

        if (editing.mode === 'create') {
            form.post('/admin/utilisateurs', options);
        } else {
            form.patch(`/admin/utilisateurs/${editing.user.id}`, options);
        }
    };

    const toggleActive = (user: UserRow) => {
        router.patch(
            `/admin/utilisateurs/${user.id}/activation`,
            {},
            { preserveScroll: true },
        );
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return users.filter((u) => {
            if (
                q &&
                !`${u.name} ${u.email} ${u.job_title ?? ''}`
                    .toLowerCase()
                    .includes(q)
            ) {
                return false;
            }

            if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) {
                return false;
            }

            if (statutFilter === 'actif' && !u.is_active) {
                return false;
            }

            if (statutFilter === 'desactive' && u.is_active) {
                return false;
            }

            return true;
        });
    }, [users, search, roleFilter, statutFilter]);

    return (
        <div style={{ padding: '18px 26px 26px' }}>
            <div
                style={{
                    background: '#fff',
                    border: '1px solid #D8DEE9',
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                    overflow: 'hidden',
                }}
            >
                {/* Barre de filtres */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: '1px solid #E7EBF2',
                        background: '#FBFCFE',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ position: 'relative', flex: 'none' }}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            style={{
                                position: 'absolute',
                                left: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }}
                        >
                            <circle
                                cx="6"
                                cy="6"
                                r="4.6"
                                stroke="#8A93A6"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M9.5 9.5L13 13"
                                stroke="#8A93A6"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un nom, un courriel…"
                            style={{
                                width: 264,
                                height: 34,
                                border: '1px solid #D8DEE9',
                                borderRadius: 6,
                                padding: '0 12px 0 32px',
                                fontSize: 13,
                                color: '#1A1F2E',
                                background: '#fff',
                                outlineColor: '#1D3E9C',
                            }}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="all">Tous les rôles</option>
                        {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                    <select
                        value={statutFilter}
                        onChange={(e) => setStatutFilter(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actifs</option>
                        <option value="desactive">Désactivés</option>
                    </select>
                    <div style={{ flex: 1 }} />
                    <span
                        style={{
                            fontSize: 12,
                            color: '#8A93A6',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {filtered.length} / {users.length} utilisateur
                        {users.length > 1 ? 's' : ''}
                    </span>
                </div>

                {filtered.length === 0 ? (
                    <div
                        style={{
                            padding: '48px 20px',
                            textAlign: 'center',
                            color: '#8A93A6',
                            fontSize: 13,
                        }}
                    >
                        Aucun utilisateur ne correspond à la recherche.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                minWidth: 960,
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                            }}
                        >
                            <thead>
                                <tr>
                                    <th style={th}>Utilisateur</th>
                                    <th style={th}>Rôles cumulés</th>
                                    <th style={{ ...th, width: 120 }}>
                                        Statut
                                    </th>
                                    <th style={{ ...th, width: 170 }}>
                                        Dernière connexion
                                    </th>
                                    <th
                                        style={{
                                            ...th,
                                            width: 104,
                                            textAlign: 'center',
                                        }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((user) => {
                                    const st = user.is_active
                                        ? STATUT.actif
                                        : STATUT.desactive;
                                    const cannotEdit =
                                        user.is_protected ||
                                        !user.peut_modifier;
                                    const cannotToggle =
                                        cannotEdit ||
                                        (user.is_active && user.is_self);
                                    const editTitle = user.is_protected
                                        ? 'Compte technique protégé'
                                        : !user.peut_modifier
                                          ? 'Ce compte porte des rôles que vous ne pouvez pas attribuer'
                                          : 'Modifier';

                                    return (
                                        <tr key={user.id}>
                                            <td style={td}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 11,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 34,
                                                            height: 34,
                                                            borderRadius: '50%',
                                                            background:
                                                                user.is_active
                                                                    ? '#1D3E9C'
                                                                    : '#B4BCC9',
                                                            color: '#fff',
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            flex: 'none',
                                                        }}
                                                    >
                                                        {initials(
                                                            user.first_name,
                                                            user.last_name,
                                                            user.name,
                                                        )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection:
                                                                'column',
                                                            gap: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 7,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 13.5,
                                                                    fontWeight: 700,
                                                                    color: '#1A1F2E',
                                                                    whiteSpace:
                                                                        'nowrap',
                                                                }}
                                                            >
                                                                {user.name}
                                                            </span>
                                                            {user.is_self ? (
                                                                <span
                                                                    style={{
                                                                        fontSize: 9.5,
                                                                        fontWeight: 700,
                                                                        letterSpacing:
                                                                            '.05em',
                                                                        color: '#14509C',
                                                                        background:
                                                                            '#E4F3FC',
                                                                        border: '1px solid #B5DFF7',
                                                                        borderRadius: 4,
                                                                        padding:
                                                                            '1px 6px',
                                                                        textTransform:
                                                                            'uppercase',
                                                                    }}
                                                                >
                                                                    Vous
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <span
                                                            style={{
                                                                fontSize: 11.5,
                                                                color: '#5A6478',
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                        >
                                                            {user.email}
                                                            {user.job_title
                                                                ? ` · ${user.job_title}`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: 5,
                                                        maxWidth: 320,
                                                    }}
                                                >
                                                    {user.roles.length === 0 ? (
                                                        <span
                                                            style={{
                                                                fontSize: 11.5,
                                                                color: '#B4BCC9',
                                                            }}
                                                        >
                                                            Aucun rôle
                                                        </span>
                                                    ) : (
                                                        user.roles.map(
                                                            (role) => (
                                                                <span
                                                                    key={role}
                                                                    style={{
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        color: user.is_protected
                                                                            ? '#96271C'
                                                                            : '#3A4356',
                                                                        background:
                                                                            user.is_protected
                                                                                ? '#FBEAE7'
                                                                                : '#EEF1F7',
                                                                        border: `1px solid ${user.is_protected ? '#E7B7AE' : '#D8DEE9'}`,
                                                                        borderRadius: 5,
                                                                        padding:
                                                                            '2px 8px',
                                                                    }}
                                                                >
                                                                    {role}
                                                                </span>
                                                            ),
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        color: st.fg,
                                                        background: st.bg,
                                                        border: `1px solid ${st.bd}`,
                                                        borderRadius: 5,
                                                        padding: '2px 9px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: st.dot,
                                                            flex: 'none',
                                                        }}
                                                    />
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    ...td,
                                                    fontSize: 12.5,
                                                    color: '#3A4356',
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {formatLastLogin(
                                                    user.last_login_at,
                                                )}
                                            </td>
                                            <td style={td}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(user)
                                                        }
                                                        disabled={cannotEdit}
                                                        title={editTitle}
                                                        className="ea-icon-btn"
                                                        style={{
                                                            ...iconBtn,
                                                            color: '#1D3E9C',
                                                            opacity: cannotEdit
                                                                ? 0.4
                                                                : 1,
                                                            cursor: cannotEdit
                                                                ? 'not-allowed'
                                                                : 'pointer',
                                                        }}
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
                                                                stroke="currentColor"
                                                                strokeWidth="1.3"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleActive(user)
                                                        }
                                                        disabled={cannotToggle}
                                                        title={
                                                            cannotEdit
                                                                ? editTitle
                                                                : user.is_active &&
                                                                    user.is_self
                                                                  ? 'Vous ne pouvez pas désactiver votre propre compte'
                                                                  : user.is_active
                                                                    ? 'Désactiver le compte'
                                                                    : 'Réactiver le compte'
                                                        }
                                                        className={
                                                            user.is_active
                                                                ? 'ea-icon-danger'
                                                                : 'ea-icon-btn'
                                                        }
                                                        style={{
                                                            ...iconBtn,
                                                            color: user.is_active
                                                                ? '#C0392B'
                                                                : '#21771F',
                                                            borderColor:
                                                                user.is_active
                                                                    ? '#E0B4AD'
                                                                    : '#BFE4BF',
                                                            opacity:
                                                                cannotToggle
                                                                    ? 0.4
                                                                    : 1,
                                                            cursor: cannotToggle
                                                                ? 'not-allowed'
                                                                : 'pointer',
                                                        }}
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 16 16"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M8 2.2v5"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M4.7 4.4a4.6 4.6 0 1 0 6.6 0"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editing ? (
                <>
                    <div
                        onMouseDown={close}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(20,31,46,.42)',
                            zIndex: 50,
                            animation: 'ecdtsFade .18s ease',
                        }}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: 464,
                            background: '#fff',
                            zIndex: 51,
                            boxShadow: '-14px 0 40px rgba(20,44,115,.22)',
                            display: 'flex',
                            flexDirection: 'column',
                            animation: 'ecdtsPanel .22s ease',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '16px 20px',
                                borderBottom: '1px solid #E7EBF2',
                                flex: 'none',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: 16,
                                        fontWeight: 800,
                                        color: '#1A1F2E',
                                    }}
                                >
                                    {editing.mode === 'create'
                                        ? 'Nouvel utilisateur'
                                        : 'Modifier l’utilisateur'}
                                </h3>
                                <span
                                    style={{ fontSize: 11.5, color: '#5A6478' }}
                                >
                                    Compte interne CGC · rôles cumulables
                                </span>
                            </div>
                            <div style={{ flex: 1 }} />
                            <button
                                type="button"
                                onClick={close}
                                title="Fermer"
                                className="ea-close"
                                style={{
                                    width: 30,
                                    height: 30,
                                    border: 'none',
                                    background: '#F0F2F7',
                                    color: '#5A6478',
                                    borderRadius: 6,
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={submit}
                            style={{
                                flex: '1 1 auto',
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div
                                style={{
                                    flex: '1 1 auto',
                                    minHeight: 0,
                                    overflow: 'auto',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 14,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px 14px',
                                    }}
                                >
                                    <Field
                                        label="Prénom"
                                        required
                                        error={form.errors.first_name}
                                    >
                                        <input
                                            style={input}
                                            value={form.data.first_name}
                                            onChange={(e) =>
                                                form.setData(
                                                    'first_name',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Prénom"
                                            autoFocus
                                        />
                                    </Field>
                                    <Field
                                        label="Nom"
                                        required
                                        error={form.errors.last_name}
                                    >
                                        <input
                                            style={input}
                                            value={form.data.last_name}
                                            onChange={(e) =>
                                                form.setData(
                                                    'last_name',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Nom"
                                        />
                                    </Field>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <Field
                                            label="Courriel professionnel"
                                            required
                                            error={form.errors.email}
                                        >
                                            <input
                                                type="email"
                                                style={input}
                                                value={form.data.email}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'email',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="prenom.nom@cgc.ga"
                                            />
                                        </Field>
                                    </div>
                                    <Field
                                        label="Téléphone"
                                        required
                                        error={form.errors.phone}
                                    >
                                        <input
                                            style={input}
                                            value={form.data.phone}
                                            onChange={(e) =>
                                                form.setData(
                                                    'phone',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="+241 …"
                                        />
                                    </Field>
                                    <Field
                                        label="Poste au CGC"
                                        required
                                        error={form.errors.job_title}
                                    >
                                        <input
                                            style={input}
                                            value={form.data.job_title}
                                            onChange={(e) =>
                                                form.setData(
                                                    'job_title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Agent liquidateur…"
                                        />
                                    </Field>
                                </div>

                                <div
                                    style={{ height: 1, background: '#E7EBF2' }}
                                />

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px 14px',
                                    }}
                                >
                                    <div
                                        style={{
                                            gridColumn: form.data.password
                                                ? 'auto'
                                                : '1 / -1',
                                        }}
                                    >
                                        <Field
                                            label={
                                                editing.mode === 'create'
                                                    ? 'Mot de passe'
                                                    : 'Nouveau mot de passe'
                                            }
                                            required={editing.mode === 'create'}
                                            error={form.errors.password}
                                            hint={
                                                editing.mode === 'edit'
                                                    ? 'Laisser vide pour conserver le mot de passe actuel.'
                                                    : undefined
                                            }
                                        >
                                            <input
                                                type="password"
                                                style={input}
                                                value={form.data.password}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'password',
                                                        e.target.value,
                                                    )
                                                }
                                                autoComplete="new-password"
                                            />
                                        </Field>
                                    </div>
                                    {form.data.password ? (
                                        <Field label="Confirmer" required>
                                            <input
                                                type="password"
                                                style={input}
                                                value={
                                                    form.data
                                                        .password_confirmation
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'password_confirmation',
                                                        e.target.value,
                                                    )
                                                }
                                                autoComplete="new-password"
                                            />
                                        </Field>
                                    ) : null}
                                </div>

                                <div
                                    style={{ height: 1, background: '#E7EBF2' }}
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 9,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                color: '#1A1F2E',
                                            }}
                                        >
                                            Rôles attribués{' '}
                                            <span style={{ color: '#C0392B' }}>
                                                *
                                            </span>
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: '#8A93A6',
                                            }}
                                        >
                                            — un ou plusieurs (cumulables)
                                        </span>
                                    </div>
                                    {assignableRoles.map((role) => {
                                        const on =
                                            form.data.roles.includes(role);

                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => toggleRole(role)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 11,
                                                    padding: '10px 12px',
                                                    border: `1px solid ${on ? '#1D3E9C' : '#D8DEE9'}`,
                                                    borderRadius: 8,
                                                    background: on
                                                        ? '#F5F8FD'
                                                        : '#fff',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: 5,
                                                        border: `1.5px solid ${on ? '#1D3E9C' : '#C3CBDA'}`,
                                                        background: on
                                                            ? '#1D3E9C'
                                                            : '#fff',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                        flex: 'none',
                                                    }}
                                                >
                                                    {on ? (
                                                        <svg
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 12 12"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M2 6.3l2.4 2.4L10 3"
                                                                stroke="#fff"
                                                                strokeWidth="1.9"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    ) : null}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: '#1A1F2E',
                                                    }}
                                                >
                                                    {role}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {form.errors.roles ? (
                                        <span
                                            style={{
                                                fontSize: 11.5,
                                                color: '#C0392B',
                                            }}
                                        >
                                            {form.errors.roles}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '14px 20px',
                                    borderTop: '1px solid #E7EBF2',
                                    flex: 'none',
                                    background: '#FBFCFE',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 11.5,
                                        color: '#8A93A6',
                                        lineHeight: 1.35,
                                        flex: 1,
                                    }}
                                >
                                    L’identifiant de connexion est l’adresse
                                    courriel.
                                </span>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="ea-btn-cancel"
                                    style={{
                                        height: 38,
                                        padding: '0 16px',
                                        border: '1px solid #C3CBDA',
                                        borderRadius: 6,
                                        background: '#fff',
                                        color: '#3A4356',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="ea-btn-primary"
                                    style={{
                                        height: 38,
                                        padding: '0 16px',
                                        border: 'none',
                                        borderRadius: 6,
                                        background: '#1D3E9C',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: form.processing
                                            ? 'wait'
                                            : 'pointer',
                                        opacity: form.processing ? 0.7 : 1,
                                    }}
                                >
                                    {editing.mode === 'create'
                                        ? 'Créer le compte'
                                        : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            ) : null}
        </div>
    );
}

const th: CSSProperties = {
    background: '#1D3E9C',
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '9px 12px',
    borderBottom: '2px solid #142C73',
};
const td: CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #E7EBF2',
    verticalAlign: 'middle',
};
const iconBtn: CSSProperties = {
    width: 30,
    height: 30,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};
const input: CSSProperties = {
    height: 36,
    width: '100%',
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 10px',
    fontSize: 13,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
    background: '#fff',
};
const selectStyle: CSSProperties = {
    height: 34,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    background: '#fff',
    appearance: 'none',
    WebkitAppearance: 'none',
    padding: '0 30px 0 12px',
    fontSize: 13,
    color: '#1A1F2E',
    outlineColor: '#1D3E9C',
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%233A4356' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
};

function Field({
    label,
    required,
    error,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3A4356' }}>
                {label}{' '}
                {required ? <span style={{ color: '#C0392B' }}>*</span> : null}
            </span>
            {children}
            {hint ? (
                <span style={{ fontSize: 11, color: '#8A93A6' }}>{hint}</span>
            ) : null}
            {error ? (
                <span style={{ fontSize: 11.5, color: '#C0392B' }}>
                    {error}
                </span>
            ) : null}
        </label>
    );
}
