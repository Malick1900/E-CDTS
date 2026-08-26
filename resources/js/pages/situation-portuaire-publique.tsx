import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';
import type {
    MouvementRow,
    PortRef,
    StatutRef,
} from '@/components/situation-portuaire/types';
import {
    formatDate,
    formatDateHeure,
    formatHeure,
} from '@/components/situation-portuaire/types';
import '../../css/ecdts-admin.css';

/*
 * La situation portuaire vue du dehors — sans connexion (ADR-0011).
 *
 * Volontairement dépouillée : c'est un document, pas un écran de travail. Ni
 * frise de verrou (une notion interne au CGC et aux consignataires), ni
 * édition, ni publication — seulement ce que le document papier de la
 * conférence porte déjà, et uniquement des lignes publiées.
 *
 * Elle sert aussi de version imprimable : `?impression=1` déclenche l'impression
 * à l'ouverture, et c'est ce que le CGC transmet à la Capitainerie et à l'OPRAG,
 * qui n'ont pas de compte (ADR-0005).
 */

type Props = {
    ports: PortRef[];
    portCourant: PortRef | null;
    mouvements: Array<
        Omit<
            MouvementRow,
            | 'navireId'
            | 'posteQuaiId'
            | 'consignataireId'
            | 'publiee'
            | 'coherente'
        >
    >;
    statuts: StatutRef[];
    publieeLe: string | null;
};

