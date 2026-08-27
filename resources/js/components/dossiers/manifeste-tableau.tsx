import { router } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';
import type { LigneManifeste, ManifesteTableau, TypeRef } from './types';
import { accorde, formatFCFA, formatNombre, formatTonnes } from './types';

/*
 * Le tableau de dépouillement du manifeste (WF4).
 *
 * Il est à plat : une ligne par conteneur, plus une ligne pour la part hors
 * conteneur d'un connaissement. C'est un choix assumé — l'opérateur voit tout
 * d'un coup plutôt que de déplier BL après BL.
 *
 * Mais la facturation, elle, n'a pas cette maille : poids et volume
 * appartiennent au BL, le forfait à la boîte. D'où deux choses qui surprennent
 * à la lecture et qui sont pourtant justes : **la case poids reste vide sur les
 * lignes suivantes d'un même connaissement**, et le pied de tableau ne
 * totalise le tonnage qu'une fois par BL. Les remplir partout ferait tripler le
 * tonnage d'un BL à trois boîtes.
 *
 * Le seul geste qui part d'ici est la qualification — dire ce qu'une ligne est,
 * donc ce qu'elle coûte. Le montant n'est jamais saisi : il se recalcule depuis
 * le barème en vigueur à chaque lecture.
 *
 * @see docs/MANIFESTE-XML.md §Maille d'affichage vs maille de facturation
 */

type ManifesteTableauProps = {
    manifeste: ManifesteTableau;
    /** La nomenclature, déjà bornée au sens du dossier. */
    types: TypeRef[];
    /** Le consignataire déclare ; l'interne CGC lit sans écrire (ADR-0007). */
    peutQualifier: boolean;
    /** L'URL de l'écran, sur laquelle repartent filtres et pagination. */
    url: string;
    /**
     * Ouvrir un connaissement en correction — nul hors saisie manuelle : une
     * ligne importée se corrige en redéposant le fichier, pas à la main.
     */
    onCorriger?: (blId: number) => void;
};

/** Le temps de finir de taper avant que la requête ne parte. */
const DELAI_RECHERCHE = 350;

const BORDURE = '1px solid #E7EBF2';

/** La pastille du filtre qui ne désigne pas un type, mais son absence. */
const A_QUALIFIER = 'a-qualifier';

const styleEnTete = (
    largeur: number | null,
    alignement: 'left' | 'center' | 'right' = 'left',
): CSSProperties => ({
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: '#1D3E9C',
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    textAlign: alignement,
    padding: '9px 12px',
    borderBottom: '2px solid #142C73',
    ...(largeur === null ? {} : { width: largeur }),
});

const cellule: CSSProperties = {
    padding: '7px 12px',
    borderBottom: BORDURE,
    fontSize: 12.5,
    color: '#3A4356',
};

const tronque: CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const nombre: CSSProperties = {
    ...cellule,
    fontSize: 13,
    color: '#1A1F2E',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
};

/** Une case d'assiette vide n'est pas une donnée manquante — c'est la règle. */
function Assiette({ valeur }: { valeur: string | null }) {
    return valeur === null ? (
        <span
            title="Portée par une autre ligne du même connaissement — poids et volume appartiennent au BL, pas à la boîte"
            style={{ color: '#D8DEE9' }}
        >
            ·
        </span>
    ) : (
        <>{valeur}</>
    );
}

/** Le pied de tableau : ce que le manifeste pèse, et ce qu'il doit. */
function Pastille({
    texte,
    titre,
    encre,
    fond,
    bord,
    point,
}: {
    texte: string;
    titre: string;
    encre: string;
    fond: string;
    bord: string;
    point: string;
}) {
    return (
        <span
            title={titre}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                color: encre,
                background: fond,
                border: `1px solid ${bord}`,
                borderRadius: 5,
                padding: '3px 9px',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
            }}
        >
            <span
                style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: point,
                    flex: 'none',
                }}
            />
            {texte}
        </span>
    );
}

