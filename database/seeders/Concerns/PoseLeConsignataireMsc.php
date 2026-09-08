<?php

namespace Database\Seeders\Concerns;

use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

/**
 * La société qui consigne les navires MSC, et son titulaire.
 *
 * Elle est commune à tous les manifestes MSC de référence — WG523R, WG528A —
 * qui portent le même `Shipping_Agent_name` : « MSC GABON ». Le nom compte, le
 * parseur signalant l'écart d'émetteur quand la société du dossier en porte un
 * autre. Le compte est **vérifié et actif** : sans quoi le middleware
 * `verified` le retiendrait à la porte.
 */
trait PoseLeConsignataireMsc
{
    protected function consignataireMsc(Port $port): Consignataire
    {
        $societe = Consignataire::updateOrCreate(['name' => 'MSC Gabon'], [
            'sigle' => 'MSC',
            'rccm_nif' => 'RCCM LBV 2015 B 03917',
            'pays_immatriculation_id' => Pays::query()->where('code', 'GA')->value('id'),
            'email' => 'consignation@msc-gabon.ga',
            'actif' => true,
        ]);

        $msc = Armement::query()->where('sigle', 'MSC')->first();

        $societe->armements()->syncWithoutDetaching(array_filter([$msc?->id]));
        $societe->ports()->syncWithoutDetaching([$port->id]);

        $titulaire = User::updateOrCreate(['email' => 'armand.mbina@msc-gabon.ga'], [
            'name' => 'Armand Mbina',
            'first_name' => 'Armand',
            'last_name' => 'Mbina',
            'job_title' => 'Responsable escale',
            'phone' => '+241 06 24 18 07',
            'password' => 'password',
            'consignataire_id' => $societe->id,
            'statut_validation' => StatutValidation::Valide,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $titulaire->armements()->syncWithoutDetaching(array_filter([$msc?->id]));

        $societe->forceFill(['titulaire_user_id' => $titulaire->id])->save();

        // Le rôle se déduit de la position — titulaire ici, puisque la société
        // vient de le désigner (ADR-0031).
        Artisan::call('clients:synchroniser-roles');

        return $societe->refresh();
    }
}
