import { router, useForm } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useRef, useState } from 'react';
import type { ManifesteTableau } from './types';
import { formatOctets } from './types';

/*
 * Le bandeau d'actions du manifeste (WF4).
 *
 * Trois choses y vivent, dans l'ordre où le consignataire les rencontre : la
 * **pièce probante**, la **reprise à zéro**, et la **transmission au CGC**.
 *
 * La pièce n'est pas un agrément : elle vaut preuve de ce qui a été déclaré, et
 * l'agent CGC rejouera le dépouillement dessus, ligne par ligne (WF5). En
 * saisie manuelle c'est le PDF recopié ; à l'import, le XML déposé joue le même
 * rôle — et ne se retire donc pas, puisqu'il EST ce qui a produit le tableau.
 *
 * La transmission est **sans retour**. Elle affiche ses obstacles en clair
 * plutôt qu'un bouton grisé muet : trois d'entre eux se lèvent par le
 * consignataire, le quatrième ne dépend pas de lui — la situation portuaire
 * doit avoir constaté le jalon de son sens (ADR-0009).
 */

type ActionsProps = {
    manifeste: ManifesteTableau;
    /** L'URL de l'écran du manifeste, racine des dépôts. */
    url: string;
    /** Le consignataire déclare ; l'interne CGC lit sans écrire (ADR-0007). */
    peutDeclarer: boolean;
    /** Ouvrir la saisie d'un connaissement — mode manuel seulement. */
    onDeclarer: () => void;
};

const BANDEAU: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px 12px',
    padding: '10px 18px',
    borderBottom: '1px solid #E7EBF2',
    background: '#FBFCFE',
    flex: 'none',
};

const LIEN: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#1D3E9C',
    textDecoration: 'none',
};

const BOUTON_CLAIR: CSSProperties = {
    height: 32,
    padding: '0 13px',
    border: '1px solid #C3D0F0',
    borderRadius: 6,
    background: '#F4F7FE',
    color: '#1D3E9C',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
};

const BOUTON_ROUGE: CSSProperties = {
    height: 32,
    padding: '0 13px',
    border: '1px solid #E4C4C1',
    borderRadius: 6,
    background: '#FDF0EF',
    color: '#B3261E',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
};

const BOUTON_PLEIN = (actif: boolean): CSSProperties => ({
    height: 32,
    padding: '0 16px',
    border: 'none',
    borderRadius: 6,
    background: actif ? '#1D3E9C' : '#E4E8F0',
    color: actif ? '#FFFFFF' : '#98A2B4',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: actif ? 'pointer' : 'not-allowed',
});

/** L'état de la pièce probante : présente, ou manquante et bloquante. */
function Piece({ manifeste }: { manifeste: ManifesteTableau }) {
    if (manifeste.pieceJointe === null) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#B26200',
                }}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M8 1.8l6.4 11.4H1.6L8 1.8z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M8 6.4v3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <circle cx="8" cy="11.4" r=".9" fill="currentColor" />
                </svg>
                Manifeste justificatif manquant
            </span>
        );
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: '#3A4356',
                minWidth: 0,
            }}
        >
            <svg
                width="13"
                height="15"
                viewBox="0 0 14 16"
                fill="none"
                aria-hidden="true"
                style={{ flex: 'none' }}
            >
                <path
                    d="M2 .8h6l4 4V15.2H2V.8z"
                    stroke="#1D3E9C"
                    strokeWidth="1.3"
                    fill="#fff"
                />
                <path d="M8 .8v4h4" stroke="#1D3E9C" strokeWidth="1.3" />
            </svg>
            <span
                title={manifeste.pieceJointe}
                style={{
                    maxWidth: 240,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 700,
                }}
            >
                {manifeste.pieceJointe}
            </span>
            <span style={{ color: '#8A93A6', flex: 'none' }}>
                {formatOctets(manifeste.pieceJointeOctets)}
            </span>
        </span>
    );
}

