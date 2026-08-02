import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { CriteresMotDePasse, ProfilFiche } from './types';
import {
    Alerte,
    boutonBordure,
    boutonPrincipal,
    boutonSecondaire,
    Carte,
    champInput,
    CheckIcon,
    CrayonIcon,
} from './ui';

/*
 * « Mot de passe ».
 *
 * Le mot de passe actuel est exigé bien que la session soit déjà ouverte : une
 * session laissée sans surveillance ne doit pas suffire à s'emparer du compte.
 *
 * Les exigences affichées viennent du serveur (`criteres`) et se cochent au fil
 * de la saisie. Elles ne sont pas recopiées ici — annoncer une règle et en
 * appliquer une autre laisserait la personne devant un refus qu'elle ne peut
 * pas comprendre.
 */

const dateSeule = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const Icone = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
        <rect
            x="4.2"
            y="8.6"
            width="11.6"
            height="7.6"
            rx="1.7"
            stroke="#142C73"
            strokeWidth="1.5"
        />
        <path
            d="M6.9 8.6V6.3a3.1 3.1 0 0 1 6.2 0v2.3"
            stroke="#142C73"
            strokeWidth="1.5"
        />
    </svg>
);

const OeilIcon = ({ barre }: { barre: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path
            d="M2 10s3-5.2 8-5.2S18 10 18 10s-3 5.2-8 5.2S2 10 2 10z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
        <circle
            cx="10"
            cy="10"
            r="2.3"
            stroke="currentColor"
            strokeWidth="1.5"
        />
        {barre ? (
            <path
                d="M3.5 16.5l13-13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        ) : null}
    </svg>
);

type Regle = { cle: string; libelle: string; satisfaite: boolean };

/** Les exigences du serveur, traduites en contrôles que l'écran sait refaire. */
function regles(criteres: CriteresMotDePasse, saisi: string): Regle[] {
    const liste: Regle[] = [
        {
            cle: 'longueur',
            libelle: `Au moins ${criteres.longueur} caractères`,
            satisfaite: saisi.length >= criteres.longueur,
        },
    ];

    if (criteres.casse) {
        liste.push({
            cle: 'casse',
            libelle: 'Une majuscule et une minuscule',
            satisfaite: /[a-z]/.test(saisi) && /[A-Z]/.test(saisi),
        });
    }

    if (criteres.chiffres) {
        liste.push({
            cle: 'chiffres',
            libelle: 'Au moins un chiffre',
            satisfaite: /[0-9]/.test(saisi),
        });
    }

    if (criteres.symboles) {
        liste.push({
            cle: 'symboles',
            libelle: 'Au moins un caractère spécial',
            satisfaite: /[^\p{L}\p{N}]/u.test(saisi),
        });
    }

    return liste;
}

function phrase(criteres: CriteresMotDePasse): string {
    const exigences: string[] = [];

    if (criteres.casse) {
        exigences.push('une majuscule et une minuscule');
    }

    if (criteres.chiffres) {
        exigences.push('un chiffre');
    }

    if (criteres.symboles) {
        exigences.push('un caractère spécial');
    }

    const debut = `Choisissez un mot de passe d’au moins ${criteres.longueur} caractères`;

    return exigences.length === 0
        ? `${debut}.`
        : `${debut}, comportant ${exigences.join(', ')}.`;
}

export default function MotDePasse({
    profil,
    criteres,
}: {
    profil: ProfilFiche;
    criteres: CriteresMotDePasse;
}) {
    const [ouvert, setOuvert] = useState(false);
    const [enCours, setEnCours] = useState(false);
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [actuel, setActuel] = useState('');
    const [nouveau, setNouveau] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [visible, setVisible] = useState(false);

    const controles = useMemo(
        () => regles(criteres, nouveau),
        [criteres, nouveau],
    );

    const satisfaites = controles.filter((r) => r.satisfaite).length;
    const conforme = satisfaites === controles.length;
    const discordance = confirmation.length > 0 && confirmation !== nouveau;

    const valide =
        actuel.length > 0 &&
        conforme &&
        nouveau === confirmation &&
        nouveau !== actuel;

    const fermer = () => {
        setOuvert(false);
        setActuel('');
        setNouveau('');
        setConfirmation('');
        setErreurs({});
        setVisible(false);
    };

    const enregistrer = () => {
        if (!valide || enCours) {
            return;
        }

        router.put(
            '/profil/mot-de-passe',
            {
                current_password: actuel,
                password: nouveau,
                password_confirmation: confirmation,
            },
            {
                preserveScroll: true,
                onStart: () => setEnCours(true),
                onFinish: () => setEnCours(false),
                onSuccess: () => fermer(),
                onError: (e: Record<string, string>) => setErreurs(e),
            },
        );
    };

    const modifieLe = profil.mot_de_passe_modifie_le
        ? `Modifié le ${dateSeule.format(new Date(profil.mot_de_passe_modifie_le))}`
        : 'Jamais modifié depuis l’ouverture du compte';

    // Trois barres quel que soit le nombre d'exigences : c'est une jauge, pas
    // un décompte.
    const rang = conforme ? 3 : satisfaites / controles.length >= 0.5 ? 2 : 1;
    const teinte = rang === 3 ? '#2F9E2F' : rang === 2 ? '#E07B00' : '#C0392B';

    const messageServeur = erreurs.current_password ?? erreurs.password;

    return (
        <Carte
            icone={<Icone />}
            titre="Mot de passe"
            aside={
                <span style={{ fontSize: 11.5, color: '#8A93A6' }}>
                    {modifieLe}
                </span>
            }
        >
            {ouvert ? (
                <div style={{ padding: '16px 18px 18px' }}>
                    {messageServeur ? <Alerte>{messageServeur}</Alerte> : null}

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 14,
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 7,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#3A4356',
                                gridColumn: '1 / -1',
                                maxWidth: 'calc(50% - 7px)',
                            }}
                        >
                            Mot de passe actuel
                            <input
                                type="password"
                                value={actuel}
                                onChange={(e) => {
                                    setActuel(e.target.value);
                                    setErreurs({});
                                }}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                style={champInput(
                                    Boolean(erreurs.current_password),
                                )}
                            />
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 7,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#3A4356',
                            }}
                        >
                            Nouveau mot de passe
                            <span
                                style={{
                                    position: 'relative',
                                    display: 'block',
                                }}
                            >
                                <input
                                    type={visible ? 'text' : 'password'}
                                    value={nouveau}
                                    onChange={(e) => {
                                        setNouveau(e.target.value);
                                        setErreurs({});
                                    }}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    style={{
                                        ...champInput(
                                            Boolean(erreurs.password),
                                        ),
                                        padding: '0 42px 0 12px',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVisible((v) => !v)}
                                    aria-label={
                                        visible
                                            ? 'Masquer le mot de passe'
                                            : 'Afficher le mot de passe'
                                    }
                                    style={{
                                        position: 'absolute',
                                        right: 6,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 32,
                                        height: 32,
                                        border: 'none',
                                        borderRadius: 7,
                                        background: 'transparent',
                                        color: '#8A93A6',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <OeilIcon barre={visible} />
                                </button>
                            </span>
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 7,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#3A4356',
                            }}
                        >
                            Confirmer le nouveau mot de passe
                            <input
                                type={visible ? 'text' : 'password'}
                                value={confirmation}
                                onChange={(e) =>
                                    setConfirmation(e.target.value)
                                }
                                autoComplete="new-password"
                                placeholder="••••••••"
                                style={champInput(discordance)}
                            />
                        </label>
                    </div>

                    {nouveau.length > 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginTop: 13,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 4,
                                    flex: 'none',
                                }}
                            >
                                {[1, 2, 3].map((barre) => (
                                    <span
                                        key={barre}
                                        style={{
                                            width: 34,
                                            height: 5,
                                            borderRadius: 3,
                                            display: 'inline-block',
                                            background:
                                                rang >= barre
                                                    ? teinte
                                                    : '#E2E7F0',
                                        }}
                                    />
                                ))}
                            </div>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: teinte,
                                }}
                            >
                                {rang === 3
                                    ? 'Mot de passe conforme'
                                    : rang === 2
                                      ? 'Presque — il manque une exigence'
                                      : 'Mot de passe insuffisant'}
                            </span>
                        </div>
                    ) : null}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            marginTop: 14,
                            padding: '12px 14px',
                            background: '#F5F7FA',
                            border: '1px solid #E4E8F0',
                            borderRadius: 9,
                        }}
                    >
                        {controles.map((regle) => (
                            <div
                                key={regle.cle}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <span
                                    aria-hidden
                                    style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: 'none',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: '#fff',
                                        background: regle.satisfaite
                                            ? '#2F9E2F'
                                            : '#C6CDD9',
                                    }}
                                >
                                    {regle.satisfaite ? '✓' : '·'}
                                </span>
                                <span
                                    style={{
                                        fontSize: 12.5,
                                        color: regle.satisfaite
                                            ? '#21771F'
                                            : '#5A6478',
                                        fontWeight: regle.satisfaite
                                            ? 600
                                            : 400,
                                    }}
                                >
                                    {regle.libelle}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 11,
                            marginTop: 16,
                            paddingTop: 14,
                            borderTop: '1px solid #EEF1F7',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11.5,
                                color: '#8A93A6',
                                flex: 1,
                            }}
                        >
                            {discordance
                                ? 'La confirmation ne correspond pas au nouveau mot de passe.'
                                : nouveau !== '' && nouveau === actuel
                                  ? 'Le nouveau mot de passe doit différer de l’actuel.'
                                  : 'Vous resterez connecté sur cet appareil.'}
                        </span>
                        <button
                            type="button"
                            onClick={fermer}
                            style={boutonSecondaire}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={enregistrer}
                            disabled={!valide || enCours}
                            style={boutonPrincipal(valide && !enCours)}
                        >
                            <CheckIcon />
                            Enregistrer le mot de passe
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        padding: '16px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'wrap',
                    }}
                >
                    <span
                        style={{
                            fontSize: 13,
                            color: '#5A6478',
                            lineHeight: 1.5,
                            flex: 1,
                            minWidth: 280,
                        }}
                    >
                        {phrase(criteres)} Il vous sera demandé de saisir
                        d’abord le mot de passe actuel.
                    </span>
                    <button
                        type="button"
                        onClick={() => setOuvert(true)}
                        style={{ ...boutonBordure, height: 38, flex: 'none' }}
                    >
                        <CrayonIcon />
                        Modifier le mot de passe
                    </button>
                </div>
            )}
        </Carte>
    );
}
