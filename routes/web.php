<?php

use App\Enums\Permission;
use App\Http\Controllers\Admin\ReferentielController;
use App\Http\Controllers\Admin\Referentiels\TypeNavireController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Administration CGC — un module = une route. Les modules encore alimentés
    // par des données factices restent en Route::inertia ; ils seront câblés un
    // par un (référentiels, barème, audit).
    Route::prefix('admin')->name('admin.')->group(function () {
        // Module Référentiels : socle données câblé, CRUD introduit onglet par
        // onglet. Accès réservé (Superviseur / Administrateur — ADR-0015).
        Route::middleware('can:'.Permission::ReferentielsGerer->value)->group(function () {
            Route::get('referentiels', [ReferentielController::class, 'index'])->name('referentiels');

            // Type de navire (Phase 2 — tranche verticale câblée).
            Route::post('referentiels/types-navire', [TypeNavireController::class, 'store'])->name('referentiels.types-navire.store');
            Route::patch('referentiels/types-navire/{typeNavire}', [TypeNavireController::class, 'update'])->name('referentiels.types-navire.update');
            Route::patch('referentiels/types-navire/{typeNavire}/activation', [TypeNavireController::class, 'toggleActive'])->name('referentiels.types-navire.activation');
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
