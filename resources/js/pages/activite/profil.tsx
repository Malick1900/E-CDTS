import { Head, Link } from '@inertiajs/react';
import ActivityShell from '@/components/activity-shell';
import Toast from '@/components/admin/toast';
import Identite from '@/components/profil/identite';
import Informations from '@/components/profil/informations';
import MotDePasse from '@/components/profil/mot-de-passe';
import Portee from '@/components/profil/portee';
import type {
    CriteresMotDePasse,
    ProfilFiche,
} from '@/components/profil/types';

/*
 * Sa propre fiche — le seul écran qui ne s'adresse qu'à une personne.
 *
 * Il sert les deux populations sans se dédoubler : un agent du CGC et un
 * consignataire y lisent la même chose, seule change l'organisation dont ils
 * relèvent. Ce qui s'y corrige est étroit — état civil, numéro d'appel, mot de
 * passe ; ce qui s'y affiche ne l'est pas. Rôle, identifiant, fonction, portée :
 * ces mentions décrivent celui qui les regarde, et il doit pouvoir les lire même
 * là où il ne les écrit pas.
 *
 * La coquille ne rend pas sa bande de titre ici : c'est la carte d'identité qui
 * nomme l'écran.
 */

type Props = {
    profil: ProfilFiche;
    /** Les exigences de mot de passe telles que le serveur les applique. */
    criteres: CriteresMotDePasse;
};

export default function Profil({ profil, criteres }: Props) {
    return (
        <ActivityShell active="profil">
            <Head title="Profil" />
            <Toast />

            <div
                style={{
                    maxWidth: 1000,
                    margin: '0 auto',
                    padding: '20px 24px 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#5A6478',
                    }}
                >
                    <Link
                        href="/dashboard"
                        style={{ color: '#5A6478', textDecoration: 'none' }}
                    >
                        Tableau de bord
                    </Link>
                    <span style={{ color: '#B4BCC9' }}>›</span>
                    <span style={{ fontWeight: 600, color: '#1D3E9C' }}>
                        Profil
                    </span>
                </div>

                <Identite profil={profil} />
                <Informations profil={profil} />

                {/* Réservée aux comptes clients : un interne CGC n'opère pas
                    pour le compte d'un armement. */}
                {profil.armements === null ? null : <Portee profil={profil} />}

                <MotDePasse profil={profil} criteres={criteres} />
            </div>
        </ActivityShell>
    );
}
