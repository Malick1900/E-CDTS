<?php

namespace App\Http\Requests\DossierEscale;

use App\Enums\SensTrafic;
use App\Models\Escale;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * L'ouverture d'un dossier d'escale (WF3).
 *
 * Quatre champs suffisent à ouvrir : le sens, le navire, le voyage et le port.
 * Tout le reste — n° de manifeste, cargaison, montants — arrive plus tard dans
 * le circuit. Un dossier s'ouvre souvent avant que le navire n'arrive, parfois
 * avant qu'il ne soit annoncé à la conférence portuaire.
 *
 * Le consignataire n'est pas dans la requête : il se déduit du compte connecté.
 * L'accepter du client laisserait une société déclarer au nom d'une autre.
 */
class EscaleStoreRequest extends FormRequest
{
    /**
     * Ouvrir suppose une société au nom de laquelle déclarer (ADR-0014). Ce
     * n'est pas une permission mais une condition d'existence : un interne CGC
     * n'a personne à qui attribuer le dossier — il instruit, il n'ouvre pas.
     */
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
            'sens' => ['required', Rule::enum(SensTrafic::class)],
            // Le navire vient du référentiel du CGC, jamais d'une saisie libre
            // (WF3, Q10 option A) : c'est ce qui rend le rapprochement possible.
            'navire_id' => ['required', Rule::exists('navires', 'id')->where('actif', true)],
            'armement_id' => ['nullable', Rule::exists('armements', 'id')->where('actif', true)],
            'voyage' => ['required', 'string', 'max:40'],
            'port_id' => ['required', Rule::exists('ports', 'id')->where('actif', true)],
            // Le poste est borné par le port : un quai d'Owendo n'existe pas à
            // Port-Gentil.
            'poste_quai_id' => [
                'nullable',
                Rule::exists('postes_quai', 'id')
                    ->where('actif', true)
                    ->where('port_id', $this->integer('port_id')),
            ],
            'eta_prevue' => ['nullable', 'date'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'voyage' => trim((string) $this->input('voyage')),
        ]);
    }

    /**
     * Le contrôle d'incohérence de l'écran : un même passage ne s'ouvre pas
     * deux fois dans le même sens (WF3).
     *
     * La contrainte d'unicité en base dit déjà non, mais elle le dit par une
     * exception SQL. Ici on nomme le dossier fautif — c'est cette information
     * que le consignataire cherche : il a probablement déjà ouvert celui-là.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var User $user */
                $user = $this->user();

                $existant = Escale::query()
                    ->where('consignataire_id', $user->consignataire_id)
                    ->where('navire_id', $this->integer('navire_id'))
                    ->where('voyage_normalise', Escale::normaliserVoyage($this->string('voyage')->toString()))
                    ->where('sens', $this->string('sens')->toString())
                    ->first();

                if ($existant === null) {
                    return;
                }

                $validator->errors()->add('voyage', __(
                    'Un dossier existe déjà pour ce voyage dans ce sens : :numero, ouvert le :date.',
                    [
                        'numero' => $existant->libelle(),
                        'date' => $existant->ouvert_le->format('d/m/Y'),
                    ],
                ));
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'sens' => 'sens du dossier',
            'navire_id' => 'navire',
            'armement_id' => 'armement',
            'voyage' => 'n° de voyage',
            'port_id' => 'port',
            'poste_quai_id' => 'poste à quai',
            'eta_prevue' => 'date prévisionnelle',
        ];
    }
}
