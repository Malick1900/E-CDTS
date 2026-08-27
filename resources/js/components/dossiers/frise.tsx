import type { CSSProperties } from 'react';
import type { EtapeRef } from './types';

/*
 * Le circuit de liquidation CDTS, en six jalons — de l'ouverture du dossier à
 * sa clôture (WF3 à WF6).
 *
 * Le dépouillement porte une flèche circulaire et non son numéro : c'est le
 * seul jalon qui n'avance pas tout droit — la navette consignataire ⇄ CGC y
 * fait autant d'allers-retours qu'il en faut avant l'accord (ADR-0007).
 */

type FriseProps = {
    /** Les six étapes du circuit, dans l'ordre — « Annulé » n'y figure pas. */
    circuit: EtapeRef[];
    /** L'étape où le dossier se trouve, par sa valeur. */
    courante: string;
    /**
     * « compacte » se loge à droite d'un titre d'écran, « large » occupe une
     * carte à elle seule.
     */
    taille?: 'compacte' | 'large';
};

const DEPOUILLEMENT = 'depouillement';

const MESURES = {
    compacte: { pastille: 20, police: 10, trait: 14, colonne: 78, ecart: 3 },
    large: { pastille: 38, police: 12, trait: 54, colonne: 104, ecart: 8 },
} as const;

export default function Frise({
    circuit,
    courante,
    taille = 'compacte',
}: FriseProps) {
    const m = MESURES[taille];
    const rangCourant = circuit.findIndex((e) => e.value === courante);

    return (
        <div
            style={{ display: 'flex', alignItems: 'flex-start' }}
            aria-label="Circuit de liquidation CDTS"
        >
            {circuit.map((etape, i) => {
                const franchi = i < rangCourant;
                const active = i === rangCourant;
                const navette = etape.value === DEPOUILLEMENT;

                const pastille: CSSProperties = {
                    width: m.pastille,
                    height: m.pastille,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: navette && !franchi ? m.police + 2 : m.police - 1,
                    fontWeight: 800,
                    flex: 'none',
                    background: franchi
                        ? '#2F9E2F'
                        : active
                          ? '#1D3E9C'
                          : '#fff',
                    color: franchi || active ? '#fff' : '#8A93A6',
                    border: `2px solid ${franchi ? '#2F9E2F' : active ? '#1D3E9C' : '#C6CDD9'}`,
                    boxShadow: active ? '0 0 0 4px #E4F3FC' : 'none',
                };

                return (
                    <div
                        key={etape.value}
                        style={{ display: 'flex', alignItems: 'flex-start' }}
                    >
                        {i === 0 ? null : (
                            <div
                                style={{
                                    width: m.trait,
                                    height: 2,
                                    background:
                                        franchi || active
                                            ? '#2F9E2F'
                                            : '#D8DEE9',
                                    flex: 'none',
                                    alignSelf: 'flex-start',
                                    marginTop: m.pastille / 2 - 1,
                                }}
                            />
                        )}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: m.ecart,
                                width: m.colonne,
                            }}
                        >
                            <div style={pastille}>
                                {franchi ? '✓' : navette ? '↻' : etape.rang}
                            </div>
                            <span
                                style={{
                                    fontSize: m.police,
                                    fontWeight: active ? 700 : 500,
                                    color: active
                                        ? '#1D3E9C'
                                        : franchi
                                          ? '#3A4356'
                                          : '#8A93A6',
                                    textAlign: 'center',
                                    lineHeight: 1.25,
                                    maxWidth: m.colonne,
                                }}
                            >
                                {etape.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
