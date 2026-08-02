/*
 * Dialogue de remplacement du titulaire d'une société consignataire (ADR-0027).
 *
 * Deux cas réels, deux chemins : la fonction passe à un agent déjà en place
 * (réorganisation interne), ou le remplaçant n'a pas encore de compte (le
 * précédent est parti). Le sortant reste agent déclarant dans les deux cas —
 * le dialogue le dit, parce que c'est la question que se pose l'administrateur
 * au moment de cliquer.
 */
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { Option } from '@/components/admin/types';
import type { CibleTitulaire } from './types';

type Mode = 'existant' | 'nouveau';

const LABEL: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#3A4356',
};
const INPUT: React.CSSProperties = {
    width: '100%',
    height: 36,
    border: '1px solid #D8DEE9',
    borderRadius: 6,
    padding: '0 11px',
    fontSize: 13,
    color: '#1A1F2E',
    background: '#fff',
    outlineColor: '#1D3E9C',
};

export default function RemplacerTitulaire({
    consignataire,
    onFermer,
}: {
    consignataire: CibleTitulaire;
    onFermer: () => void;
}) {
    const candidats: Option[] = consignataire.agents_eligibles;

    // Sans agent éligible, le choix ne se pose pas : on ouvre directement sur
    // la saisie d'une nouvelle personne.
    const [mode, setMode] = useState<Mode>(
        candidats.length > 0 ? 'existant' : 'nouveau',
    );
    const [agentId, setAgentId] = useState<number | null>(
        candidats[0]?.value ?? null,
    );
    const [form, setForm] = useState({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        fonction: '',
    });
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [enCours, setEnCours] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onFermer();
            }
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [onFermer]);

    const champ = (cle: keyof typeof form, valeur: string) =>
        setForm((cur) => ({ ...cur, [cle]: valeur }));

    const peutValider =
        !enCours &&
        (mode === 'existant'
            ? agentId !== null
            : form.prenom.trim() !== '' &&
              form.nom.trim() !== '' &&
              form.email.trim() !== '');

    const soumettre = () => {
        if (!peutValider) {
            return;
        }

        const donnees =
            mode === 'existant'
                ? { agent_id: agentId }
                : {
                      titulaire_first_name: form.prenom,
                      titulaire_last_name: form.nom,
                      titulaire_email: form.email,
                      titulaire_phone: form.telephone,
                      titulaire_job_title: form.fonction,
                  };

        router.patch(
            `/admin/utilisateurs/consignataires/${consignataire.id}/titulaire`,
            donnees,
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setEnCours(true),
                onFinish: () => setEnCours(false),
                onSuccess: onFermer,
                onError: (e: Record<string, string>) => setErreurs(e),
            },
        );
    };

    return (
        <div
            onClick={onFermer}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(20,31,46,.48)',
                zIndex: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                animation: 'ecdtsFade .18s ease',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Remplacer le titulaire"
                style={{
                    width: 520,
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 9,
                    boxShadow: '0 18px 50px rgba(20,44,115,.30)',
                    animation: 'ecdtsPop .18s ease',
                }}
            >
                <div style={{ padding: '18px 22px 10px' }}>
                    <h3
                        style={{
                            margin: '0 0 6px',
                            fontSize: 16,
                            fontWeight: 800,
                            color: '#1A1F2E',
                        }}
                    >
                        Remplacer le titulaire
                    </h3>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: '#3A4356',
                        }}
                    >
                        {consignataire.titulaire_name ? (
                            <>
                                <strong>{consignataire.titulaire_name}</strong>{' '}
                                perd la gestion des comptes de{' '}
                                {consignataire.name}, mais reste agent déclarant
                                avec ses affectations. Pour lui retirer aussi
                                l’accès, désactivez son compte depuis l’onglet
                                Agents.
                            </>
                        ) : (
                            <>
                                Aucun titulaire n’est désigné pour{' '}
                                {consignataire.name} : personne ne peut créer
                                les comptes de ses agents.
                            </>
                        )}
                    </p>
                </div>

                <div
                    style={{
                        padding: '4px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}
                >
                    <div
                        role="radiogroup"
                        aria-label="Origine du nouveau titulaire"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        <Choix
                            actif={mode === 'existant'}
                            disponible={candidats.length > 0}
                            titre="Désigner un agent de la société"
                            detail={
                                candidats.length > 0
                                    ? 'Son compte et ses affectations sont conservés ; il reçoit un courriel.'
                                    : 'Aucun agent validé disponible dans cette société.'
                            }
                            onClick={() =>
                                candidats.length > 0 && setMode('existant')
                            }
                        />
                        <Choix
                            actif={mode === 'nouveau'}
                            disponible
                            titre="Ouvrir le compte d’une nouvelle personne"
                            detail="Elle recevra un courriel l’invitant à définir son mot de passe."
                            onClick={() => setMode('nouveau')}
                        />
                    </div>

                    {mode === 'existant' ? (
                        <label
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 5,
                            }}
                        >
                            <span style={LABEL}>Agent désigné</span>
                            <select
                                value={agentId ?? ''}
                                onChange={(e) =>
                                    setAgentId(
                                        e.target.value === ''
                                            ? null
                                            : Number(e.target.value),
                                    )
                                }
                                style={{
                                    ...INPUT,
                                    borderColor: erreurs.agent_id
                                        ? '#E0B4AD'
                                        : '#D8DEE9',
                                }}
                            >
                                {candidats.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            {erreurs.agent_id ? (
                                <span
                                    style={{ fontSize: 11.5, color: '#C0392B' }}
                                >
                                    {erreurs.agent_id}
                                </span>
                            ) : null}
                        </label>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            <Champ
                                label="Prénom"
                                valeur={form.prenom}
                                onChange={(v) => champ('prenom', v)}
                                erreur={erreurs.titulaire_first_name}
                            />
                            <Champ
                                label="Nom"
                                valeur={form.nom}
                                onChange={(v) => champ('nom', v)}
                                erreur={erreurs.titulaire_last_name}
                            />
                            <Champ
                                label="E-mail professionnel"
                                type="email"
                                valeur={form.email}
                                onChange={(v) => champ('email', v)}
                                erreur={erreurs.titulaire_email}
                            />
                            <Champ
                                label="Téléphone"
                                valeur={form.telephone}
                                onChange={(v) => champ('telephone', v)}
                                erreur={erreurs.titulaire_phone}
                            />
                            <Champ
                                label="Fonction"
                                valeur={form.fonction}
                                onChange={(v) => champ('fonction', v)}
                                erreur={erreurs.titulaire_job_title}
                            />
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        padding: '14px 22px',
                        borderTop: '1px solid #E7EBF2',
                        background: '#FBFCFE',
                        marginTop: 14,
                    }}
                >
                    <button
                        type="button"
                        onClick={onFermer}
                        className="ea-btn-cancel"
                        style={{
                            height: 36,
                            padding: '0 16px',
                            border: '1px solid #C3CBDA',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#3A4356',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={soumettre}
                        disabled={!peutValider}
                        className={peutValider ? 'ea-btn-primary' : undefined}
                        style={{
                            height: 36,
                            padding: '0 16px',
                            border: 'none',
                            borderRadius: 6,
                            background: peutValider ? '#1D3E9C' : '#C3CBDA',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: peutValider ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {enCours ? 'Enregistrement…' : 'Confier la fonction'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Choix({
    actif,
    disponible,
    titre,
    detail,
    onClick,
}: {
    actif: boolean;
    disponible: boolean;
    titre: string;
    detail: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={actif}
            disabled={!disponible}
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                border: `1px solid ${actif ? '#1D3E9C' : '#D8DEE9'}`,
                borderRadius: 8,
                background: actif ? '#F5F8FD' : '#fff',
                cursor: disponible ? 'pointer' : 'not-allowed',
                opacity: disponible ? 1 : 0.55,
                textAlign: 'left',
                width: '100%',
            }}
        >
            <span
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `1.5px solid ${actif ? '#1D3E9C' : '#C3CBDA'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    marginTop: 2,
                }}
            >
                {actif ? (
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#1D3E9C',
                        }}
                    />
                ) : null}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                    style={{ fontSize: 13, fontWeight: 700, color: '#1A1F2E' }}
                >
                    {titre}
                </span>
                <span
                    style={{
                        fontSize: 11.5,
                        color: '#5A6478',
                        lineHeight: 1.4,
                    }}
                >
                    {detail}
                </span>
            </span>
        </button>
    );
}

function Champ({
    label,
    valeur,
    onChange,
    erreur,
    type = 'text',
}: {
    label: string;
    valeur: string;
    onChange: (v: string) => void;
    erreur?: string;
    type?: string;
}) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={LABEL}>{label}</span>
            <input
                type={type}
                value={valeur}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="off"
                style={{
                    ...INPUT,
                    borderColor: erreur ? '#E0B4AD' : '#D8DEE9',
                }}
            />
            {erreur ? (
                <span style={{ fontSize: 11.5, color: '#C0392B' }}>
                    {erreur}
                </span>
            ) : null}
        </label>
    );
}
