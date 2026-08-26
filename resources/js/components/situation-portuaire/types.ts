/*
 * Formes de données de la situation portuaire — miroir de ce que projette
 * `SituationPortuaireController::index`.
 *
 * Une ligne ne porte ni type, ni pavillon, ni armateur en propre : ils
 * viennent du navire du référentiel, que la ligne référence. Le serveur les
 * aplatit pour l'affichage, mais ils restent en lecture seule ici.
 */

export type PortRef = { id: number; code: string; label: string };

export type PosteRef = { id: number; code: string };

export type NavireRef = {
    id: number;
    name: string;
    typeCode: string | null;
    typeLabel: string | null;
    pavillon: string | null;
    armateur: string | null;
};

export type ConsignataireRef = { id: number; name: string };

/** Un jalon de la frise d'escale, dans l'ordre où on le franchit. */
export type StatutRef = { value: string; label: string; abrege: string };

/** Un sens de trafic, et le jalon qui ouvre son verrou de transmission. */
export type SensRef = { value: string; label: string; jalon: string };

export type MouvementRow = {
    id: number;
    navireId: number;
    navire: string;
    typeCode: string | null;
    typeLabel: string | null;
    pavillon: string | null;
    armateur: string | null;
    voyage: string;
    sens: string;
    statut: string;
    posteQuaiId: number | null;
    poste: string | null;
    /** Format du champ `datetime-local` : « 2026-07-05T06:40 ». */
    eta: string | null;
    etd: string | null;
    consignataireId: number | null;
    consignataire: string | null;
    /** Validée par un supérieur, donc diffusée et opposable (ADR-0013). */
    publiee: boolean;
    /** Statut et dates se tiennent — condition de publication. */
    coherente: boolean;
};

export type Publication = {
    /** Horodatage ISO de la dernière publication du port, ou null. */
    publieeLe: string | null;
    brouillons: number;
    incoherentes: number;
};

export type Droits = { renseigner: boolean; valider: boolean };

/** Le brouillon d'édition en ligne : les seuls champs qu'un agent peut reprendre. */
export type EditionDraft = {
    sens: string;
    statut: string;
    poste_quai_id: string;
    eta: string;
    etd: string;
};

/** « 2026-07-05T06:40 » → « 05/07 · 06:40 », comme le document de la conférence. */
export function formatDateHeure(valeur: string | null): string {
    if (!valeur) {
        return '—';
    }

    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valeur);

    return m ? `${m[3]}/${m[2]} · ${m[4]}:${m[5]}` : valeur;
}

/** « 11h34 » — l'heure telle que la pastille de publication l'annonce. */
export function formatHeure(iso: string | null): string | null {
    if (!iso) {
        return null;
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return null;
    }

    return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « 09/07/2026 » — la date de la conférence. */
export function formatDate(iso: string | null): string | null {
    if (!iso) {
        return null;
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return null;
    }

    return d.toLocaleDateString('fr-FR');
}

export function estAujourdHui(iso: string | null): boolean {
    if (!iso) {
        return false;
    }

    const d = new Date(iso);

    return (
        !Number.isNaN(d.getTime()) &&
        d.toDateString() === new Date().toDateString()
    );
}
