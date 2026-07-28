<?php

use App\Enums\Permission;
use App\Http\Controllers\Admin\ReferentielController;
use App\Http\Controllers\Admin\Referentiels\ArmementController;
use App\Http\Controllers\Admin\Referentiels\NavireController;
use App\Http\Controllers\Admin\Referentiels\PaysController;
use App\Http\Controllers\Admin\Referentiels\PortController;
use App\Http\Controllers\Admin\Referentiels\TypeNavireController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Administration CGC — un module = une route. Les modules encore alimentés
    // par des données factices restent en Route::inertia ; ils seront câblés un
    // par un (barème, audit).
    Route::prefix('admin')->name('admin.')->group(function () {
        // Module Référentiels : les cinq référentiels maîtres sont câblés. Chacun
        // expose les trois mêmes écritures — création, mise à jour et bascule
        // d'activation. Jamais de suppression dure (ADR-0012) : on désactive, ce
        // qui retire l'entrée des menus sans toucher aux dossiers existants.
        // Accès réservé (Superviseur / Administrateur — ADR-0015).
        Route::middleware('can:'.Permission::ReferentielsGerer->value)->group(function () {
            Route::get('referentiels', [ReferentielController::class, 'index'])->name('referentiels');

            Route::post('referentiels/types-navire', [TypeNavireController::class, 'store'])->name('referentiels.types-navire.store');
            Route::patch('referentiels/types-navire/{typeNavire}', [TypeNavireController::class, 'update'])->name('referentiels.types-navire.update');
            Route::patch('referentiels/types-navire/{typeNavire}/activation', [TypeNavireController::class, 'toggleActive'])->name('referentiels.types-navire.activation');

            Route::post('referentiels/pays', [PaysController::class, 'store'])->name('referentiels.pays.store');
            Route::patch('referentiels/pays/{pays}', [PaysController::class, 'update'])->name('referentiels.pays.update');
            Route::patch('referentiels/pays/{pays}/activation', [PaysController::class, 'toggleActive'])->name('referentiels.pays.activation');

            Route::post('referentiels/ports', [PortController::class, 'store'])->name('referentiels.ports.store');
            Route::patch('referentiels/ports/{port}', [PortController::class, 'update'])->name('referentiels.ports.update');
            Route::patch('referentiels/ports/{port}/activation', [PortController::class, 'toggleActive'])->name('referentiels.ports.activation');

            Route::post('referentiels/armements', [ArmementController::class, 'store'])->name('referentiels.armements.store');
            Route::patch('referentiels/armements/{armement}', [ArmementController::class, 'update'])->name('referentiels.armements.update');
            Route::patch('referentiels/armements/{armement}/activation', [ArmementController::class, 'toggleActive'])->name('referentiels.armements.activation');

            Route::post('referentiels/navires', [NavireController::class, 'store'])->name('referentiels.navires.store');
            Route::patch('referentiels/navires/{navire}', [NavireController::class, 'update'])->name('referentiels.navires.update');
            Route::patch('referentiels/navires/{navire}/activation', [NavireController::class, 'toggleActive'])->name('referentiels.navires.activation');
        });

        // Module Utilisateurs & habilitations (Phase 2, câblé).
        Route::middleware('can:'.Permission::UtilisateursGerer->value)->group(function () {
            Route::get('utilisateurs', [UserController::class, 'index'])->name('utilisateurs.index');
            Route::post('utilisateurs', [UserController::class, 'store'])->name('utilisateurs.store');
            Route::patch('utilisateurs/{utilisateur}', [UserController::class, 'update'])->name('utilisateurs.update');
            Route::patch('utilisateurs/{utilisateur}/activation', [UserController::class, 'toggleActive'])->name('utilisateurs.activation');
        });

        Route::inertia('bareme', 'admin/bareme')->name('bareme');
        Route::inertia('audit', 'admin/audit')->name('audit');
    });
});

require __DIR__.'/settings.php';
