<?php

namespace Database\Seeders;

use App\Enums\Profil;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Socle RBAC : permissions + 5 profils CGC + super-admin (ADR-0012/0015).
        $this->call(RolesAndPermissionsSeeder::class);

        // Données maîtres : pays (pavillons), ports gérés par le CGC, types de
        // navire. Vocation à exister en production.
        $this->call(ReferentielsSeeder::class);

        // À partir d'ici : développement uniquement.

        // Compte de développement : profil Administrateur (toutes les
        // attributions CGC — accès réaliste, pas un bypass super-admin).
        $test = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
        $test->assignRole(Profil::Administrateur->value);

        // Armements et navires d'exemple, pour ne pas démarrer sur des écrans
        // vides. Donnée du client en réalité — jamais amorcée en production.
        $this->call(DemoSeeder::class);
    }
}
