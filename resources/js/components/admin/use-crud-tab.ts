import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { ConfirmEtat } from './confirm-dialog';
import { PAR_PAGE } from './types';
import type { LigneAdmin } from './types';

/*
 * Mécanique commune aux onglets de gestion du panneau d'administration :
 * recherche, pagination, tiroir de saisie et confirmation d'activation.
 *
 * Tous exposent EXACTEMENT les mêmes trois écritures — d'où l'unique paramètre
 * `base`, la racine REST de la ressource, qui suffit à construire les URL :
 *   POST   {base}
 *   PATCH  {base}/{id}
 *   PATCH  {base}/{id}/activation
 *
 * Ce que le hook ne fait PAS : décider des colonnes, des champs ou des mots.
 * Tout cela reste dans l'onglet, qui le lui passe en options.
 */

/**
 * Un formulaire d'administration n'envoie que des scalaires — plus, pour les
 * rattachements N-N, une liste d'identifiants (`sync()` côté serveur).
 */
export type Formulaire = Record<string, string | number | null | number[]>;

type Options<L extends LigneAdmin, F extends Formulaire> = {
    /** Racine REST de la ressource, ex. `/admin/referentiels/pays`. */
    base: string;
    lignes: L[];
    /** Vrai si la ligne correspond à la recherche (`q` est déjà rognée et en minuscules). */
    filtre: (ligne: L, q: string) => boolean;
    /** Valeurs du formulaire à la création. */
    vierge: F;
    /** Valeurs du formulaire à l'édition d'une ligne existante. */
    depuis: (ligne: L) => F;
    /** Champs obligatoires renseignés ? Conditionne le bouton de validation. */
    valide: (form: F) => boolean;
    /** Mots de la confirmation d'activation, `prochain` étant l'état visé. */
    bascule: (
        ligne: L,
        prochain: boolean,
    ) => { titre: string; corps: string; statLabel: string; statValue: string };
    /**
     * Signal du bouton « Ajouter » du bandeau : il vit dans l'AdminShell, hors
     * de l'onglet. La page hôte incrémente ce compteur au clic et le remet à 0
     * en changeant d'onglet — un onglet monté à 0 n'ouvre donc rien.
     */
    signalCreation: number;
};

export function useCrudTab<L extends LigneAdmin, F extends Formulaire>({
    base,
    lignes,
    filtre,
    vierge,
    depuis,
    valide,
    bascule,
    signalCreation,
}: Options<L, F>) {
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);

    const [mode, setMode] = useState<'creation' | 'edition' | null>(null);
    const [edite, setEdite] = useState<number | null>(null);
    const [form, setForm] = useState<F>(vierge);
    const [erreurs, setErreurs] = useState<Record<string, string>>({});
    const [enCours, setEnCours] = useState(false);

    const [confirm, setConfirm] = useState<ConfirmEtat | null>(null);

    /*
     * Absorption du signal « Ajouter ». On ajuste l'état PENDANT le rendu — le
     * motif que React préconise pour réagir à un changement de prop — plutôt
     * que dans un effet, qui déclencherait un rendu en cascade et ferait
     * clignoter le tiroir.
     */
    const [signalVu, setSignalVu] = useState(signalCreation);

    if (signalCreation !== signalVu) {
        setSignalVu(signalCreation);

        if (signalCreation > 0) {
            setForm(vierge);
            setErreurs({});
            setEdite(null);
            setMode('creation');
        }
    }

    // ── Recherche et pagination ───────────────────────────────────
    const filtrees = useMemo(() => {
        const q = recherche.trim().toLowerCase();

        return q === '' ? lignes : lignes.filter((ligne) => filtre(ligne, q));
    }, [lignes, recherche, filtre]);

    const total = filtrees.length;
    const dernierePage = Math.max(1, Math.ceil(total / PAR_PAGE));
    // Borné plutôt que corrigé par un effet : si le filtrage réduit la liste
    // sous la page courante, on affiche la dernière page valable sans rendu
    // intermédiaire à vide.
    const pageCourante = Math.min(page, dernierePage);

    const lignesPage = useMemo(
        () =>
            filtrees.slice(
                (pageCourante - 1) * PAR_PAGE,
                pageCourante * PAR_PAGE,
            ),
        [filtrees, pageCourante],
    );

    const changerRecherche = (valeur: string) => {
        setRecherche(valeur);
        setPage(1);
    };

    // ── Tiroir ────────────────────────────────────────────────────
    const ouvrirEdition = (ligne: L) => {
        setForm(depuis(ligne));
        setErreurs({});
        setEdite(ligne.id);
        setMode('edition');
    };

    const fermer = () => {
        setMode(null);
        setErreurs({});
    };

    const champ = <K extends keyof F>(cle: K, valeur: F[K]) =>
        setForm((precedent) => ({ ...precedent, [cle]: valeur }));

    const peutValider = valide(form);

    const valider = () => {
        if (!peutValider || enCours || mode === null) {
            return;
        }

        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setEnCours(true),
            onFinish: () => setEnCours(false),
            onSuccess: () => {
                setMode(null);
                setErreurs({});
            },
            onError: (e: Record<string, string>) => setErreurs(e),
        };

        if (mode === 'creation') {
            router.post(base, form, options);
        } else {
            router.patch(`${base}/${edite}`, form, options);
        }
    };

    // ── Activation ────────────────────────────────────────────────
    const demanderBascule = (ligne: L) => {
        const prochain = !ligne.actif;

        setConfirm({
            ...bascule(ligne, prochain),
            libelle: prochain ? 'Réactiver' : 'Désactiver',
            danger: !prochain,
            onOk: () => {
                setConfirm(null);
                router.patch(
                    `${base}/${ligne.id}/activation`,
                    {},
                    { preserveScroll: true, preserveState: true },
                );
            },
        });
    };

    return {
        recherche,
        setRecherche: changerRecherche,
        /** Identifiant de la ligne en cours d'édition, null en création. */
        edite,
        page: pageCourante,
        setPage,
        lignesPage,
        total,

        mode,
        form,
        champ,
        erreurs,
        enCours,
        peutValider,
        ouvrirEdition,
        fermer,
        valider,

        confirm,
        demanderBascule,
        fermerConfirm: () => setConfirm(null),
    };
}
