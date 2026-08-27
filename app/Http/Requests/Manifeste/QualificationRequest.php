<?php

namespace App\Http\Requests\Manifeste;

use App\Enums\TypeMarchandise;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Dire ce qu'est une ligne de manifeste (WF4).
 *
 * C'est le geste central de l'écran, et c'est celui du CONSIGNATAIRE : il
 * classifie lui-même ses marchandises à la déclaration, le CGC valide ou
 * réfute ensuite (ADR-0007). Un interne CGC n'a rien à écrire ici — sa
 * requalification appartient au dépouillement, avec sa propre trace.
 *
 * La clé désigne la ligne du tableau, pas un enregistrement : « c:12 » pour un
 * conteneur, « v:34 » pour la part hors conteneur d'un connaissement. Les deux
 * mailles cohabitent dans un même tableau plat, et l'URL n'a pas à choisir
 * laquelle des deux tables est visée.
 */
class QualificationRequest extends FormRequest
{
    /** Le consignataire déclare ; l'interne CGC instruit ailleurs (ADR-0007). */
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
            'cle' => ['required', 'string', 'regex:/^[cv]:[1-9][0-9]*$/'],
            // Null est une valeur : c'est ainsi qu'on remet une ligne « à
            // qualifier » après s'être trompé, tant que le manifeste est en
            // brouillon.
            'type' => ['present', 'nullable', Rule::enum(TypeMarchandise::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cle.regex' => __('Ligne de manifeste inconnue.'),
        ];
    }
}
