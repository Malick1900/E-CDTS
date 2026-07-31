<?php

namespace App\Enums;

/**
 * Les deux rôles des comptes clients — au catalogue, mais figés (ADR-0031).
 *
 * Ils vivent hors de `Profil`, qui ne décrit que les profils CGC : un compte
 * client ne se compose pas, il occupe une position dans sa société. Le titulaire
 * gère les comptes de ses agents (ADR-0027) ; l'agent déclare, rien de plus.
 *
 * « Figé » n'a demandé aucune garde : `RoleUpdateRequest` autorise sur
 * `Profil::tryFrom($role->name)?->estRecomposable()`, qui rend `false` pour un
 * nom absent de l'enum `Profil`. Ces deux rôles s'affichent donc dans la matrice
 * « Rôles & permissions » sans y être modifiables — c'est tout l'objet
 * d'ADR-0031 : que les capacités du titulaire et de ses agents se lisent à
 * l'écran plutôt que dans le code.
 *
 * @see docs/DECISIONS.md ADR-0031, ADR-0025 (amendée)
 */
enum RoleClient: string
{
    case Titulaire = 'Consignataire titulaire';
    case Agent = 'Consignataire agent';

    /**
     * Composition du rôle. Contrairement aux profils CGC, elle n'est pas un
     * point de départ : le seeder la resynchronise à chaque passage, puisque
     * personne ne peut l'avoir amendée entre-temps.
     *
     * @return list<Permission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Titulaire => [
                Permission::SituationPortuaireConsulter,
                Permission::DossiersConsulter,
                Permission::DevisConsulter,
                Permission::MesAgentsGerer,
            ],
            // Ni les devis ni les factures : c'est de l'argent, cela reste au
            // titulaire (ADR-0030). L'agent déclare, il n'engage pas la société.
            self::Agent => [
                Permission::SituationPortuaireConsulter,
                Permission::DossiersConsulter,
            ],
        };
    }

    /**
     * Les noms stockés en base, pour distinguer les rôles clients des rôles CGC
     * dans les requêtes (sélecteur de rôle d'un compte interne, notamment).
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $r): string => $r->value, self::cases());
    }
}
