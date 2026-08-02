import { Link } from '@inertiajs/react';
import ConfirmDialog from '@/components/admin/confirm-dialog';
import {
    Drawer,
    Field,
    MultiSelectField,
    Section,
    SelectField,
    TextField,
} from '@/components/admin/drawer';
import TableCard from '@/components/admin/table-card';
import { PAR_PAGE } from '@/components/admin/types';
import type { Option } from '@/components/admin/types';
import {
    BadgeAlerte,
    BandeauInfo,
    fieldInput,
    iconBtn,
    RowActions,
    StatutBadge,
    Td,
    Th,
    Vide,
} from '@/components/admin/ui';
import { useCrudTab } from '@/components/admin/use-crud-tab';
import type { ConsignataireRow } from './types';

/** Racine REST de la ressource — sert au hook comme aux liens vers la fiche. */
const BASE = '/admin/utilisateurs/consignataires';

/*
 * Onglet « Consignataires » du module Utilisateurs & habilitations.
 *
 * La société consignataire est le mandataire de l'armement au port (ADR-0014) :
 * c'est elle qui est facturée, jamais la personne qui déclare. Elle se rattache
 * à N armements et à N ports, et se désactive plutôt qu'elle ne se supprime.
 *
 * Le tiroir porte aussi le **compte du titulaire** (ADR-0010) : le CGC ouvre le
 * compte maître en même temps que la fiche société, parce que sans lui personne
 * ne peut créer les comptes agents. Les agents eux-mêmes se gèrent dans leur
 * propre onglet, où ce titulaire figure comme déclarant.
 */

type Form = {
    name: string;
    sigle: string;
    rccm_nif: string;
    pays_immatriculation_id: number | null;
    adresse: string;
    telephone: string;
    email: string;
    armement_ids: number[];
    port_ids: number[];
    titulaire_first_name: string;
    titulaire_last_name: string;
    titulaire_email: string;
    titulaire_phone: string;
    titulaire_job_title: string;
};

const VIERGE: Form = {
    name: '',
    sigle: '',
    rccm_nif: '',
    pays_immatriculation_id: null,
    adresse: '',
    telephone: '',
    email: '',
    armement_ids: [],
    port_ids: [],
    titulaire_first_name: '',
    titulaire_last_name: '',
    titulaire_email: '',
    titulaire_phone: '',
    titulaire_job_title: '',
};

const filtre = (c: ConsignataireRow, q: string) =>
    c.name.toLowerCase().includes(q) ||
    (c.sigle ?? '').toLowerCase().includes(q) ||
    (c.rccm_nif ?? '').toLowerCase().includes(q) ||
    c.port_names.some((p) => p.toLowerCase().includes(q)) ||
    c.armement_names.some((a) => a.toLowerCase().includes(q));

const depuis = (c: ConsignataireRow): Form => ({
    name: c.name,
    sigle: c.sigle ?? '',
    rccm_nif: c.rccm_nif ?? '',
    pays_immatriculation_id: c.pays_immatriculation_id,
    adresse: c.adresse ?? '',
    telephone: c.telephone ?? '',
    email: c.email ?? '',
    armement_ids: c.armement_ids,
    port_ids: c.port_ids,
    titulaire_first_name: c.titulaire_first_name ?? '',
    titulaire_last_name: c.titulaire_last_name ?? '',
    titulaire_email: c.titulaire_email ?? '',
    titulaire_phone: c.titulaire_phone ?? '',
    titulaire_job_title: c.titulaire_job_title ?? '',
});

const valide = (f: Form) => f.name.trim() !== '';

const bascule = (c: ConsignataireRow, prochain: boolean) => ({
    titre: prochain
        ? 'Réactiver ce consignataire ?'
        : 'Désactiver ce consignataire ?',
    corps: prochain
        ? 'La société pourra de nouveau être désignée sur les escales et les déclarations.'
        : 'Une société inactive n’est plus proposée à la saisie. Ses escales et ses factures déjà émises ne sont pas affectées.',
    statLabel: 'Consignataire',
    statValue: c.sigle ? `${c.sigle} — ${c.name}` : c.name,
});

