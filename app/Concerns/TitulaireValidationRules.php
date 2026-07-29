<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

/**
 * Règles du compte titulaire saisi depuis la fiche société consignataire
 * (ADR-0010 : c'est le CGC qui ouvre les comptes maîtres).
 *
 * Le bloc est **facultatif** — la fiche société peut exister avant que son
 * titulaire ne soit désigné — mais dès qu'une adresse e-mail est saisie, elle
 * engage la création d'un vrai compte : le nom et le prénom deviennent
 * obligatoires.
 *
 * Aucun mot de passe n'est saisi ici : le titulaire définit le sien depuis le
 * lien qu'il reçoit par courriel, et le CGC n'en connaît jamais la valeur.
 */
trait TitulaireValidationRules
{
    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function titulaireRules(?User $titulaire): array
    {
        return [
            'titulaire_email' => [
                'nullable',
                'string',
                'email',
                'max:255',
                $titulaire === null
                    ? Rule::unique(User::class, 'email')
                    : Rule::unique(User::class, 'email')->ignore($titulaire->id),
            ],
            'titulaire_first_name' => ['nullable', 'required_with:titulaire_email', 'string', 'max:255'],
            'titulaire_last_name' => ['nullable', 'required_with:titulaire_email', 'string', 'max:255'],
            'titulaire_phone' => ['nullable', 'string', 'max:30'],
            'titulaire_job_title' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function titulaireAttributes(): array
    {
        return [
            'titulaire_first_name' => 'prénom du titulaire',
            'titulaire_last_name' => 'nom du titulaire',
            'titulaire_email' => 'e-mail du titulaire',
            'titulaire_phone' => 'téléphone du titulaire',
            'titulaire_job_title' => 'fonction du titulaire',
        ];
    }

    /**
     * Champs facultatifs du bloc titulaire ramenés à null quand le formulaire
     * les laisse vides — on ne crée jamais un compte sur une chaîne vide.
     *
     * @return array<string, string|null>
     */
    protected function titulaireNormalise(): array
    {
        $champs = ['titulaire_first_name', 'titulaire_last_name', 'titulaire_email', 'titulaire_phone', 'titulaire_job_title'];

        return collect($champs)
            ->mapWithKeys(function (string $champ): array {
                $valeur = trim((string) $this->input($champ));

                return [$champ => $valeur === '' ? null : $valeur];
            })
            ->all();
    }
}