export default function ManifesteTableauEcran({
    manifeste,
    types,
    peutQualifier,
    url,
    onCorriger,
}: ManifesteTableauProps) {
    const corrigeable = onCorriger !== undefined && manifeste.modifiable;
    const [recherche, setRecherche] = useState(manifeste.filtres.q);
    const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

    const t = manifeste.totaux;

    /**
     * Filtrer et paginer, c'est naviguer : l'état vit dans l'URL. Une ligne
     * qu'on a cherchée se repartage par son lien.
     */
    const filtrer = (patch: Record<string, string | number>) => {
        const demande: Record<string, string | number> = {
            q: manifeste.filtres.q,
            type: manifeste.filtres.type,
            page: manifeste.page,
            parPage: manifeste.parPage,
            ...patch,
        };

        const parametres: Record<string, string | number> = {};

        for (const [cle, valeur] of Object.entries(demande)) {
            const neutre =
                valeur === '' ||
                valeur === 'all' ||
                (cle === 'page' && valeur === 1) ||
                (cle === 'parPage' && valeur === manifeste.pas[0]);

            if (!neutre) {
                parametres[cle] = valeur;
            }
        }

        router.get(url, parametres, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const chercher = (valeur: string) => {
        setRecherche(valeur);

        if (minuteur.current) {
            clearTimeout(minuteur.current);
        }

        minuteur.current = setTimeout(
            () => filtrer({ q: valeur, page: 1 }),
            DELAI_RECHERCHE,
        );
    };

    /** Qualifier une ligne — le seul geste qui écrit depuis cet écran. */
    const qualifier = (ligne: LigneManifeste, type: string) => {
        router.patch(
            `${url}/qualification`,
            { cle: ligne.cle, type: type === '' ? null : type },
            { preserveState: true, preserveScroll: true },
        );
    };

    const pages = Math.max(1, Math.ceil(manifeste.total / manifeste.parPage));
    const debut =
        manifeste.total === 0
            ? 0
            : (manifeste.page - 1) * manifeste.parPage + 1;
    const fin = Math.min(manifeste.page * manifeste.parPage, manifeste.total);

    return (
        <>
            {/* ══ Barre d'outils ══ */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px 12px',
                    padding: '12px 18px',
                    borderBottom: BORDURE,
                    flex: 'none',
                    background: '#FBFCFE',
                }}
            >
                <div style={{ position: 'relative', flex: 'none' }}>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
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
                        value={recherche}
                        onChange={(e) => chercher(e.target.value)}
                        placeholder="Rechercher BL, conteneur, marchandise, expéditeur…"
                        style={{
                            width: 290,
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
                    value={manifeste.filtres.type}
                    onChange={(e) => filtrer({ type: e.target.value, page: 1 })}
                    style={{
                        height: 34,
                        border: '1px solid #D8DEE9',
                        borderRadius: 6,
                        background: '#fff',
                        padding: '0 12px',
                        fontSize: 13,
                        color: '#1A1F2E',
                        outlineColor: '#1D3E9C',
                        maxWidth: 260,
                    }}
                >
                    <option value="all">Toutes les catégories</option>
                    <option value={A_QUALIFIER}>— À qualifier —</option>
                    {types.map((x) => (
                        <option key={x.value} value={x.value}>
                            {x.label}
                        </option>
                    ))}
                </select>

                <div style={{ flex: 1 }} />

                <span
                    style={{
                        fontSize: 12,
                        color: '#8A93A6',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {manifeste.total === manifeste.totalLignes
                        ? accorde(manifeste.totalLignes, 'ligne')
                        : `${formatNombre(manifeste.total)} / ${accorde(manifeste.totalLignes, 'ligne')}`}
                </span>
            </div>

            {/* ══ Tableau ══ */}
            <div
                style={{
                    flex: '1 1 auto',
                    // Un plancher, faute de quoi les bandeaux du dessus — pièce
                    // probante, motifs de blocage — mangent la zone de lecture
                    // sur un écran court, jusqu'à masquer les lignes.
                    minHeight: 180,
                    overflow: 'auto',
                    position: 'relative',
                }}
            >
                <table
                    style={{
                        width: '100%',
                        minWidth: 1980,
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        tableLayout: 'fixed',
                    }}
                >
                    <thead>
                        <tr>
                            <th
                                style={{
                                    ...styleEnTete(46),
                                    color: '#B9C6ED',
                                    fontWeight: 600,
                                    padding: '9px 10px',
                                }}
                            >
                                #
                            </th>
                            <th style={styleEnTete(104)}>N° BL</th>
                            <th style={styleEnTete(92, 'center')}>Type BL</th>
                            <th style={styleEnTete(120)}>Port chargement</th>
                            <th style={styleEnTete(120)}>Port déchargement</th>
                            <th style={styleEnTete(148)}>Expéditeur</th>
                            <th style={styleEnTete(148)}>Destinataire</th>
                            <th style={styleEnTete(118)}>N° conteneur</th>
                            <th style={styleEnTete(96, 'center')}>Taille TC</th>
                            <th style={styleEnTete(null)}>
                                Désignation marchandise
                            </th>
                            <th style={styleEnTete(92, 'right')}>
                                Poids brut (kg)
                            </th>
                            <th style={styleEnTete(74, 'right')}>
                                Volume (m³)
                            </th>
                            <th style={styleEnTete(78, 'right')}>
                                Colis / unités
                            </th>
                            <th
                                style={{
                                    ...styleEnTete(196),
                                    color: '#EAF4FC',
                                    fontWeight: 800,
                                    borderLeft: '3px solid #7EC8F0',
                                }}
                            >
                                Catégorie CDTS
                            </th>
                            <th
                                style={{
                                    ...styleEnTete(126, 'right'),
                                    padding: '9px 14px',
                                }}
                            >
                                Montant (FCFA)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {manifeste.lignes.map((l, i) => {
                            const aQualifier = l.montant === null;
                            const vrac = l.conteneur === null;

                            return (
                                <tr
                                    key={l.cle}
                                    style={{
                                        background: aQualifier
                                            ? '#FDF6F4'
                                            : i % 2 === 0
                                              ? '#FFFFFF'
                                              : '#FAFBFD',
                                    }}
                                >
                                    <td
                                        style={{
                                            ...cellule,
                                            padding: '7px 6px',
                                            fontSize: 11.5,
                                            color: '#8A93A6',
                                            fontVariantNumeric: 'tabular-nums',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                            }}
                                        >
                                            <span
                                                title={
                                                    aQualifier
                                                        ? 'Ligne à qualifier'
                                                        : 'Ligne qualifiée'
                                                }
                                                style={{
                                                    width: 9,
                                                    height: 9,
                                                    borderRadius: '50%',
                                                    flex: 'none',
                                                    background: aQualifier
                                                        ? '#C0392B'
                                                        : '#2F9E2F',
                                                    boxShadow: `0 0 0 3px ${aQualifier ? 'rgba(192,57,43,.14)' : 'rgba(47,158,47,.14)'}`,
                                                }}
                                            />
                                            <span>{l.numero}</span>
                                        </div>
                                    </td>

                                    <td
                                        title={
                                            corrigeable
                                                ? `Corriger le connaissement ${l.bl}`
                                                : l.bl
                                        }
                                        style={{
                                            ...cellule,
                                            ...tronque,
                                            fontWeight: 600,
                                            color: '#1D3E9C',
                                        }}
                                    >
                                        {corrigeable && onCorriger ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onCorriger(l.blId)
                                                }
                                                style={{
                                                    border: 'none',
                                                    background: 'none',
                                                    padding: 0,
                                                    font: 'inherit',
                                                    color: 'inherit',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: 2,
                                                }}
                                            >
                                                {l.bl}
                                            </button>
                                        ) : (
                                            l.bl
                                        )}
                                    </td>

                                    <td
                                        style={{
                                            ...cellule,
                                            padding: '7px 10px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                fontSize: 10.5,
                                                fontWeight: l.groupage
                                                    ? 700
                                                    : 600,
                                                color: l.groupage
                                                    ? '#14509C'
                                                    : '#5A6478',
                                                background: l.groupage
                                                    ? '#E4F3FC'
                                                    : '#EEF1F7',
                                                border: `1px solid ${l.groupage ? '#B5DFF7' : '#D8DEE9'}`,
                                                borderRadius: 5,
                                                padding: '2px 8px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {l.groupage ? 'Groupage' : 'Simple'}
                                        </span>
                                    </td>

                                    <td
                                        title={`${l.portChargement ?? ''} — ${l.portChargementNom ?? ''}`}
                                        style={cellule}
                                    >
                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#1A1F2E',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {l.portChargement ?? '—'}
                                        </div>
                                        <div
                                            style={{
                                                ...tronque,
                                                fontSize: 11,
                                                color: '#8A93A6',
                                            }}
                                        >
                                            {l.portChargementNom ?? ''}
                                        </div>
                                    </td>

                                    <td
                                        title={`${l.portDechargement ?? ''} — ${l.portDechargementNom ?? ''}`}
                                        style={cellule}
                                    >
                                        <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#1A1F2E',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {l.portDechargement ?? '—'}
                                        </div>
                                        <div
                                            style={{
                                                ...tronque,
                                                fontSize: 11,
                                                color: '#8A93A6',
                                            }}
                                        >
                                            {l.portDechargementNom ?? ''}
                                        </div>
                                    </td>

                                    <td
                                        title={l.expediteur ?? ''}
                                        style={{ ...cellule, ...tronque }}
                                    >
                                        {l.expediteur ?? '—'}
                                    </td>
                                    <td
                                        title={l.destinataire ?? ''}
                                        style={{ ...cellule, ...tronque }}
                                    >
                                        {l.destinataire ?? '—'}
                                    </td>

                                    <td
                                        title={
                                            vrac
                                                ? 'Hors conteneur'
                                                : `Conteneur ${l.conteneur}`
                                        }
                                        style={{
                                            ...cellule,
                                            ...tronque,
                                            fontSize: 12,
                                            color: vrac ? '#B4BCC9' : '#3A4356',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {l.conteneur ?? 'Hors conteneur'}
                                    </td>

                                    <td
                                        style={{
                                            ...cellule,
                                            padding: '7px 8px',
                                            fontSize: 12,
                                            textAlign: 'center',
                                            fontVariantNumeric: 'tabular-nums',
                                            color:
                                                l.taille === null
                                                    ? '#B4BCC9'
                                                    : '#3A4356',
                                        }}
                                    >
                                        {l.taille === null
                                            ? '—'
                                            : `${l.taille}′`}
                                    </td>

                                    <td
                                        title={l.description ?? ''}
                                        style={{
                                            ...cellule,
                                            ...tronque,
                                            fontSize: 13,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {l.description ?? '—'}
                                    </td>

                                    <td style={nombre}>
                                        <Assiette
                                            valeur={
                                                l.poidsKg === null
                                                    ? null
                                                    : formatNombre(l.poidsKg)
                                            }
                                        />
                                    </td>
                                    <td style={nombre}>
                                        <Assiette
                                            valeur={
                                                l.volumeM3 === null
                                                    ? null
                                                    : formatNombre(l.volumeM3)
                                            }
                                        />
                                    </td>
                                    <td style={nombre}>
                                        <Assiette
                                            valeur={
                                                l.colis === null
                                                    ? null
                                                    : formatNombre(l.colis)
                                            }
                                        />
                                    </td>

                                    <td
                                        style={{
                                            ...cellule,
                                            borderLeft: '3px solid #7EC8F0',
                                            background: '#FBFDFF',
                                        }}
                                    >
                                        <select
                                            value={l.type ?? ''}
                                            disabled={
                                                !peutQualifier ||
                                                !manifeste.modifiable
                                            }
                                            onChange={(e) =>
                                                qualifier(l, e.target.value)
                                            }
                                            aria-label={`Catégorie CDTS de la ligne ${l.numero}`}
                                            style={{
                                                width: '100%',
                                                height: 30,
                                                borderRadius: 5,
                                                fontSize: 12.5,
                                                color: manifeste.modifiable
                                                    ? '#1A1F2E'
                                                    : '#5A6478',
                                                border: `1px solid ${aQualifier ? '#DBA49B' : '#D8DEE9'}`,
                                                background:
                                                    !manifeste.modifiable
                                                        ? '#F3F5F9'
                                                        : aQualifier
                                                          ? '#FDF8F6'
                                                          : '#fff',
                                                padding: '0 8px',
                                                cursor:
                                                    peutQualifier &&
                                                    manifeste.modifiable
                                                        ? 'pointer'
                                                        : 'default',
                                            }}
                                        >
                                            <option value="">
                                                — À qualifier —
                                            </option>
                                            {types.map((x) => (
                                                <option
                                                    key={x.value}
                                                    value={x.value}
                                                >
                                                    {x.label}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Qualifiée mais sans montant : le
                                        type ne trouve aucune assiette sur
                                        cette maille. On ne devine pas. */}
                                        {l.type !== null && aQualifier ? (
                                            <div
                                                title="Ce type ne se facture pas sur cette ligne : son assiette appartient au connaissement, pas à la boîte."
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 600,
                                                    color: '#B26200',
                                                    marginTop: 3,
                                                }}
                                            >
                                                Aucune assiette pour ce type
                                            </div>
                                        ) : null}
                                    </td>

                                    <td
                                        style={{
                                            ...nombre,
                                            padding: '7px 14px',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {l.montant === null ? (
                                            <span style={{ color: '#B4BCC9' }}>
                                                —
                                            </span>
                                        ) : (
                                            <>
                                                <div>
                                                    {formatNombre(l.montant)}
                                                </div>
                                                {/* Quand deux unités
                                                s'affrontent, dire laquelle a
                                                gagné : le montant seul n'est
                                                pas opposable. */}
                                                <div
                                                    title={`Article de barème ${l.reference}, ${l.unite}`}
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        color: '#A6AFC0',
                                                        marginTop: 1,
                                                    }}
                                                >
                                                    {l.reference} · {l.unite}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {manifeste.lignes.length === 0 ? (
                    <div
                        style={{
                            padding: '48px 20px',
                            textAlign: 'center',
                            color: '#5A6478',
                            fontSize: 13.5,
                        }}
                    >
                        <div
                            aria-hidden="true"
                            style={{
                                height: 9,
                                width: 150,
                                margin: '0 auto 14px',
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-width='1.4'/%3E%3C/svg%3E\")",
                                backgroundRepeat: 'repeat-x',
                            }}
                        />
                        Aucune expédition ne correspond à ces critères.
                    </div>
                ) : null}
            </div>

            {/* ══ Pied de tableau ══ */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '10px 18px',
                    background: '#142C73',
                    color: '#FFFFFF',
                    borderTop: '2px solid #1D3E9C',
                    flex: 'none',
                    flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        fontSize: 12.5,
                        color: '#C9D4F0',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {accorde(t.lignes, 'ligne')} · {formatNombre(t.bls)} BL ·{' '}
                    {formatNombre(t.conteneurs)} TC · {formatTonnes(t.poidsKg)}{' '}
                    t · {formatNombre(t.volumeM3)} m³
                </span>

                <Pastille
                    texte={accorde(
                        t.qualifiees,
                        'ligne qualifiée',
                        'lignes qualifiées',
                    )}
                    titre="Lignes dont la catégorie CDTS est renseignée et chiffrable"
                    encre="#9FE79F"
                    fond="rgba(47,158,47,.20)"
                    bord="rgba(159,231,159,.40)"
                    point="#2F9E2F"
                />

                {t.aQualifier > 0 ? (
                    <Pastille
                        texte={accorde(
                            t.aQualifier,
                            'ligne à qualifier',
                            'lignes à qualifier',
                        )}
                        titre="Lignes restant à qualifier avant transmission au CGC"
                        encre="#FFB4A8"
                        fond="rgba(192,57,43,.30)"
                        bord="rgba(255,180,168,.45)"
                        point="#E05C4B"
                    />
                ) : null}

                <div style={{ flex: 1 }} />

                <span
                    style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '.09em',
                        color: '#8FA3D9',
                        textTransform: 'uppercase',
                    }}
                >
                    CDTS déclarée
                </span>
                <span
                    style={{
                        fontSize: 20,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '.01em',
                        color: '#FFFFFF',
                    }}
                >
                    {formatFCFA(t.montant)}
                </span>
            </div>

            {/* ══ Pagination ══ */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '9px 18px',
                    borderTop: BORDURE,
                    flex: 'none',
                    background: '#FBFCFE',
                    flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        fontSize: 12,
                        color: '#5A6478',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    Lignes {formatNombre(debut)}–{formatNombre(fin)} sur{' '}
                    {formatNombre(manifeste.total)}
                    {manifeste.total < manifeste.totalLignes
                        ? ` (filtrées sur ${formatNombre(manifeste.totalLignes)})`
                        : ''}
                </span>

                <div style={{ flex: 1 }} />

                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 12,
                        color: '#5A6478',
                    }}
                >
                    Lignes par page
                    <select
                        value={manifeste.parPage}
                        onChange={(e) =>
                            filtrer({
                                parPage: Number(e.target.value),
                                page: 1,
                            })
                        }
                        style={{
                            height: 28,
                            border: '1px solid #D8DEE9',
                            borderRadius: 5,
                            background: '#fff',
                            padding: '0 8px',
                            fontSize: 12,
                            color: '#1A1F2E',
                        }}
                    >
                        {manifeste.pas.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: pages }, (_, i) => i + 1).map((n) => {
                        const courante = n === manifeste.page;

                        return (
                            <button
                                key={n}
                                type="button"
                                onClick={() => filtrer({ page: n })}
                                disabled={courante}
                                style={{
                                    minWidth: 28,
                                    height: 28,
                                    padding: '0 6px',
                                    borderRadius: 5,
                                    fontSize: 12.5,
                                    fontWeight: courante ? 700 : 500,
                                    cursor: courante ? 'default' : 'pointer',
                                    border: `1px solid ${courante ? '#1D3E9C' : '#D8DEE9'}`,
                                    background: courante ? '#1D3E9C' : '#fff',
                                    color: courante ? '#fff' : '#3A4356',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
