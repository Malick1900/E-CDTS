<?php

namespace App\Concerns;

use App\Models\Consignataire;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Le cloisonnement de l'espace consignataire, en un seul endroit.
 *
 * Deux sociétés concurrentes cohabitent dans les mêmes tables. Tout ce qu'un
 * titulaire lit ou écrit doit donc être rapporté à *sa* société — et cette
 * société ne se lit jamais dans la requête, elle se déduit du compte connecté.
 * Il n'y a ainsi aucun identifiant à falsifier.
 */
trait BorneASaSociete
{
    /**
     * La société dont le compte connecté est titulaire.
     *
     * La permission `mes-agents.gerer` dit « ce compte sait gérer des agents »,
     * pas « ce compte a une société » : après un transfert de titularité
     * (ADR-0027), un compte peut porter l'une sans l'autre le temps que son rôle
     * soit ajusté. Sans cette garde, l'écran s'effondrerait sur une valeur nulle
     * au lieu de refuser proprement.
     */
    protected function societe(Request $request): Consignataire
    {
        $societe = $request->user()?->consignataireTitulaire;

        abort_if($societe === null, Response::HTTP_FORBIDDEN, "Ce compte n'est titulaire d'aucune société.");

        return $societe;
    }

    /**
     * Cet agent relève-t-il bien de la société du titulaire ?
     *
     * Introuvable plutôt qu'interdit : répondre « interdit » sur le compte d'un
     * concurrent confirmerait son existence, et un identifiant qui existe se
     * balaie. Le titulaire n'a aucun moyen de distinguer un agent d'autrui d'un
     * agent qui n'existe pas.
     */
    protected function garantirMonAgent(Consignataire $societe, User $agent): void
    {
        abort_unless($agent->consignataire_id === $societe->id, Response::HTTP_NOT_FOUND);
    }
}