export default function SituationPortuairePublique({
    ports = [],
    portCourant = null,
    mouvements = [],
    statuts = [],
    publieeLe = null,
}: Props) {
    useEffect(() => {
        if (
            new URLSearchParams(window.location.search).get('impression') ===
            '1'
        ) {
            window.print();
        }
    }, []);

    const libelleStatut = (valeur: string) =>
        statuts.find((s) => s.value === valeur)?.label ?? valeur;

    return (
        <div
            className="ecdts-admin"
            style={{ minHeight: '100vh', background: '#F5F7FA' }}
        >
            <Head title="Situation portuaire" />

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
                    Conseil Gabonais des Chargeurs
                </span>
            </div>

            {/* ══ En-tête du document ══ */}
            <header
                style={{
                    background: '#fff',
                    borderBottom: '1px solid #D8DEE9',
                    padding: '18px 24px 14px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'wrap',
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
                            gap: 3,
                        }}
                    >
                        <h1
                            style={{
                                margin: 0,
                                fontSize: 21,
                                fontWeight: 800,
                                color: '#142C73',
                                letterSpacing: '-.01em',
                                lineHeight: 1.1,
                            }}
                        >
                            Situation portuaire
                            {portCourant ? ` — ${portCourant.label}` : ''}
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 12.5,
                                color: '#5A6478',
                            }}
                        >
                            Mouvements de navires publiés par le Conseil
                            Gabonais des Chargeurs. Document consultable
                            librement.
                        </p>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 6,
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: publieeLe ? '#21771F' : '#5A6478',
                                background: publieeLe ? '#E7F5E7' : '#EEF1F7',
                                border: `1px solid ${publieeLe ? '#BFE4BF' : '#D8DEE9'}`,
                                borderRadius: 5,
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {publieeLe
                                ? `Publiée le ${formatDate(publieeLe)} à ${formatHeure(publieeLe)}`
                                : 'Non encore publiée'}
                        </span>
                        <Link
                            href="/login"
                            className="ea-backlink-clair no-print"
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#1D3E9C',
                                textDecoration: 'none',
                            }}
                        >
                            Accéder à e-CDTS →
                        </Link>
                    </div>
                </div>

                {/* Sélecteur de port : de simples liens, pour rester lisible
                    sans JavaScript et à l'impression. */}
                {ports.length > 1 ? (
                    <div
                        className="no-print"
                        style={{ display: 'flex', gap: 6, marginTop: 14 }}
                    >
                        {ports.map((p) => {
                            const actif = p.code === portCourant?.code;

                            return (
                                <Link
                                    key={p.id}
                                    href={`/situation-portuaire-publique?port=${p.code}`}
                                    className={actif ? undefined : 'ea-chipbtn'}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 7,
                                        border: `1px solid ${actif ? '#1D3E9C' : '#D8DEE9'}`,
                                        background: actif ? '#1D3E9C' : '#fff',
                                        color: actif ? '#fff' : '#3A4356',
                                        fontSize: 12.5,
                                        fontWeight: actif ? 700 : 600,
                                        textDecoration: 'none',
                                    }}
                                >
                                    {p.label}
                                </Link>
                            );
                        })}
                    </div>
                ) : null}
            </header>

            {/* ══ Le document ══ */}
            <main style={{ padding: '18px 24px 30px' }}>
                {mouvements.length === 0 ? (
                    <div
                        style={{
                            background: '#fff',
                            border: '1px solid #D8DEE9',
                            borderRadius: 8,
                            padding: '40px 24px',
                            textAlign: 'center',
                        }}
                    >
                        <h2
                            style={{
                                margin: '0 0 6px',
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#1A1F2E',
                            }}
                        >
                            Aucun mouvement publié
                        </h2>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                color: '#5A6478',
                            }}
                        >
                            {portCourant
                                ? `La situation de ${portCourant.label} n'a pas encore été publiée.`
                                : 'Aucun port à afficher.'}
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            background: '#fff',
                            border: '1px solid #D8DEE9',
                            borderRadius: 8,
                            overflow: 'auto',
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                minWidth: 1100,
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                            }}
                        >
                            <thead>
                                <tr>
                                    {[
                                        'Navire',
                                        'Type',
                                        'Sens',
                                        'Statut',
                                        'Poste à quai',
                                        'ETA',
                                        'ETD',
                                        'N° voyage',
                                        'Consignataire',
                                        'Pavillon',
                                        'Armateur',
                                    ].map((titre) => (
                                        <th
                                            key={titre}
                                            style={{
                                                background: '#1D3E9C',
                                                color: '#fff',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                letterSpacing: '.05em',
                                                textTransform: 'uppercase',
                                                textAlign: 'left',
                                                padding: '9px 12px',
                                                borderBottom:
                                                    '2px solid #142C73',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {titre}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {mouvements.map((m, i) => (
                                    <tr
                                        key={m.id}
                                        style={{
                                            background:
                                                i % 2 === 0
                                                    ? '#fff'
                                                    : '#FAFBFD',
                                        }}
                                    >
                                        <td
                                            style={{
                                                ...cellule,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {m.navire}
                                        </td>
                                        <td
                                            style={cellule}
                                            title={m.typeLabel ?? undefined}
                                        >
                                            {m.typeCode ?? '—'}
                                        </td>
                                        <td style={cellule}>
                                            {m.sens === 'import'
                                                ? 'Import'
                                                : 'Export'}
                                        </td>
                                        <td
                                            style={{
                                                ...cellule,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {libelleStatut(m.statut)}
                                        </td>
                                        <td style={cellule}>
                                            {m.poste ?? '—'}
                                        </td>
                                        <td style={celluleChiffre}>
                                            {formatDateHeure(m.eta)}
                                        </td>
                                        <td style={celluleChiffre}>
                                            {formatDateHeure(m.etd)}
                                        </td>
                                        <td style={celluleChiffre}>
                                            {m.voyage}
                                        </td>
                                        <td style={cellule}>
                                            {m.consignataire ?? '—'}
                                        </td>
                                        <td style={cellule}>
                                            {m.pavillon ?? '—'}
                                        </td>
                                        <td style={cellule}>
                                            {m.armateur ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p
                    style={{
                        margin: '14px 2px 0',
                        fontSize: 11.5,
                        color: '#8A93A6',
                        lineHeight: 1.5,
                    }}
                >
                    {mouvements.length} navire{mouvements.length > 1 ? 's' : ''}
                    {portCourant ? ` · ${portCourant.label}` : ''} · Document
                    publié par le Conseil Gabonais des Chargeurs. Seules les
                    lignes validées y figurent.
                </p>
            </main>
        </div>
    );
}

const cellule = {
    padding: '9px 12px',
    borderBottom: '1px solid #E7EBF2',
    fontSize: 12.5,
    color: '#3A4356',
    whiteSpace: 'nowrap' as const,
} as const;

const celluleChiffre = {
    ...cellule,
    fontVariantNumeric: 'tabular-nums' as const,
    color: '#1A1F2E',
} as const;
