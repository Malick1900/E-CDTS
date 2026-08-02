import { initials } from '@/components/admin/users/agents-ui';
import type { ProfilFiche } from './types';
import { RoleBadge } from './ui';

/*
 * La carte d'identité — l'en-tête de l'écran.
 *
 * Elle tient lieu de bande de titre : la coquille n'en rend pas sur cet écran,
 * puisque c'est ici que le compte se nomme. Y figurent les deux dates que seule
 * la plateforme connaît — l'ouverture du compte et la dernière connexion. La
 * seconde est une information de sécurité : une connexion qu'on ne reconnaît
 * pas se signale, encore faut-il pouvoir la lire.
 */

const dateSeule = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const dateHeure = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function Stat({ libelle, valeur }: { libelle: string; valeur: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.07em',
                    color: '#8A93A6',
                    textTransform: 'uppercase',
                }}
            >
                {libelle}
            </span>
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#3A4356',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {valeur}
            </span>
        </div>
    );
}

export default function Identite({ profil }: { profil: ProfilFiche }) {
    const creeLe = profil.cree_le
        ? dateSeule.format(new Date(profil.cree_le))
        : '—';

    // « Jamais » et non un blanc : sur un compte qui ne s'est jamais connecté,
    // c'est justement l'information qui compte.
    const connexion = profil.derniere_connexion
        ? dateHeure.format(new Date(profil.derniere_connexion))
        : 'Jamais';

    return (
        <section
            style={{
                background: '#fff',
                border: '1px solid #D8DEE9',
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(20,44,115,.06)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    height: 64,
                    background: '#142C73',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -40,
                        right: -30,
                        width: 180,
                        height: 180,
                        borderRadius: '50%',
                        background: '#1B3888',
                        opacity: 0.6,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        inset: 'auto 0 0 0',
                        height: 26,
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='9' viewBox='0 0 72 9'%3E%3Cpath d='M0 4.5 Q9 0.5 18 4.5 T36 4.5 T54 4.5 T72 4.5' fill='none' stroke='%237EC8F0' stroke-opacity='0.4' stroke-width='1.4'/%3E%3C/svg%3E\")",
                        backgroundRepeat: 'repeat-x',
                        backgroundPosition: 'bottom 6px left 0',
                    }}
                />
            </div>

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '0 22px 18px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 18,
                    marginTop: -30,
                    flexWrap: 'wrap',
                }}
            >
                <div
                    style={{
                        width: 78,
                        height: 78,
                        borderRadius: '50%',
                        background: '#1D3E9C',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        fontWeight: 800,
                        flex: 'none',
                        border: '4px solid #fff',
                        boxShadow: '0 2px 8px rgba(20,44,115,.18)',
                    }}
                >
                    {initials(profil.name)}
                </div>

                <div style={{ flex: 1, minWidth: 240, paddingBottom: 3 }}>
                    <h1
                        style={{
                            margin: '34px 0 5px',
                            fontSize: 21,
                            fontWeight: 800,
                            color: '#1A1F2E',
                            letterSpacing: '-.015em',
                        }}
                    >
                        {profil.name}
                    </h1>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            flexWrap: 'wrap',
                        }}
                    >
                        <RoleBadge role={profil.role} client={profil.client} />
                        <span style={{ fontSize: 13, color: '#5A6478' }}>
                            {profil.organisation}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        paddingBottom: 5,
                    }}
                >
                    <Stat libelle="Compte créé le" valeur={creeLe} />
                    <div
                        style={{
                            width: 1,
                            height: 32,
                            background: '#EAEDF3',
                        }}
                    />
                    <Stat libelle="Dernière connexion" valeur={connexion} />
                </div>
            </div>
        </section>
    );
}
