<?php

namespace App\Http\Requests\Manifeste;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Saisir ou corriger un connaissement à la main (WF4).
 *
 * **La saisie se fait au connaissement, pas à la ligne du tableau** — même si
 * le tableau, lui, s'affiche à plat. Poids, volume et colis appartiennent au BL
 * et n'existent nulle part ailleurs : les demander par boîte obligerait à
 * choisir laquelle des trois boîtes d'un BL porte le tonnage, donc à inventer
 * une répartition que le manifeste papier ne donne pas (MANIFESTE-XML.md,
 * première règle de totaux).
 *
 * Un BL doit produire au moins une ligne de tableau : soit une boîte, soit une
 * part hors conteneur. Un connaissement qui n'aurait ni l'une ni l'autre ne se
 * facturerait sur rien.
 */
class ConnaissementRequest extends FormRequest
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
            'reference' => ['required', 'string', 'max:64'],
            'master_reference' => ['nullable', 'string', 'max:64'],

            // Les ports RÉELS du connaissement — transbordement compris —,
            // distincts du port gabonais que porte le dossier.
            'port_chargement' => ['nullable', 'string', 'max:8'],
            'port_chargement_nom' => ['nullable', 'string', 'max:255'],
            'port_dechargement' => ['nullable', 'string', 'max:8'],
            'port_dechargement_nom' => ['nullable', 'string', 'max:255'],

            'expediteur' => ['nullable', 'string', 'max:255'],
            'destinataire' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],

            // Les trois assiettes. Nulles quand le manifeste ne les donne pas —
            // et une assiette absente n'est pas une assiette à zéro : la ligne
            // restera à qualifier plutôt que facturée sur du vide.
            'poids_brut_kg' => ['nullable', 'integer', 'min:0', 'max:99999999999'],
            'volume_m3' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'colis' => ['nullable', 'integer', 'min:0', 'max:999999'],

            'hors_conteneur' => ['boolean'],

            'conteneurs' => ['array', 'max:500'],
            'conteneurs.*.reference' => ['required', 'string', 'max:24'],
            'conteneurs.*.taille' => ['nullable', 'integer', 'in:20,40,45'],
            'conteneurs.*.colis' => ['nullable', 'integer', 'min:0', 'max:999999'],
            'conteneurs.*.tare_kg' => ['nullable', 'integer', 'min:0', 'max:999999'],
            'conteneurs.*.plein' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Un connaissement sans boîte ni part hors conteneur ne produit aucune
     * ligne : il n'y aurait rien à qualifier, donc rien à facturer.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $conteneurs = $this->input('conteneurs', []);

            if (is_array($conteneurs) && $conteneurs !== []) {
                return;
            }

            if ($this->boolean('hors_conteneur')) {
                return;
            }

            $validator->errors()->add(
                'conteneurs',
                __('Déclarez au moins un conteneur, ou cochez la marchandise hors conteneur.'),
            );
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reference.required' => __('Le n° de connaissement est requis.'),
            'conteneurs.*.reference.required' => __('Chaque conteneur doit porter son numéro.'),
            'conteneurs.*.taille.in' => __('Le barème ne connaît que les conteneurs de 20, 40 et 45 pieds.'),
        ];
    }
}
