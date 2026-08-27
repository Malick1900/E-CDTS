<?php

namespace App\Http\Requests\Manifeste;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Déposer un manifeste XML AWMDS sur un dossier (WF4).
 *
 * Rien n'est demandé au consignataire que le fichier : le **numéro n'est pas
 * saisi** — e-CDTS l'attribue au dépôt (ADR-0046) —, et la correspondance au
 * dossier se vérifie dans le fichier lui-même, sur le navire et le voyage, pas
 * en la faisant retaper.
 */
class ImportXmlRequest extends FormRequest
{
    /** Un manifeste n'entre que par son consignataire (ADR-0007). */
    public function authorize(): bool
    {
        return $this->user()?->consignataire_id !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // 24 Mo : le plus gros manifeste de référence — 500 BL, 322 boîtes —
            // pèse quelques mégaoctets, avec de la marge pour les profils bavards.
            'fichier' => ['required', 'file', 'extensions:xml', 'max:24576'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'fichier.required' => __('Aucun fichier n’a été déposé.'),
            'fichier.extensions' => __('Le manifeste doit être un fichier XML.'),
            'fichier.max' => __('Le fichier dépasse la taille acceptée (24 Mo).'),
        ];
    }
}
