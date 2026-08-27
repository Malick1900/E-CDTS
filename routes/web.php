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
use App\Http\Controllers\DossierEscaleController;
use App\Http\Controllers\ManifesteEscaleController;
use App\Http\Controllers\ManifesteImportController;
use App\Http\Controllers\ManifestePieceController;
use App\Http\Controllers\ManifesteSaisieController;
use App\Http\Controllers\ManifesteTransmissionController;
use App\Http\Controllers\MonEspace\AffectationController as MonEspaceAffectationController;
use App\Http\Controllers\MonEspace\AgentController as MonEspaceAgentController;
use App\Http\Controllers\MonEspaceController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\SituationPortuaireController;
use App\Http\Controllers\SituationPortuaireExportController;
use App\Http\Controllers\SituationPortuairePubliqueController;
use Illuminate\Support\Facades\Route;

// e-CDTS est un portail fermé (ADR-0021) : la racine n'a rien à montrer à un
// visiteur. Elle ouvre donc directement le formulaire de connexion — et le
// middleware `guest` de Fortify renvoie au tableau de bord si la session est
// déjà ouverte.
Route::redirect('/', '/login')->name('home');

// La seule exception au portail fermé : la situation portuaire est un document
// public (ADR-0011). Elle ne montre que les lignes publiées, et n'offre aucune
// action — c'est le lien « Voir la situation portuaire » de l'écran de
// connexion, et la version que le CGC imprime pour ses partenaires.
Route::get('situation-portuaire-publique', [SituationPortuairePubliqueController::class, 'index'])
    ->name('situation-portuaire.publique');

