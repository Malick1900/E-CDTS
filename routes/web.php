<?php

use App\Enums\Permission;
use App\Http\Controllers\Admin\BaremeController;
use App\Http\Controllers\Admin\ReferentielController;
use App\Http\Controllers\Admin\Referentiels\ArmementController;
use App\Http\Controllers\Admin\Referentiels\NavireController;
use App\Http\Controllers\Admin\Referentiels\PaysController;
use App\Http\Controllers\Admin\Referentiels\PortController;
use App\Http\Controllers\Admin\Referentiels\TypeNavireController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\Users\AgentController;
use App\Http\Controllers\Admin\Users\ConsignataireController;
use App\Http\Controllers\Admin\Users\RoleController;
use App\Http\Controllers\Admin\Users\TitulaireController;
use Illuminate\Support\Facades\Route;

// e-CDTS est un portail fermé (ADR-0021) : la racine n'a rien à montrer à un
// visiteur. Elle ouvre donc directement le formulaire de connexion — et le
// middleware `guest` de Fortify renvoie au tableau de bord si la session est
// déjà ouverte.
Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Coquille d'activité (ADR-0030). Tout le monde arrive ici, quel que soit le
    // type de compte : ce sont la navigation et le contexte qui diffèrent, pas
    // la route. Les quatre écrans suivants sont des jalons « à venir » — chaque
    // module se branchera sur une entrée déjà en place.
    Route::inertia('dashboard', 'activite/dashboard')->name('dashboard');

    Route::inertia('situation-portuaire', 'activite/situation-portuaire')
        ->middleware('can:'.Permission::SituationPortuaireConsulter->value)
        ->name('situation-portuaire');

    Route::inertia('dossiers', 'activite/dossiers')
        ->middleware('can:'.Permission::DossiersConsulter->value)
        ->name('dossiers');

    Route::inertia('devis', 'activite/devis')
        ->middleware('can:'.Permission::DevisConsulter->value)
        ->name('devis');

    // L'espace d'administration de sa propre société — le lot 2. L'entrée de
    // nav existe déjà pour un titulaire : sans cette route, elle mènerait à un 404.
    Route::inertia('mon-espace', 'activite/mon-espace')
        ->middleware('can:'.Permission::MesAgentsGerer->value)
        ->name('mon-espace');

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

            // Fiche d'une société cliente. En lecture ici et non sous
            // `comptes-clients.gerer` : le Superviseur doit pouvoir consulter le
            // dossier d'un client sans pouvoir l'engager (ADR-0025).
            Route::get('utilisateurs/consignataires/{consignataire}', [ConsignataireController::class, 'show'])->name('utilisateurs.consignataires.show');

            Route::post('utilisateurs', [UserController::class, 'store'])->name('utilisateurs.store');
            Route::patch('utilisateurs/{utilisateur}', [UserController::class, 'update'])->name('utilisateurs.update');
            Route::patch('utilisateurs/{utilisateur}/activation', [UserController::class, 'toggleActive'])->name('utilisateurs.activation');
        });

        // Volet client du module — fiche société ET comptes de ses agents. Il
        // relève d'une permission distincte (ADR-0025) : le Superviseur gère les
        // comptes internes, mais seul l'Administrateur engage le CGC vis-à-vis
        // d'un tiers. La page reste accessible aux deux ; ce sont les écritures
        // qui sont réservées.
        Route::middleware('can:'.Permission::ComptesClientsGerer->value)->group(function () {
            // Sociétés consignataires : mêmes trois écritures que partout. Elles
            // vivent sous `utilisateurs` et non sous `referentiels` parce que la
            // société est un tiers du portail — c'est elle qui est facturée et
            // qui portera les comptes de ses agents (ADR-0014).
            Route::post('utilisateurs/consignataires', [ConsignataireController::class, 'store'])->name('utilisateurs.consignataires.store');
            Route::patch('utilisateurs/consignataires/{consignataire}', [ConsignataireController::class, 'update'])->name('utilisateurs.consignataires.update');
            Route::patch('utilisateurs/consignataires/{consignataire}/activation', [ConsignataireController::class, 'toggleActive'])->name('utilisateurs.consignataires.activation');

            // Transfert de la fonction de titulaire — geste distinct de la
            // modification de la fiche, parce qu'il déplace la capacité de créer
            // des comptes d'une personne à une autre (ADR-0027).
            Route::patch('utilisateurs/consignataires/{consignataire}/titulaire', [TitulaireController::class, 'update'])->name('utilisateurs.consignataires.titulaire');

            // Comptes agents : le CGC ne les crée pas (la société s'en charge),
            // il statue dessus (ADR-0013). D'où des routes de décision plutôt
            // qu'un CRUD.
            Route::patch('utilisateurs/agents/{agent}/validation', [AgentController::class, 'valider'])->name('utilisateurs.agents.validation');
            Route::patch('utilisateurs/agents/{agent}/refus', [AgentController::class, 'refuser'])->name('utilisateurs.agents.refus');
            Route::patch('utilisateurs/agents/{agent}/reexamen', [AgentController::class, 'reexaminer'])->name('utilisateurs.agents.reexamen');
            Route::patch('utilisateurs/agents/{agent}/activation', [AgentController::class, 'toggleActive'])->name('utilisateurs.agents.activation');

            // Pas de route d'affectation des armements : elle appartient au
            // titulaire de la société, seul porteur de `mes-agents.gerer`
            // (ADR-0030). Le CGC continue de voir qui opère sur quoi — c'est
            // utile au support et à l'audit — mais ne l'écrit plus.
        });

        // Recomposition des rôles (ADR-0025). Permission dédiée, et non
        // `utilisateurs.gerer` : sans cette séparation, un Superviseur pouvait
        // s'octroyer n'importe quelle permission en deux clics. On recompose des
        // rôles existants — ni création, ni renommage, ni suppression.
        Route::middleware('can:'.Permission::RolesGerer->value)->group(function () {
            Route::patch('utilisateurs/roles/{role}', [RoleController::class, 'update'])->name('utilisateurs.roles.update');
        });

        // Barème CDTS (ADR-0034). Permission dédiée : le Superviseur gère les
        // comptes et les référentiels, mais la grille tarifaire n'appartient
        // qu'à l'Administrateur — c'est elle qui fixe ce que le port facture.
        Route::middleware('can:'.Permission::BaremeModifier->value)->group(function () {
            Route::get('bareme', [BaremeController::class, 'index'])->name('bareme');
            Route::post('bareme', [BaremeController::class, 'store'])->name('bareme.store');
            Route::patch('bareme/{ligne}', [BaremeController::class, 'update'])->name('bareme.update');
            Route::patch('bareme/{ligne}/activation', [BaremeController::class, 'toggleActive'])->name('bareme.activation');
            Route::delete('bareme/{ligne}', [BaremeController::class, 'destroy'])->name('bareme.destroy');
        });

        Route::inertia('audit', 'admin/audit')->name('audit');
    });
});

require __DIR__.'/settings.php';
