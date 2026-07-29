<?php

namespace App\Enums;

/**
 * Les profils CGC — valeurs de départ, PAS un gel (ADR-0012/0015).
 *
 * Le seed pose ces rôles et leur composition initiale ; l'admin peut ensuite
 * ajouter/retirer des permissions, créer d'autres rôles, etc. Le rôle
 * `super-admin` fait exception : protégé, non modifiable/supprimable, il
 * outrepasse toute vérification via un `Gate::before` (il ne dépend donc pas
 * d'une liste de permissions).
 *
 * @see docs/ENTITES.md §3
 * @see docs/DECISIONS.md ADR-0015 (catalogue des 5 profils), ADR-0012
 */
enum Profil: string
{
    case SuperAdmin = 'super-admin';
    case Conferencier = 'Conférencier';
    case AgentDepouilleur = 'Agent dépouilleur';
    case Superviseur = 'Superviseur';
    case Administrateur = 'Administrateur';
    case Consultant = 'Consultant';

    /**
     * Le rôle technique protégé (verrouillé, anti-auto-blocage — ADR-0012).
     */
    public function estProtege(): bool
    {
        return $this === self::SuperAdmin;
    }

    /**
     * Le profil accepte-t-il d'être recomposé depuis l'écran « Rôles &
     * permissions » ? (ADR-0025)
     *
     * Deux exceptions, pour des raisons opposées : `super-admin` ne porte
     * aucune permission explicite (il outrepasse via Gate::before) et
     * `Administrateur` les porte toutes par définition. Les décocher n'aurait
     * respectivement aucun effet et aucun sens — et c'est ce qui rend
     * l'auto-blocage impossible par construction, sans garde à écrire.
     *
     * Liste blanche : un rôle absent de cet enum n'est pas recomposable.
     */
    public function estRecomposable(): bool
    {
        return ! $this->estProtege() && $this !== self::Administrateur;
    }

    /**
     * Composition d'attributions initiale du profil (matrice ENTITES.md §3).
     *
     * `super-admin` outrepasse via Gate::before → aucune permission explicite.
     * `Administrateur` peut tout faire côté CGC → catalogue complet.
     *
     * @return list<Permission>
     */
    public function permissionsParDefaut(): array
    {
        return match ($this) {
            self::SuperAdmin => [],
            self::Conferencier => [
                Permission::SituationPortuaireRenseigner,
            ],
            self::AgentDepouilleur => [
                Permission::DepouillementTraiter,
                Permission::FactureTeleverser,
            ],
            self::Superviseur => [
                Permission::SituationPortuaireRenseigner,
                Permission::DepouillementTraiter,
                Permission::FactureTeleverser,
                Permission::SituationPortuaireValider,
                Permission::PvValider,
                Permission::DossierCloturer,
                Permission::EscaleModifierModeExploitation,
                Permission::ReferentielsGerer,
                Permission::UtilisateursGerer,
                Permission::StatistiquesConsulter,
            ],
            self::Administrateur => Permission::cases(),
            self::Consultant => [
                Permission::StatistiquesConsulter,
            ],
        };
    }
}
