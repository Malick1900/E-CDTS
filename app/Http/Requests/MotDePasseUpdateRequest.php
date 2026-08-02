<?php

namespace App\Http\Requests;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Changement de mot de passe depuis l'écran Profil.
 *
 * Le mot de passe actuel est exigé même si la session est déjà ouverte : une
 * session laissée sans surveillance ne doit pas suffire à s'emparer du compte.
 * C'est la même exigence que celle du lien personnel d'ADR-0035, vue de
 * l'intérieur.
 */
class MotDePasseUpdateRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => $this->currentPasswordRules(),
            'password' => $this->passwordRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.current_password' => __('Le mot de passe actuel est incorrect.'),
        ];
    }
}