Route::middleware(['auth', 'verified'])->group(function () {
    // Coquille d'activité (ADR-0030). Tout le monde arrive ici, quel que soit le
    // type de compte : ce sont la navigation et le contexte qui diffèrent, pas
    // la route. Les quatre écrans suivants sont des jalons « à venir » — chaque
    // module se branchera sur une entrée déjà en place.
    Route::inertia('dashboard', 'activite/dashboard')->name('dashboard');

    // Situation portuaire. Trois droits s'y superposent (ADR-0013) : consulter
    // ouvre l'écran, renseigner autorise la saisie, valider autorise la seule
    // publication — le conférencier saisit, son supérieur publie.
    Route::get('situation-portuaire', [SituationPortuaireController::class, 'index'])
        ->middleware('can:'.Permission::SituationPortuaireConsulter->value)
        ->name('situation-portuaire');

    Route::middleware('can:'.Permission::SituationPortuaireRenseigner->value)->group(function () {
        Route::post('situation-portuaire', [SituationPortuaireController::class, 'store'])
            ->name('situation-portuaire.store');
        Route::patch('situation-portuaire/{mouvement}', [SituationPortuaireController::class, 'update'])
            ->name('situation-portuaire.update');
    });

    // Pas de suppression : une escale inscrite par erreur se corrige, et
    // l'historique des mouvements est ce que le dossier d'escale référencera.
    Route::post('situation-portuaire/{port}/publication', [SituationPortuaireController::class, 'publier'])
        ->middleware('can:'.Permission::SituationPortuaireValider->value)
        ->name('situation-portuaire.publication');

    // Export PDF du tableau, sur une période choisie. Adossé au droit de
    // consultation : qui peut lire la situation peut l'emporter sur papier.
    Route::get('situation-portuaire/{port}/export', [SituationPortuaireExportController::class, 'pdf'])
        ->middleware('can:'.Permission::SituationPortuaireConsulter->value)
        ->name('situation-portuaire.export');

    // Dossiers d'escale. L'écran d'accueil du module : la liste du périmètre du
    // compte, et le bouton qui mène à l'ouverture. La permission ouvre la
    // porte ; c'est le controller qui borne ce qu'on voit derrière — un compte
    // client ne voit que les dossiers de sa société.
    Route::middleware('can:'.Permission::DossiersConsulter->value)->group(function () {
        Route::get('dossiers', [DossierEscaleController::class, 'index'])->name('dossiers');

        // L'ouverture d'un dossier (WF3). Aucune permission propre : consulter
        // ouvre l'écran, et c'est d'avoir une société — donc d'être un compte
        // client — qui autorise le geste. Le controller et la form request le
        // vérifient tous deux ; un interne CGC n'aurait personne à qui
        // attribuer le dossier.
        Route::get('dossiers/nouveau', [DossierEscaleController::class, 'create'])->name('dossiers.nouveau');
        Route::post('dossiers', [DossierEscaleController::class, 'store'])->name('dossiers.store');

        // L'aiguillage. Cliquer un dossier dans la liste, c'est arriver à
        // l'étape où il en est : l'écran d'accueil ne connaît pas les écrans de
        // traitement, il envoie ici et l'étape décide (`EtapeDossier::ecran`).
        // Déclarée APRÈS `dossiers/nouveau`, que le paramètre avalerait.
        Route::get('dossiers/{escale}', [DossierEscaleController::class, 'show'])->name('dossiers.show');

        // Le manifeste du dossier (WF4, puis WF5). Une seule permission pour
        // les deux bouts du circuit : c'est le même document, et c'est le
        // périmètre du compte qui sépare celui qui déclare de celui qui
        // instruit.
        Route::get('dossiers/{escale}/manifeste', [ManifesteEscaleController::class, 'index'])->name('dossiers.manifeste');

        // Qualifier une ligne du manifeste : dire ce qu'elle est, donc ce
        // qu'elle coûte (WF4). Aucune permission propre — c'est d'avoir une
        // société qui autorise le geste : le consignataire déclare, le CGC
        // instruit (ADR-0007). La form request et le controller le vérifient
        // tous deux, comme à l'ouverture.
        Route::patch('dossiers/{escale}/manifeste/qualification', [ManifesteEscaleController::class, 'qualifier'])
            ->name('dossiers.manifeste.qualification');

        // Les deux voies de renseignement (WF4). Même garde que la
        // qualification : c'est d'avoir une société qui autorise le geste.
        // Regarder avant d'écrire : le fichier est lu et résumé sans rien
        // enregistrer, puis redéposé sur la route ci-dessus si le
        // consignataire confirme.
        Route::post('dossiers/{escale}/manifeste/xml/apercu', [ManifesteImportController::class, 'apercu'])
            ->name('dossiers.manifeste.xml.apercu');
        Route::post('dossiers/{escale}/manifeste/xml', [ManifesteImportController::class, 'store'])
            ->name('dossiers.manifeste.xml');
        Route::post('dossiers/{escale}/manifeste/saisie', [ManifesteSaisieController::class, 'store'])
            ->name('dossiers.manifeste.saisie');

        // La saisie au CONNAISSEMENT — jamais à la ligne du tableau : poids,
        // volume et colis appartiennent au BL (MANIFESTE-XML.md).
        Route::post('dossiers/{escale}/manifeste/connaissements', [ManifesteSaisieController::class, 'storeConnaissement'])
            ->name('dossiers.manifeste.connaissements.store');
        Route::put('dossiers/{escale}/manifeste/connaissements/{connaissement}', [ManifesteSaisieController::class, 'updateConnaissement'])
            ->name('dossiers.manifeste.connaissements.update');
        Route::delete('dossiers/{escale}/manifeste/connaissements/{connaissement}', [ManifesteSaisieController::class, 'destroyConnaissement'])
            ->name('dossiers.manifeste.connaissements.destroy');

        // La pièce probante. Le téléchargement est ouvert aux deux côtés — le
        // CGC contrôle sur pièce (WF5) —, le dépôt au seul consignataire.
        Route::get('dossiers/{escale}/manifeste/piece', [ManifestePieceController::class, 'show'])
            ->name('dossiers.manifeste.piece');
        Route::post('dossiers/{escale}/manifeste/piece', [ManifestePieceController::class, 'store'])
            ->name('dossiers.manifeste.piece.store');
        Route::delete('dossiers/{escale}/manifeste/piece', [ManifestePieceController::class, 'destroy'])
            ->name('dossiers.manifeste.piece.destroy');

        // Reprendre le manifeste à zéro, tant qu'il n'est pas parti (WF4).
        Route::delete('dossiers/{escale}/manifeste', [ManifesteEscaleController::class, 'destroy'])
            ->name('dossiers.manifeste.destroy');

        // La transmission au CGC : sans retour, et sous quatre verrous dont un
        // ne dépend pas du consignataire (ADR-0009/0013).
        Route::post('dossiers/{escale}/manifeste/transmission', [ManifesteTransmissionController::class, 'store'])
            ->name('dossiers.manifeste.transmission');
    });

    Route::inertia('devis', 'activite/devis')
        ->middleware('can:'.Permission::DevisConsulter->value)
        ->name('devis');

    // Sa propre fiche. Aucune permission : tout compte connecté y a droit, et
    // le compte connecté est à lui seul le périmètre — il n'y a pas
    // d'identifiant dans l'URL. Le changement de mot de passe y est limité en
    // fréquence : c'est le seul endroit du portail où l'on peut essayer un
    // secret à l'aveugle depuis une session déjà ouverte.
    Route::get('profil', [ProfilController::class, 'index'])->name('profil');
    Route::patch('profil', [ProfilController::class, 'update'])->name('profil.update');
    Route::put('profil/mot-de-passe', [ProfilController::class, 'motDePasse'])
        ->middleware('throttle:6,1')
        ->name('profil.mot-de-passe');

    // L'espace d'administration de sa propre société (lot 2). La permission
    // ouvre la porte ; c'est le controller qui borne ce qu'on voit derrière —
    // la société se déduit du compte, jamais de l'URL.
    Route::get('mon-espace', [MonEspaceController::class, 'index'])
        ->middleware('can:'.Permission::MesAgentsGerer->value)
        ->name('mon-espace');

    // Les écritures de cet espace. La société crée et suspend ses agents, le
    // CGC les valide (ADR-0013) : d'où un CRUD ici et des routes de décision
    // là-bas. La suppression n'existe que pour une demande jamais examinée.
    Route::prefix('mon-espace')
        ->name('mon-espace.')
        ->middleware('can:'.Permission::MesAgentsGerer->value)
        ->group(function () {
            Route::post('agents', [MonEspaceAgentController::class, 'store'])->name('agents.store');
            Route::patch('agents/{agent}', [MonEspaceAgentController::class, 'update'])->name('agents.update');
            Route::patch('agents/{agent}/activation', [MonEspaceAgentController::class, 'toggleActive'])->name('agents.activation');
            Route::patch('agents/{agent}/soumission', [MonEspaceAgentController::class, 'resoumettre'])->name('agents.soumission');
            Route::delete('agents/{agent}', [MonEspaceAgentController::class, 'destroy'])->name('agents.destroy');

            // Une case de la matrice d'affectation : les deux identifiants sont
            // dans l'URL, et tous deux sont vérifiés contre la société (ADR-0009).
            Route::patch('affectations/{agent}/{armement}', [MonEspaceAffectationController::class, 'toggle'])
                ->name('affectations.toggle');
        });

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
            // (ADR-0031). Le CGC continue de voir qui opère sur quoi — c'est
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
