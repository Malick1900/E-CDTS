import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Vide } from '@/components/admin/ui';
import type { ProfilFiche } from './types';
import {
    boutonBordure,
    boutonPrincipal,
    boutonSecondaire,
    Carte,
    champInput,
    CheckIcon,
    CrayonIcon,
    RoleBadge,
    Verrou,
} from './ui';

/*
 * « Informations personnelles ».
 *
 * Trois champs se corrigent — nom, prénom, numéro d'appel — et quatre se
 * lisent. Ce partage n'est pas un oubli : le rôle dit ce que le compte a le
 * droit de faire, l'identifiant désigne la personne à qui l'accès a été ouvert,
 * la fonction est celle que sa société a déclarée. Aucun des trois ne se change
 * de son propre chef ; tous les trois s'affichent, parce qu'ils décrivent
 * précisément celui qui les regarde.
 */

type Brouillon = { first_name: string; last_name: string; phone: string };

const Icone = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="6.8" r="3.2" stroke="#1D3E9C" strokeWidth="1.5" />
        <path
            d="M3.8 16.6c0-3.1 2.8-5 6.2-5s6.2 1.9 6.2 5"
            stroke="#1D3E9C"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

function Libelle({ children }: { children: string }) {
    return (
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3A4356' }}>
            {children}
        </span>
    );
}

function Valeur({ children }: { children: React.ReactNode }) {
    return (
        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1F2E' }}>
            {children}
        </span>
    );
}

function Erreur({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <span style={{ fontSize: 11.5, color: '#C0392B' }}>{message}</span>;
}

export default function Informations({ profil }: { profil: ProfilFiche }) {
    const [edition, setEdition] = useState(false);
    const [enCours, setEnCours] = useState(false);
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [brouillon, setBrouillon] = useState<Brouillon>({
        first_name: '',
        last_name: '',
        phone: '',
    });

    const ouvrir = () => {
        setBrouillon({
            first_name: profil.first_name ?? '',
            last_name: profil.last_name ?? '',
            phone: profil.phone ?? '',
        });
        setErreurs({});
        setEdition(true);
    };

    const champ = (cle: keyof Brouillon, valeur: string) =>
        setBrouillon((precedent) => ({ ...precedent, [cle]: valeur }));

    const complet =
        brouillon.first_name.trim() !== '' &&
        brouillon.last_name.trim() !== '' &&
        brouillon.phone.trim() !== '';

    const enregistrer = () => {
        if (!complet || enCours) {
            return;
        }

        router.patch('/profil', brouillon, {
            preserveScroll: true,
            onStart: () => setEnCours(true),
            onFinish: () => setEnCours(false),
            onSuccess: () => {
                setEdition(false);
                setErreurs({});
            },
            onError: (e: Record<string, string>) => setErreurs(e),
        });
    };

    const saisie = (cle: keyof Brouillon, libelle: string, type = 'text') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Libelle>{libelle}</Libelle>
            {edition ? (
                <>
                    <input
                        type={type}
                        value={brouillon[cle]}
                        onChange={(e) => champ(cle, e.target.value)}
                        aria-label={libelle}
                        style={champInput(Boolean(erreurs[cle]))}
                    />
                    <Erreur message={erreurs[cle]} />
                </>
            ) : (
                <Valeur>
                    {(cle === 'first_name'
                        ? profil.first_name
                        : cle === 'last_name'
                          ? profil.last_name
                          : profil.phone) ?? <Vide />}
                </Valeur>
            )}
        </div>
    );

    return (
        <Carte
            icone={<Icone />}
            titre="Informations personnelles"
            aside={
                edition ? null : (
                    <button
                        type="button"
                        onClick={ouvrir}
                        style={boutonBordure}
                    >
                        <CrayonIcon />
                        Modifier
                    </button>
                )
            }
            pied={
                edition ? (
                    <>
                        <span
                            style={{
                                fontSize: 11.5,
                                color: '#8A93A6',
                                flex: 1,
                            }}
                        >
                            Le rôle, l’identifiant de connexion et la fonction
                            sont tenus par le CGC.
                        </span>
                        <button
                            type="button"
                            onClick={() => setEdition(false)}
                            style={boutonSecondaire}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={enregistrer}
                            disabled={!complet || enCours}
                            style={boutonPrincipal(complet && !enCours)}
                        >
                            <CheckIcon />
                            Enregistrer
                        </button>
                    </>
                ) : null
            }
        >
            <div style={{ padding: 18 }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                    }}
                >
                    {saisie('last_name', 'Nom')}
                    {saisie('first_name', 'Prénom')}
                    {saisie('phone', 'Numéro de téléphone', 'tel')}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        <Libelle>Fonction</Libelle>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                minHeight: 24,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Valeur>{profil.job_title ?? <Vide />}</Valeur>
                            <Verrou>Déclarée à l’ouverture du compte</Verrou>
                        </div>
                    </div>
                </div>

                {/* Ce que le compte ne s'attribue pas lui-même. Regroupé, et
                    non dispersé : la raison est la même pour les deux. */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                        marginTop: 18,
                        paddingTop: 16,
                        borderTop: '1px solid #EEF1F7',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        <Libelle>Rôle</Libelle>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                minHeight: 24,
                                flexWrap: 'wrap',
                            }}
                        >
                            <RoleBadge
                                role={profil.role}
                                client={profil.client}
                            />
                            <Verrou>Attribué par le CGC</Verrou>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        <Libelle>Identifiant de connexion</Libelle>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                minHeight: 24,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Valeur>{profil.email}</Valeur>
                            <Verrou>
                                Non modifiable — adressez-vous au CGC
                            </Verrou>
                        </div>
                    </div>
                </div>
            </div>
        </Carte>
    );
}
