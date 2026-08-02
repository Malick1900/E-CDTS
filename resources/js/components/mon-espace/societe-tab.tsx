import type { ReactNode } from 'react';
import { BandeauInfo, card, CodeChip, Vide } from '@/components/admin/ui';
import type { MonSocieteFiche } from './types';

/*
 * « Ma société » — le dossier tel que le CGC l'a ouvert, sur pièces.
 *
 * Entièrement en lecture, et volontairement : ces informations sont celles qui
 * ont été vérifiées à l'ouverture du compte. Les laisser corriger ici ferait
 * diverger l'écran du dossier opposable. Le titulaire constate ce que le port
 * détient de lui, et signale au CGC ce qui a changé — c'est exactement le geste
 * que le bandeau décrit.
 */

/** Une ligne de la fiche. Le tiret de `Vide` vaut mieux qu'un blanc : il dit que
 *  le champ existe et qu'il n'est pas renseigné, plutôt que de le laisser croire
 *  absent du dossier. */
function Champ({
    libelle,
    children,
}: {
    libelle: string;
    children: ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: '#8A93A6',
                }}
            >
                {libelle}
            </span>
            <span style={{ fontSize: 13.5, color: '#1A1F2E' }}>{children}</span>
        </div>
    );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
    return (
        <section style={card}>
            <header
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E6EAF2',
                    background: '#FAFBFD',
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: '#1A1F2E',
                }}
            >
                {titre}
            </header>
            <div style={{ padding: 16 }}>{children}</div>
        </section>
    );
}

const grille = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18,
} as const;

export default function SocieteTab({ societe }: { societe: MonSocieteFiche }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BandeauInfo titre="Fiche tenue par le CGC">
                Ces informations sont celles du dossier sur lequel votre compte
                a été ouvert. Elles ne se modifient pas depuis cet espace : si
                l'une d'elles a changé — siège, contact, immatriculation —
                adressez la mise à jour au CGC, pièces à l'appui.
            </BandeauInfo>

            <Bloc titre="Identification">
                <div style={grille}>
                    <Champ libelle="Raison sociale">{societe.name}</Champ>
                    <Champ libelle="Sigle">{societe.sigle ?? <Vide />}</Champ>
                    <Champ libelle="RCCM · NIF">
                        {societe.rccm_nif ?? <Vide />}
                    </Champ>
                    <Champ libelle="Pays d'immatriculation">
                        {societe.pays_immatriculation ?? <Vide />}
                    </Champ>
                </div>
            </Bloc>

            <Bloc titre="Coordonnées">
                <div style={grille}>
                    <Champ libelle="Siège">{societe.adresse ?? <Vide />}</Champ>
                    <Champ libelle="Téléphone">
                        {societe.telephone ?? <Vide />}
                    </Champ>
                    <Champ libelle="Adresse e-mail">
                        {societe.email ?? <Vide />}
                    </Champ>
                </div>
            </Bloc>

            <Bloc titre="Ports desservis">
                {societe.ports.length === 0 ? (
                    <span style={{ fontSize: 13, color: '#5A6478' }}>
                        Aucun port n'est rattaché à votre société. Vos agents ne
                        pourront déclarer aucune escale tant que le CGC n'en
                        aura pas ouvert au moins un.
                    </span>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                        }}
                    >
                        {societe.ports.map((port) => (
                            <div
                                key={port.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    padding: '7px 12px 7px 9px',
                                    borderRadius: 7,
                                    border: '1px solid #E6EAF2',
                                    background: '#FAFBFD',
                                }}
                            >
                                <CodeChip>{port.code}</CodeChip>
                                <span
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#1A1F2E',
                                        }}
                                    >
                                        {port.name}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11.5,
                                            color: '#5A6478',
                                        }}
                                    >
                                        {port.pays ?? 'Pays non précisé'}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Bloc>
        </div>
    );
}
