import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { BandeauInfo, card, Th } from '@/components/admin/ui';
import type { GroupePermissions, RoleMatriceRow } from '@/components/admin/users/types';

/*
 * Matrice « Rôles & permissions » (ADR-0025).
 *
 * Les permissions viennent du code et ne sont ni créables ni supprimables
 * d'ici : l'écran dit seulement QUI porte QUOI. Deux rôles échappent à
 * l'édition — `super-admin`, absent de la matrice (il outrepasse via Gate et ne
 * porte rien d'explicite), et `Administrateur`, présent mais figé (il porte le
 * catalogue complet par définition). C'est ce qui rend l'auto-blocage impossible
 * sans avoir à l'interdire.
 *
 * L'enregistrement se fait colonne par colonne : on ajuste un rôle librement,
 * puis on valide — ou on annule. Une seule requête par rôle.
 */

const BASE = '/admin/utilisateurs/roles';

type Props = {
    roles: RoleMatriceRow[];
    catalogue: GroupePermissions[];
};

/** Colonne en cours d'édition : le rôle, et l'ensemble coché à cet instant. */
type Brouillon = { role: string; permissions: Set<string> };

export default function RolesTab({ roles, catalogue }: Props) {
    const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
    const [enCours, setEnCours] = useState(false);

    /** Composition enregistrée, par rôle — la référence pour détecter un écart. */
    const enregistre = useMemo(
        () => new Map(roles.map((r) => [r.name, new Set(r.permissions)])),
        [roles],
    );

    const cochee = (role: RoleMatriceRow, permission: string): boolean =>
        brouillon?.role === role.name
            ? brouillon.permissions.has(permission)
            : (enregistre.get(role.name)?.has(permission) ?? false);

    /*
     * Basculer une case ouvre le brouillon de la colonne si besoin. Changer de
     * colonne remplace le brouillon : on ne modifie qu'un rôle à la fois, ce qui
     * évite d'enregistrer sans le vouloir des ajustements faits ailleurs.
     */
    const basculer = (role: RoleMatriceRow, permission: string) => {
        setBrouillon((actuel) => {
            const base = actuel?.role === role.name ? new Set(actuel.permissions) : new Set(enregistre.get(role.name) ?? []);

            if (base.has(permission)) {
                base.delete(permission);
            } else {
                base.add(permission);
            }

            return { role: role.name, permissions: base };
        });
    };

    const modifiee = (role: RoleMatriceRow): boolean => {
        if (brouillon?.role !== role.name) {
            return false;
        }

        const initial = enregistre.get(role.name) ?? new Set<string>();

        return initial.size !== brouillon.permissions.size || [...brouillon.permissions].some((p) => !initial.has(p));
    };

    const enregistrer = (role: RoleMatriceRow) => {
        if (!brouillon || brouillon.role !== role.name) {
            return;
        }

        router.patch(
            `${BASE}/${role.id}`,
            { permissions: [...brouillon.permissions] },
            {
                preserveScroll: true,
                onStart: () => setEnCours(true),
                onFinish: () => setEnCours(false),
                onSuccess: () => setBrouillon(null),
            },
        );
    };

    const largeurColonne = 118;

    return (
        <div style={{ padding: '18px 26px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BandeauInfo titre="Ce que cet écran modifie">
                Les permissions sont définies par le code : on ne peut ni en créer, ni en supprimer, ni ajouter ou renommer un rôle. Seule la
                <strong> composition</strong> des rôles se modifie ici. La colonne <strong>Administrateur</strong> porte le catalogue complet par
                définition et n'est pas modifiable ; le rôle technique <strong>super-admin</strong> n'y figure pas.
            </BandeauInfo>

            <div style={{ ...card, overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 620 + roles.length * largeurColonne, borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr>
                            <Th first>Permission</Th>
                            {roles.map((role) => (
                                <Th key={role.name} w={largeurColonne} center>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                        {role.name}
                                        {!role.recomposable && <CadenasIcon />}
                                    </span>
                                </Th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {catalogue.map((groupe) => (
                            <GroupeLignes key={groupe.domaine} groupe={groupe} roles={roles} cochee={cochee} basculer={basculer} />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style={{ padding: '12px 16px', borderTop: '1px solid #E7EBF2', fontSize: 11.5, color: '#8A93A6' }}>
                                {brouillon ? 'Modifications non enregistrées' : 'Aucune modification en attente'}
                            </td>
                            {roles.map((role) => (
                                <td key={role.name} style={{ padding: '10px 8px', borderTop: '1px solid #E7EBF2', textAlign: 'center', verticalAlign: 'top' }}>
                                    {modifiee(role) ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'stretch' }}>
                                            <button
                                                type="button"
                                                onClick={() => enregistrer(role)}
                                                disabled={enCours}
                                                className="ea-btn-primary"
                                                style={{ height: 30, border: 'none', borderRadius: 6, background: '#1D3E9C', color: '#fff', fontSize: 12, fontWeight: 700, cursor: enCours ? 'progress' : 'pointer' }}
                                            >
                                                Enregistrer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBrouillon(null)}
                                                disabled={enCours}
                                                style={{ height: 26, border: '1px solid #D8DEE9', borderRadius: 6, background: '#fff', color: '#5A6478', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    ) : null}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <p style={{ margin: '0 2px', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.5, maxWidth: 900 }}>
                Une permission retirée s'applique dès la connexion suivante des comptes portant ce rôle. Un rôle peut être entièrement décoché : c'est la
                façon de neutraliser un profil sans le supprimer. Les comptes clients (titulaires et agents consignataires) ne sont pas concernés — leurs
                droits découlent de leur rattachement, pas d'un rôle.
            </p>
        </div>
    );
}

/** Un domaine : son intertitre, puis ses permissions. */
function GroupeLignes({
    groupe,
    roles,
    cochee,
    basculer,
}: {
    groupe: GroupePermissions;
    roles: RoleMatriceRow[];
    cochee: (role: RoleMatriceRow, permission: string) => boolean;
    basculer: (role: RoleMatriceRow, permission: string) => void;
}) {
    return (
        <>
            <tr>
                <td
                    colSpan={roles.length + 1}
                    style={{ padding: '9px 16px 8px', background: '#F5F7FA', borderBottom: '1px solid #E7EBF2', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A6478' }}
                >
                    {groupe.domaine}
                </td>
            </tr>
            {groupe.permissions.map((permission) => (
                <tr key={permission.value}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #E7EBF2', fontSize: 12.5, color: '#1A1F2E' }}>{permission.label}</td>
                    {roles.map((role) => (
                        <td key={role.name} style={{ padding: '10px 12px', borderBottom: '1px solid #E7EBF2', textAlign: 'center' }}>
                            <input
                                type="checkbox"
                                checked={cochee(role, permission.value)}
                                disabled={!role.recomposable}
                                onChange={() => basculer(role, permission.value)}
                                aria-label={`${permission.label} — ${role.name}`}
                                title={role.recomposable ? undefined : 'Ce rôle porte le catalogue complet par définition.'}
                                style={{ width: 16, height: 16, accentColor: '#1D3E9C', cursor: role.recomposable ? 'pointer' : 'not-allowed' }}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

const CadenasIcon = () => (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ flex: 'none', opacity: 0.85 }}>
        <rect x="3" y="6.2" width="8" height="5.6" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.9 6.2V4.7a2.1 2.1 0 0 1 4.2 0v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);
