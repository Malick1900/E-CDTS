<?php

namespace App\Enums;

/**
 * Catalogue des permissions e-CDTS — source unique en code (ADR-0012).
 *
 * Une permission n'existe que si un crochet d'autorisation la contrôle : on ne
 * crée jamais de permission depuis l'UI. En revanche la COMPOSITION des rôles
 * (quels rôles portent quelles permissions) est éditable depuis l'admin.
 *
 * La valeur de chaque cas est le nom stocké en base (table `permissions` de
 * spatie/laravel-permission) et testé via `can()` / middleware `permission:`.
 *
 * @see docs/ENTITES.md §3 (matrice profil × attribution)
 * @see docs/DECISIONS.md ADR-0012, ADR-0013, ADR-0015
 */
enum Permission: string
{
    case SituationPortuaireRenseigner = 'situation-portuaire.renseigner';
    case DepouillementTraiter = 'depouillement.traiter';
    case FactureTeleverser = 'facture.televerser';
    case SituationPortuaireValider = 'situation-portuaire.valider';
    case PvValider = 'pv.valider';
    case DossierCloturer = 'dossier.cloturer';
    case EscaleModifierModeExploitation = 'escale.modifier-mode-exploitation';
    case ReferentielsGerer = 'referentiels.gerer';
    case UtilisateursGerer = 'utilisateurs.gerer';
    case ComptesClientsGerer = 'comptes-clients.gerer';
    case RolesGerer = 'roles.gerer';
    case BaremeModifier = 'bareme.modifier';
    case StatistiquesConsulter = 'statistiques.consulter';
    case SituationPortuaireConsulter = 'situation-portuaire.consulter';
    case DossiersConsulter = 'dossiers.consulter';
    case DevisConsulter = 'devis.consulter';
    case MesAgentsGerer = 'mes-agents.gerer';

    /**
     * Libellé métier lisible — alimente la matrice « Rôles & permissions »
     * (module 1 de l'admin).
     */
    public function label(): string
    {
        return match ($this) {
            self::SituationPortuaireRenseigner => 'Renseigner la situation portuaire',
            self::DepouillementTraiter => 'Dépouillement / réconciliation avec le consignataire',
            self::FactureTeleverser => 'Téléverser la facture',
            self::SituationPortuaireValider => 'Valider la situation portuaire',
            self::PvValider => 'Valider le PV de réconciliation définitif',
            self::DossierCloturer => 'Clôturer un dossier',
            self::EscaleModifierModeExploitation => "Modifier le mode d'exploitation d'une escale",
            self::ReferentielsGerer => 'Gérer les référentiels',
            self::UtilisateursGerer => 'Gérer les utilisateurs',
            self::ComptesClientsGerer => 'Créer / valider les comptes clients',
            self::RolesGerer => 'Gérer les rôles et permissions',
            self::BaremeModifier => 'Modifier le barème',
            self::StatistiquesConsulter => 'Consulter les statistiques',
            self::SituationPortuaireConsulter => 'Consulter la situation portuaire',
            self::DossiersConsulter => "Consulter les dossiers d'escale",
            self::DevisConsulter => 'Consulter les devis et factures',
            self::MesAgentsGerer => 'Gérer les comptes agents de sa société',
        };
    }

    /**
     * Domaine d'appartenance — regroupe les lignes de la matrice « Rôles &
     * permissions » pour qu'on lise d'un coup d'œil qui touche à l'exploitation
     * et qui touche à l'administration.
     *
     * Sert l'affichage uniquement : le contrôle d'accès ne connaît que les
     * permissions unitaires.
     */
    public function domaine(): string
    {
        return match ($this) {
            self::SituationPortuaireRenseigner,
            self::DepouillementTraiter,
            self::FactureTeleverser,
            self::SituationPortuaireValider,
            self::PvValider,
            self::DossierCloturer,
            self::EscaleModifierModeExploitation => 'Exploitation',

            self::ReferentielsGerer,
            self::UtilisateursGerer,
            self::ComptesClientsGerer,
            self::RolesGerer,
            self::BaremeModifier,
            self::MesAgentsGerer => 'Administration',

            self::StatistiquesConsulter,
            self::SituationPortuaireConsulter,
            self::DossiersConsulter,
            self::DevisConsulter => 'Consultation',
        };
    }

    /**
     * Les valeurs (noms stockés en base) de toutes les permissions du catalogue.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $p): string => $p->value, self::cases());
    }
}
