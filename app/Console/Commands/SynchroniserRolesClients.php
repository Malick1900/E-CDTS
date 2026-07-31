<?php

namespace App\Console\Commands;

use App\Enums\RoleClient;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Aligne le rôle de chaque compte client sur sa position réelle (ADR-0031).
 *
 * Les rôles clients sont arrivés après les comptes : ceux déjà en base n'en
 * portent aucun, donc aucune permission, donc une navigation vide. Cette
 * commande les rattrape. Elle reste utile ensuite comme filet — après une
 * reprise de données, ou si un rôle a été retiré à la main en base.
 *
 * Idempotente : un compte déjà au bon rôle n'est pas touché.
 */
class SynchroniserRolesClients extends Command
{
    protected $signature = 'clients:synchroniser-roles';

    protected $description = 'Aligne le rôle des comptes clients sur leur position dans leur société';

    public function handle(): int
    {
        $comptes = User::query()
            ->whereNotNull('consignataire_id')
            ->with(['roles:id,name', 'consignataire:id,titulaire_user_id'])
            ->get();

        $alignes = 0;

        foreach ($comptes as $compte) {
            $attendu = $compte->consignataire?->titulaire_user_id === $compte->id
                ? RoleClient::Titulaire
                : RoleClient::Agent;

            // Un compte client ne porte qu'un rôle : on compare la liste entière,
            // sinon un compte qui en cumulerait deux passerait pour conforme.
            if ($compte->roles->pluck('name')->all() === [$attendu->value]) {
                continue;
            }

            $compte->syncRoles([$attendu->value]);
            $alignes++;
        }

        $this->info("{$alignes} compte(s) aligné(s) sur {$comptes->count()} compte(s) client(s).");

        return self::SUCCESS;
    }
}
