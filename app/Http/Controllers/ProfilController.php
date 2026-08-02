<?php

namespace App\Http\Controllers;

use App\Http\Requests\MotDePasseUpdateRequest;
use App\Http\Requests\ProfilUpdateRequest;
use App\Models\Armement;
use App\Models\User;
use App\Support\PolitiqueMotDePasse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sa propre fiche — le seul écran de la plateforme qui ne s'adresse qu'à une
 * personne, celle qui le regarde.
 *
 * Il n'y a donc aucun identifiant dans l'URL et aucune permission à la porte :
 * le compte connecté *est* le périmètre. Les trois routes lisent et écrivent
 * `$request->user()`, jamais autre chose ; il n'y a rien à falsifier.
 *
 * Ce que l'on peut y corriger est volontairement étroit — état civil et numéro
 * d'appel. L'adresse de connexion, le rôle et le rattachement à une société
 * disent qui a ouvert ce compte et pour quoi faire ; ils relèvent de qui l'a
 * instruit (ADR-0013). Mais tout cela s'*affiche* : ne pas pouvoir écrire une
 * mention n'est pas une raison de la cacher à celui qu'elle décrit.
 */
class ProfilController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $this->moi($request);

        return Inertia::render('activite/profil', [
            'profil' => $this->fiche($user),
            // Les exigences de mot de passe telles que la validation les
            // applique réellement : l'écran les coche au fil de la saisie.
            'criteres' => PolitiqueMotDePasse::criteres(),
        ]);
    }

    /**
     * Correction de son état civil. Le nom affiché partout ailleurs sur la
     * plateforme se recompose ici : il n'a pas de saisie propre, sans quoi la
     * signature d'une déclaration finirait par désigner quelqu'un d'autre que
     * la fiche.
     */
    public function update(ProfilUpdateRequest $request): RedirectResponse
    {
        $donnees = $request->validated();
        $donnees['name'] = trim($donnees['first_name'].' '.$donnees['last_name']);

        $this->moi($request)->update($donnees);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Vos informations personnelles sont à jour.'),
        ]);

        return to_route('profil');
    }

    /**
     * Changement de mot de passe. La session en cours n'est pas invalidée : la
     * personne reste connectée sur l'appareil où elle vient de prouver qu'elle
     * connaissait l'ancien secret — et l'écran le lui dit.
     */
    public function motDePasse(MotDePasseUpdateRequest $request): RedirectResponse
    {
        // `password_changed_at` n'est pas renseignée ici : le modèle horodate
        // tout changement, d'où qu'il vienne (User::booted).
        $this->moi($request)->update(['password' => $request->validated('password')]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Mot de passe modifié — vous restez connecté sur cet appareil.'),
        ]);

        return to_route('profil');
    }

    /**
     * Le compte connecté. La route est sous `auth` : cette garde n'existe que
     * pour que l'analyse statique n'ait pas à supposer.
     */
    private function moi(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, Response::HTTP_FORBIDDEN);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function fiche(User $user): array
    {
        $societe = $user->consignataire;

        return [
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'job_title' => $user->job_title,
            // Le rôle tel qu'il est stocké : « Consignataire titulaire »,
            // « Superviseur »… La distinction client / interne colore la
            // pastille et nomme l'organisation de rattachement.
            'role' => $user->getRoleNames()->first(),
            'client' => $societe !== null,
            'organisation' => $societe->name ?? 'Conseil Gabonais des Chargeurs',
            'cree_le' => $user->created_at?->toIso8601String(),
            'derniere_connexion' => $user->last_login_at?->toIso8601String(),
            'mot_de_passe_modifie_le' => $user->password_changed_at?->toIso8601String(),
            // La portée d'un compte client (ADR-0009). Un agent n'a aucun autre
            // endroit où la lire : la matrice d'affectation appartient à son
            // titulaire. Sans cela, il découvrirait ce sur quoi il n'a pas le
            // droit de déclarer au moment d'être refusé.
            'armements' => $societe === null ? null : $user->armements()
                ->orderBy('name')
                ->get()
                ->map(fn (Armement $armement): array => [
                    'id' => $armement->id,
                    'name' => $armement->name,
                    'sigle' => $armement->sigle,
                ])
                ->all(),
        ];
    }
}
