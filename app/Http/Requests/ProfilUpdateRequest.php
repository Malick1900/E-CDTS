<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Ce qu'un compte corrige lui-même sur sa propre fiche : son état civil et son
 * numéro d'appel.
 *
 * Trois champs et pas un de plus. L'adresse de connexion désigne la personne à
 * qui l'accès a été ouvert et le rôle dit ce qu'elle peut faire : tous deux
 * relèvent de qui a instruit le compte — le CGC pour un interne, le CGC après
 * examen pour un agent (ADR-0013). Les laisser ici reviendrait à laisser un
 * compte se déplacer vers quelqu'un d'autre sans que personne ne statue.
 */
class ProfilUpdateRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            // Exigé, et non facultatif : c'est par ce numéro que le CGC joint
            // la personne qui a déclaré, quand une escale bloque au port.
            'phone' => ['required', 'string', 'max:30'],
        ];
    }
}
