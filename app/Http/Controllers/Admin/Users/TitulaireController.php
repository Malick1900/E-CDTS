<?php

namespace App\Http\Controllers\Admin\Users;

use App\Enums\RoleClient;
use App\Enums\StatutValidation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Users\TitulaireRemplacementRequest;
use App\Models\Consignataire;
use App\Models\User;
use App\Notifications\CompteClientOuvert;
use App\Notifications\TitulaireDesigne;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Transfert de la fonction de titulaire d'une société (ADR-0027).
 *
 * Geste distinct de la modification de la fiche : là on corrige l'identité
 * d'une personne, ici on confie à quelqu'un d'autre la capacité de créer les
 * comptes de la société. Confondre les deux ferait porter l'historique du
 * sortant au nouvel arrivant.
 *
 * L'ancien titulaire **reste agent déclarant** : il perd la gestion des
 * comptes, pas son accès ni ses affectations. Le désactiver, s'il quitte la
 * société, est un autre geste — celui de l'onglet Agents.
 *
 * Action sensible : à inscrire au journal d'audit quand le module existera.
 */
class TitulaireController extends Controller
{
    public function update(TitulaireRemplacementRequest $request, Consignataire $consignataire): RedirectResponse
    {
        $data = $request->validated();
        $sortant = $consignataire->titulaire;

        $entrant = DB::transaction(function () use ($request, $consignataire, $data, $sortant): User {
            $entrant = isset($data['agent_id'])
                ? User::findOrFail((int) $data['agent_id'])
                : $this->ouvrirCompte($request, $consignataire, $data);

            $consignataire->titulaire()->associate($entrant)->save();

            // Le rôle suit la fonction, dans les deux sens : l'entrant la prend,
            // le sortant redevient agent déclarant — il perd la gestion des
            // comptes, pas son accès (ADR-0027, ADR-0031). Le sortant d'abord :
            // rien n'interdit de redésigner le titulaire en place, et l'ordre
            // inverse le rétrograderait alors qu'il vient d'être confirmé.
            $sortant?->syncRoles([RoleClient::Agent->value]);
            $entrant->syncRoles([RoleClient::Titulaire->value]);

            return $entrant;
        });

        $nouveauCompte = ! isset($data['agent_id']);

        DB::afterCommit(fn () => $nouveauCompte
            ? $entrant->notify(new CompteClientOuvert($consignataire))
            : $entrant->notify(new TitulaireDesigne($consignataire)));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $sortant === null
                ? __('Titulaire désigné.')
                : __(':sortant n\'est plus titulaire ; :entrant prend la fonction.', ['sortant' => $sortant->name, 'entrant' => $entrant->name]),
        ]);

        return to_route('admin.utilisateurs.index');
    }

    /**
     * Le remplaçant n'a pas encore de compte : on l'ouvre comme le ferait la
     * fiche société — validé d'emblée, avec un secret jetable que seul le lien
     * envoyé par courriel permettra de remplacer.
     *
     * @param  array<string, mixed>  $data
     */
    private function ouvrirCompte(TitulaireRemplacementRequest $request, Consignataire $consignataire, array $data): User
    {
        return User::create([
            'name' => trim($data['titulaire_first_name'].' '.$data['titulaire_last_name']),
            'first_name' => $data['titulaire_first_name'],
            'last_name' => $data['titulaire_last_name'],
            'email' => $data['titulaire_email'],
            'phone' => $data['titulaire_phone'] ?? null,
            'job_title' => $data['titulaire_job_title'] ?? null,
            'password' => Str::password(32),
            'consignataire_id' => $consignataire->id,
            'statut_validation' => StatutValidation::Valide,
            'is_active' => true,
            'valide_par_user_id' => $request->user()?->id,
            'valide_le' => now(),
        ]);
    }
}