/** Pastille de la première colonne : le sigle, à défaut le début de la raison sociale. */
const initiales = (c: ConsignataireRow) =>
    (c.sigle ?? c.name.slice(0, 3)).toUpperCase();

/**
 * Libellés d'un rattachement N-N, **tronqués**. Une société qui représente
 * trente armements crevait la ligne et rendait le tableau illisible ; au-delà de
 * trois noms la cellule n'informe plus, elle encombre. Le compte restant renvoie
 * à la fiche, seul endroit où la liste complète a la place de s'afficher.
 */
function Rattachements({ noms, max = 3 }: { noms: string[]; max?: number }) {
    if (noms.length === 0) {
        return <Vide />;
    }

    const visibles = noms.slice(0, max);
    const reste = noms.length - visibles.length;

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                alignItems: 'center',
            }}
        >
            {visibles.map((nom) => (
                <span
                    key={nom}
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#3A4356',
                        background: '#EEF1F7',
                        border: '1px solid #D8DEE9',
                        borderRadius: 5,
                        padding: '2px 8px',
                    }}
                >
                    {nom}
                </span>
            ))}
            {reste > 0 && (
                <span
                    title={noms.slice(max).join(', ')}
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#5A6478',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    +{reste}
                </span>
            )}
        </div>
    );
}

/**
 * Comptes de la société : combien, et combien attendent une décision. Le
 * chiffre en attente est le seul de ce tableau qui appelle une action du CGC —
 * d'où sa mise en évidence (ADR-0013).
 */
