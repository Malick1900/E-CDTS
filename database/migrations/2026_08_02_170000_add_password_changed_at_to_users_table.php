<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Date du dernier changement de mot de passe, affichée sur l'écran Profil.
     *
     * Ce n'est pas une décoration : sur un portail où l'on engage sa société,
     * le titulaire du compte doit pouvoir constater lui-même depuis quand son
     * secret n'a pas bougé — et repérer un changement qu'il n'a pas demandé.
     *
     * Nullable : un compte dont le mot de passe n'a jamais changé depuis son
     * ouverture affiche « Jamais modifié », ce qui est l'information utile.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });
    }
};