export default function ManifesteActions({
    manifeste,
    url,
    peutDeclarer,
    onDeclarer,
}: ActionsProps) {
    const fichier = useRef<HTMLInputElement>(null);
    const [confirme, setConfirme] = useState<
        'transmettre' | 'reprendre' | null
    >(null);

    const piece = useForm<{ fichier: File | null }>({ fichier: null });
    const transmission = useForm({});

    const manuel = manifeste.modeSaisie === 'manuel';
    const ouvert = manifeste.modifiable && peutDeclarer;
    const libre = manifeste.obstacles.length === 0;

    const deposer = (choisi: File | null) => {
        if (choisi === null) {
            return;
        }

        piece.setData('fichier', choisi);
        piece.transform(() => ({ fichier: choisi }));
        piece.post(`${url}/piece`, {
            preserveScroll: true,
            onFinish: () => {
                if (fichier.current) {
                    fichier.current.value = '';
                }
            },
        });
    };

    return (
        <>
            <div style={BANDEAU}>
                {manuel && ouvert ? (
                    <button
                        type="button"
                        onClick={onDeclarer}
                        style={{ ...BOUTON_CLAIR, fontWeight: 800 }}
                    >
                        + Déclarer un connaissement
                    </button>
                ) : null}

                <Piece manifeste={manifeste} />

                {manifeste.pieceJointe !== null ? (
                    <a href={`${url}/piece`} style={LIEN}>
                        Télécharger
                    </a>
                ) : null}

                {ouvert && manuel ? (
                    <>
                        <input
                            ref={fichier}
                            type="file"
                            accept=".pdf,application/pdf"
                            hidden
                            onChange={(e) =>
                                deposer(e.target.files?.[0] ?? null)
                            }
                        />
                        <button
                            type="button"
                            onClick={() => fichier.current?.click()}
                            disabled={piece.processing}
                            style={BOUTON_CLAIR}
                        >
                            {piece.processing
                                ? 'Dépôt en cours…'
                                : manifeste.pieceJointe === null
                                  ? 'Joindre le PDF'
                                  : 'Remplacer'}
                        </button>
                        {manifeste.pieceJointe !== null &&
                        manifeste.pieceRetirable ? (
                            <button
                                type="button"
                                onClick={() =>
                                    router.delete(`${url}/piece`, {
                                        preserveScroll: true,
                                    })
                                }
                                style={BOUTON_ROUGE}
                            >
                                Retirer
                            </button>
                        ) : null}
                    </>
                ) : null}

                <div style={{ flex: 1 }} />

                {ouvert ? (
                    confirme === 'reprendre' ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 12,
                                color: '#B3261E',
                                fontWeight: 700,
                            }}
                        >
                            Tout effacer et redéposer&nbsp;?
                            <button
                                type="button"
                                onClick={() =>
                                    router.delete(url, {
                                        preserveScroll: true,
                                    })
                                }
                                style={BOUTON_ROUGE}
                            >
                                Confirmer
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirme(null)}
                                style={BOUTON_CLAIR}
                            >
                                Annuler
                            </button>
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirme('reprendre')}
                            title="Effacer ce manifeste et en redéposer un — le numéro du dossier, lui, ne change plus"
                            style={{
                                ...BOUTON_CLAIR,
                                color: '#5A6478',
                                borderColor: '#D8DEE9',
                                background: '#fff',
                            }}
                        >
                            Reprendre à zéro
                        </button>
                    )
                ) : null}

                {ouvert ? (
                    confirme === 'transmettre' ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 12,
                                color: '#3A4356',
                                fontWeight: 700,
                            }}
                        >
                            Transmettre définitivement&nbsp;?
                            <button
                                type="button"
                                disabled={transmission.processing}
                                onClick={() =>
                                    transmission.post(`${url}/transmission`, {
                                        preserveScroll: true,
                                        onFinish: () => setConfirme(null),
                                    })
                                }
                                style={BOUTON_PLEIN(!transmission.processing)}
                            >
                                Confirmer
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirme(null)}
                                style={BOUTON_CLAIR}
                            >
                                Annuler
                            </button>
                        </span>
                    ) : (
                        <button
                            type="button"
                            disabled={!libre}
                            onClick={() => setConfirme('transmettre')}
                            title={
                                libre
                                    ? 'Le manifeste part au CGC — geste sans retour'
                                    : manifeste.obstacles.join(' ')
                            }
                            style={BOUTON_PLEIN(libre)}
                        >
                            Transmettre au CGC
                        </button>
                    )
                ) : null}
            </div>

            {/* Ce qui bloque encore, dit en clair. Un bouton grisé n'apprend
            rien ; la liste des motifs, si — et l'un d'eux ne dépend pas du
            consignataire. */}
            {ouvert && !libre ? (
                <div
                    style={{
                        display: 'flex',
                        gap: 9,
                        alignItems: 'flex-start',
                        padding: '9px 18px',
                        borderBottom: '1px solid #F0CFA0',
                        background: '#FDF1E3',
                        flex: 'none',
                    }}
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                        style={{ flex: 'none', marginTop: 1 }}
                    >
                        <rect
                            x="3"
                            y="7"
                            width="10"
                            height="7"
                            rx="1.2"
                            stroke="#B26200"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"
                            stroke="#B26200"
                            strokeWidth="1.4"
                        />
                    </svg>
                    <span
                        style={{
                            fontSize: 12,
                            color: '#B26200',
                            lineHeight: 1.55,
                        }}
                    >
                        <strong>
                            Transmission en attente&nbsp;:{' '}
                            {manifeste.obstacles.length}
                            {manifeste.obstacles.length > 1
                                ? ' motifs'
                                : ' motif'}
                        </strong>{' '}
                        — {manifeste.obstacles.join(' ')}
                    </span>
                </div>
            ) : null}
        </>
    );
}