function ComptesAgents({ consignataire }: { consignataire: ConsignataireRow }) {
    if (consignataire.agents_count === 0) {
        return (
            <span style={{ fontSize: 12, color: '#8A93A6' }}>Aucun compte</span>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
                style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#1A1F2E',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {consignataire.agents_count} compte
                {consignataire.agents_count > 1 ? 's' : ''}
            </span>
            {consignataire.agents_en_attente > 0 && (
                <BadgeAlerte>
                    {consignataire.agents_en_attente} en attente
                </BadgeAlerte>
            )}
        </div>
    );
}

type Props = {
    consignataires: ConsignataireRow[];
    optionsPays: Option[];
    optionsArmements: Option[];
    optionsPorts: Option[];
    signalCreation: number;
    /** Faux pour le Superviseur : l'onglet passe en consultation (ADR-0025). */
    peutGerer: boolean;
};

export default function ConsignatairesTab({
    consignataires,
    optionsPays,
    optionsArmements,
    optionsPorts,
    signalCreation,
    peutGerer,
}: Props) {
    const ref = useCrudTab({
        base: BASE,
        lignes: consignataires,
        filtre,
        vierge: VIERGE,
        depuis,
        valide,
        bascule,
        signalCreation,
    });

    // Un titulaire déjà en place ne se recrée pas : les champs d'identité
    // éditent son compte, et confier la fonction à un autre passe par le
    // dialogue de remplacement, désormais tenu par la fiche de la société.
    const aDejaUnTitulaire = consignataires.some(
        (c) => c.id === ref.edite && c.titulaire_user_id !== null,
    );

    return (
        <>
            {!peutGerer && (
                <div style={{ padding: '18px 26px 0' }}>
                    <BandeauInfo titre="Consultation seule">
                        La création des sociétés consignataires, la désignation
                        de leur titulaire et la validation des comptes agents
                        engagent le CGC vis-à-vis d’un tiers : elles relèvent de
                        l’Administrateur (ADR-0013). Vous conservez la gestion
                        des comptes internes CGC dans l’onglet « Internes CGC ».
                    </BandeauInfo>
                </div>
            )}

            <TableCard
                recherche={ref.recherche}
                onRecherche={ref.setRecherche}
                placeholder="Rechercher une société, un sigle, un armement…"
                total={ref.total}
                unite={['société', 'sociétés']}
                largeurMin={980}
                vide={
                    ref.recherche
                        ? 'Aucune société ne correspond à la recherche.'
                        : 'Aucune société consignataire — ajoutez-en une avec « Nouveau consignataire ».'
                }
                page={ref.page}
                parPage={PAR_PAGE}
                onPage={ref.setPage}
                note="Le consignataire représente l’armement au port : c’est la société facturée. La relation aux armements est N-N — un armement peut être représenté par plusieurs sociétés, et inversement."
                entete={
                    <tr>
                        <Th first>Société consignataire</Th>
                        <Th>Armements représentés</Th>
                        <Th w={190}>Comptes agents</Th>
                        <Th w={120}>Statut</Th>
                        {peutGerer && (
                            <Th w={104} center>
                                Actions
                            </Th>
                        )}
                        <Th w={80} center>
                            Détail
                        </Th>
                    </tr>
                }
            >
                {ref.lignesPage.map((c) => (
                    <tr key={c.id} className="ea-row">
                        <Td style={{ padding: '10px 16px' }}>
                            <Link
                                href={`${BASE}/${c.id}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 11,
                                    textDecoration: 'none',
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 7,
                                        background: '#EEF3FF',
                                        border: '1px solid #C3D0F0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: '#1D3E9C',
                                        flex: 'none',
                                    }}
                                >
                                    {initiales(c)}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13.5,
                                            fontWeight: 700,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {c.name}
                                    </span>
                                    {c.rccm_nif && (
                                        <span
                                            style={{
                                                fontSize: 11,
                                                color: '#8A93A6',
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}
                                        >
                                            {c.rccm_nif}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </Td>
                        <Td>
                            <Rattachements noms={c.armement_names} />
                        </Td>
                        <Td>
                            <ComptesAgents consignataire={c} />
                        </Td>
                        <Td>
                            <StatutBadge actif={c.actif} />
                        </Td>
                        {peutGerer && (
                            <RowActions
                                actif={c.actif}
                                onEdit={() => ref.ouvrirEdition(c)}
                                onToggle={() => ref.demanderBascule(c)}
                            />
                        )}
                        <Td style={{ textAlign: 'center' }}>
                            <Link
                                href={`${BASE}/${c.id}`}
                                title={`Fiche de ${c.name}`}
                                className="ea-icon-btn"
                                style={{ ...iconBtn, textDecoration: 'none' }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M6 3.5L10.5 8 6 12.5"
                                        stroke="currentColor"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </Link>
                        </Td>
                    </tr>
                ))}
            </TableCard>

            {ref.mode && (
                <Drawer
                    titre={
                        ref.mode === 'creation'
                            ? 'Nouveau consignataire'
                            : 'Modifier le consignataire'
                    }
                    soustitre="Identité de la société et rattachements."
                    valider={
                        ref.mode === 'creation'
                            ? 'Enregistrer'
                            : 'Mettre à jour'
                    }
                    peutValider={ref.peutValider}
                    enCours={ref.enCours}
                    onFermer={ref.fermer}
                    onValider={ref.valider}
                >
                    <TextField
                        label="Raison sociale"
                        requis
                        placeholder="ex. SAGA Gabon"
                        valeur={ref.form.name}
                        onChange={(v) => ref.champ('name', v)}
                        erreur={ref.erreurs.name}
                    />
                    <TextField
                        label="Sigle"
                        majuscules
                        maxLength={10}
                        placeholder="ex. SAGA"
                        valeur={ref.form.sigle}
                        onChange={(v) => ref.champ('sigle', v)}
                        erreur={ref.erreurs.sigle}
                        aide="Abréviation affichée dans les tableaux."
                    />
                    <TextField
                        label="RCCM / NIF"
                        placeholder="Identifiants légaux"
                        valeur={ref.form.rccm_nif}
                        onChange={(v) => ref.champ('rccm_nif', v)}
                        erreur={ref.erreurs.rccm_nif}
                    />
                    <SelectField
                        label="Pays d’immatriculation"
                        valeur={ref.form.pays_immatriculation_id}
                        onChange={(v) =>
                            ref.champ('pays_immatriculation_id', v)
                        }
                        options={optionsPays}
                        erreur={ref.erreurs.pays_immatriculation_id}
                    />
                    <Field label="Adresse" erreur={ref.erreurs.adresse}>
                        <textarea
                            value={ref.form.adresse}
                            onChange={(e) =>
                                ref.champ('adresse', e.target.value)
                            }
                            rows={2}
                            maxLength={255}
                            placeholder="Adresse du siège"
                            aria-label="Adresse"
                            style={{
                                ...fieldInput,
                                height: 'auto',
                                padding: '8px 10px',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                lineHeight: 1.45,
                                borderColor: ref.erreurs.adresse
                                    ? '#E0B4AD'
                                    : '#D8DEE9',
                            }}
                        />
                    </Field>
                    <TextField
                        label="Téléphone"
                        chiffres
                        maxLength={30}
                        placeholder="ex. +241 11 22 33 44"
                        valeur={ref.form.telephone}
                        onChange={(v) => ref.champ('telephone', v)}
                        erreur={ref.erreurs.telephone}
                    />
                    <TextField
                        label="Adresse e-mail"
                        placeholder="ex. consignation@saga-gabon.ga"
                        valeur={ref.form.email}
                        onChange={(v) => ref.champ('email', v)}
                        erreur={ref.erreurs.email}
                        aide="Contact de la société, distinct des comptes de ses agents."
                    />
                    <MultiSelectField
                        label="Ports de rattachement"
                        valeurs={ref.form.port_ids}
                        onChange={(v) => ref.champ('port_ids', v)}
                        options={optionsPorts}
                        erreur={ref.erreurs.port_ids}
                        vide="Aucun port actif au référentiel."
                        unite={['port', 'ports']}
                        aide="Places portuaires où la société exerce."
                    />
                    <MultiSelectField
                        label="Armements représentés"
                        valeurs={ref.form.armement_ids}
                        onChange={(v) => ref.champ('armement_ids', v)}
                        options={optionsArmements}
                        erreur={ref.erreurs.armement_ids}
                        vide="Aucun armement actif au référentiel."
                        unite={['armement', 'armements']}
                        aide="La société ne pourra consigner que les armements cochés."
                    />

                    <Section
                        titre="Titulaire du compte"
                        aide={
                            aDejaUnTitulaire
                                ? 'Modifier ces champs met à jour le compte du titulaire actuel. Pour confier la fonction à quelqu’un d’autre, utilisez « Remplacer » depuis le tableau.'
                                : 'La personne qui gère le compte de la société : elle crée les comptes de ses agents et déclare elle-même. Elle recevra un courriel l’invitant à définir son mot de passe — le CGC n’en connaît jamais la valeur. Laissez vide pour la désigner plus tard.'
                        }
                    />
                    <TextField
                        label="Prénom"
                        placeholder="ex. Nadia"
                        valeur={ref.form.titulaire_first_name}
                        onChange={(v) => ref.champ('titulaire_first_name', v)}
                        erreur={ref.erreurs.titulaire_first_name}
                    />
                    <TextField
                        label="Nom"
                        placeholder="ex. Bongo"
                        valeur={ref.form.titulaire_last_name}
                        onChange={(v) => ref.champ('titulaire_last_name', v)}
                        erreur={ref.erreurs.titulaire_last_name}
                    />
                    <TextField
                        label="E-mail professionnel"
                        type="email"
                        autoComplete="off"
                        placeholder="ex. n.bongo@saga-gabon.ga"
                        valeur={ref.form.titulaire_email}
                        onChange={(v) => ref.champ('titulaire_email', v)}
                        erreur={ref.erreurs.titulaire_email}
                        aide="Identifiant de connexion — distinct de l’adresse de la société."
                    />
                    <TextField
                        label="Téléphone"
                        chiffres
                        maxLength={30}
                        placeholder="ex. +241 06 11 22 33"
                        valeur={ref.form.titulaire_phone}
                        onChange={(v) => ref.champ('titulaire_phone', v)}
                        erreur={ref.erreurs.titulaire_phone}
                    />
                    <TextField
                        label="Fonction"
                        maxLength={120}
                        placeholder="ex. Responsable escale"
                        valeur={ref.form.titulaire_job_title}
                        onChange={(v) => ref.champ('titulaire_job_title', v)}
                        erreur={ref.erreurs.titulaire_job_title}
                    />
                </Drawer>
            )}

            <ConfirmDialog etat={ref.confirm} onFermer={ref.fermerConfirm} />
        </>
    );
}
