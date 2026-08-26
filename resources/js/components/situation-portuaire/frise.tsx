import type { StatutRef } from './types';

/*
 * La frise d'escale : les six jalons d'un passage de navire, dans l'ordre où on
 * les franchit, avec le jalon qui ouvre le verrou de transmission marqué en
 * vert (ADR-0009).
 *
 * Elle ne décore pas — elle dit d'un coup d'œil si les dossiers rattachés à
 * cette escale peuvent partir. D'où la légende sous la frise, qui nomme le
 * jalon manquant plutôt que de laisser deviner.
 */

type FriseProps = {
    /** Les six jalons, dans l'ordre du serveur. */
    statuts: StatutRef[];
    /** Le jalon atteint. */
    statut: string;
    /** Celui qui ouvre le verrou pour le sens de cette ligne. */
    jalon: string;
    /** Le verrou est-il réellement ouvert ? Jalon franchi, date posée, ligne publiée. */
    ouvert: boolean;
    /** Libellé du sens, pour la légende (« Dossiers import transmissibles »). */
    sensLabel: string;
    /** Ce qui manque, quand le verrou est fermé alors que le jalon est franchi. */
    raisonFermeture: string | null;
};

export default function Frise({
    statuts,
    statut,
    jalon,
    ouvert,
    sensLabel,
    raisonFermeture,
}: FriseProps) {
    const courant = statuts.findIndex((s) => s.value === statut);
    const indexJalon = statuts.findIndex((s) => s.value === jalon);
    const jalonAtteint = courant >= indexJalon;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {statuts.map((s, i) => {
                    const passe = i < courant;
                    const actuel = i === courant;
                    const atteint = i <= courant;
                    // La pastille verte n'est pas « le dernier jalon » mais
                    // « celui qui déverrouille », et seulement une fois franchi.
                    const deverrouille = i === indexJalon && atteint;
                    const taille = actuel ? 18 : 15;

                    let fond = '#fff';
                    let bord = '#C6CDD9';
                    let encre = '#B4BCC9';

                    if (deverrouille) {
                        fond = '#2F9E2F';
                        bord = '#2F9E2F';
                        encre = '#fff';
                    } else if (actuel) {
                        fond = '#1D3E9C';
                        bord = '#1D3E9C';
                        encre = '#fff';
                    } else if (passe) {
                        fond = '#C6CDD9';
                        bord = '#C6CDD9';
                        encre = '#fff';
                    }

                    const halo =
                        deverrouille && actuel
                            ? '0 0 0 3px rgba(47,158,47,.20)'
                            : actuel
                              ? '0 0 0 3px rgba(29,62,156,.15)'
                              : 'none';

                    return (
                        <div
                            key={s.value}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}
                        >
                            {i > 0 ? (
                                <div
                                    style={{
                                        width: 8,
                                        height: 2,
                                        background: atteint
                                            ? '#B9C6ED'
                                            : '#E2E7F0',
                                        flex: 'none',
                                        alignSelf: 'flex-start',
                                        marginTop: taille / 2 - 1,
                                    }}
                                />
                            ) : null}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2,
                                    width: 46,
                                }}
                            >
                                <div
                                    title={s.label}
                                    style={{
                                        width: taille,
                                        height: taille,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        flex: 'none',
                                        background: fond,
                                        color: encre,
                                        border: `2px solid ${bord}`,
                                        boxShadow: halo,
                                    }}
                                >
                                    {deverrouille ? '✓' : ''}
                                </div>
                                <span
                                    style={{
                                        fontSize: 8.5,
                                        fontWeight: actuel ? 700 : 600,
                                        color: deverrouille
                                            ? '#21771F'
                                            : actuel
                                              ? '#1D3E9C'
                                              : passe
                                                ? '#98A2B4'
                                                : '#B4BCC9',
                                        textAlign: 'center',
                                        lineHeight: 1.15,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {s.abrege}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div
                style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: ouvert
                        ? '#21771F'
                        : jalonAtteint
                          ? '#B26200'
                          : '#98A2B4',
                    marginTop: 5,
                    whiteSpace: 'nowrap',
                }}
            >
                {ouvert
                    ? `Dossiers ${sensLabel.toLowerCase()} transmissibles`
                    : (raisonFermeture ??
                      `Transmission verrouillée — jalon « ${statuts[indexJalon]?.label ?? ''} »`)}
            </div>
        </>
    );
}
