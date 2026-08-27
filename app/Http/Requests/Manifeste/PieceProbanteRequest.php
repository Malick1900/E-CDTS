<?php

namespace App\Http\Requests\Manifeste;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Joindre le manifeste PDF à une saisie manuelle (WF4).
 *
 * Ce n'est pas un agrément : le PDF **vaut preuve de ce qui a été saisi**.
 * L'agent CGC le télécharge et rejoue le même travail ligne par ligne pour
 * vérifier la conformité de la saisie à la pièce (WF5). D'où un seul fichier
 * par manifeste — multi-pages, naturellement —, qui reste attaché au dossier
 * définitivement, y compris après clôture.
 */
class PieceProbanteRequest extends FormRequest
{
    /** Le consignataire dépose sa pièce ; le CGC la consulte (ADR-0007). */
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
            'fichier' => ['required', 'file', 'extensions:pdf', 'mimetypes:application/pdf', 'max:24576'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'fichier.required' => __('Aucun fichier n’a été déposé.'),
            'fichier.extensions' => __('La pièce probante doit être un fichier PDF.'),
            'fichier.mimetypes' => __('La pièce probante doit être un fichier PDF.'),
            'fichier.max' => __('Le fichier dépasse la taille acceptée (24 Mo).'),
        ];
    }
}
