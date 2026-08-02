import { AgentArmBadges } from '@/components/admin/users/agents-ui';
import type { ProfilFiche } from './types';
import { Carte, Verrou } from './ui';

/*
 * « Ce sur quoi je peux déclarer » — la portée d'un compte client (ADR-0009).
 *
 * Absente de la maquette, et pourtant nécessaire : l'affectation des armements
 * appartient au titulaire de la société, et un agent n'a aujourd'hui aucun
 * écran où la lire. Sans cela, il découvre son propre périmètre au moment où
 * une déclaration lui est refusée. Une plateforme d'État n'a pas à laisser
 * quelqu'un deviner l'étendue de ce qu'on lui a confié.
 *
 * En lecture, comme le reste : c'est une répartition de charge décidée par sa
 * société, pas une permission qu'il se donnerait.
 */

const Icone = () => (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
        <path
            d="M3.5 15.5h13M4.8 15.5l1.1-4.2h8.2l1.1 4.2"
            stroke="#1D3E9C"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
        <path
            d="M10 11.3V4.6M7.2 6.6h5.6"
            stroke="#1D3E9C"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

export default function Portee({ profil }: { profil: ProfilFiche }) {
    const armements = profil.armements ?? [];

    return (
        <Carte
            icone={<Icone />}
            titre="Armements sur lesquels vous opérez"
            aside={<Verrou>Affectés par votre société</Verrou>}
        >
            <div style={{ padding: 18 }}>
                {armements.length === 0 ? (
                    <span
                        style={{
                            fontSize: 13,
                            color: '#5A6478',
                            lineHeight: 1.5,
                        }}
                    >
                        Aucun armement ne vous est affecté pour l’instant. Vous
                        ne pourrez déclarer aucune escale tant que le titulaire
                        du compte de votre société ne vous en aura pas ouvert au
                        moins un.
                    </span>
                ) : (
                    <AgentArmBadges armements={armements} />
                )}
            </div>
        </Carte>
    );
}
