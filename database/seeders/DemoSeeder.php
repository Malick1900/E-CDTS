<?php

namespace Database\Seeders;

use App\Enums\ModeExploitation;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\TypeNavire;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Jeu d'exemple pour le développement : quelques armements et leurs navires.
 *
 * ⚠ Ce ne sont PAS des données maîtres. Les armements et les navires sont la
 * donnée du client, saisie depuis l'UI ; ce seeder n'existe que pour qu'un
 * environnement fraîchement monté ne présente pas des écrans vides. Il est
 * appelé depuis `DatabaseSeeder`, aux côtés du compte de développement, et n'a
 * pas sa place dans un déploiement réel.
 *
 * Idempotent : `updateOrCreate` sur un identifiant naturel (nom de l'armement,
 * numéro IMO du navire).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $pays = Pays::pluck('id', 'code');
        $types = TypeNavire::pluck('id', 'code');

        // [nom, sigle, pays d'origine, pays d'immatriculation, gérant]
        $armements = [
            ['Maersk Line', 'MSK', 'DK', 'DK', 'Vincent Clerc'],
            ['CMA CGM', 'CMA', 'FR', 'FR', 'Rodolphe Saadé'],
            ['Mediterranean Shipping Company', 'MSC', 'CH', 'CH', 'Soren Toft'],
            ['Pacific International Lines', 'PIL', 'SG', 'SG', 'Lars Kastrup'],
        ];

        foreach ($armements as [$name, $sigle, $origine, $immatriculation, $gerant]) {
            Armement::updateOrCreate(['name' => $name], [
                'sigle' => $sigle,
                'pays_origine_id' => $pays[$origine] ?? null,
                'pays_immatriculation_id' => $pays[$immatriculation] ?? null,
                'gerant' => $gerant,
                'actif' => true,
            ]);
        }

        $sigles = Armement::pluck('id', 'sigle');

        // [nom, IMO, type, armement, pavillon, mode d'exploitation par défaut]
        //
        // Le mode porté ici n'est qu'un DÉFAUT : il sera recopié sur l'escale à
        // sa création, et c'est l'escale qui fait foi pour la facturation.
        $navires = [
            ['Maersk Cadiz', '9525234', 'PC', 'MSK', 'DK', ModeExploitation::LigneReguliere],
            ['Maersk Nuku', '9631401', 'RORO', 'MSK', 'LR', ModeExploitation::LigneReguliere],
            ['CMA CGM Congo', '9764285', 'PC', 'CMA', 'MT', ModeExploitation::LigneReguliere],
            ['Cap San Owendo', '9702631', 'FRIG', 'CMA', 'PA', ModeExploitation::Tramping],
            ['MSC Bilbao', '9304596', 'PC', 'MSC', 'PA', ModeExploitation::LigneReguliere],
            ['Nordic Okume', '9412367', 'GRUM', 'PIL', 'MH', ModeExploitation::Tramping],
            ['Pacific Ozouri', '9188025', 'GRUM', 'PIL', 'LR', ModeExploitation::Tramping],
        ];

        foreach ($navires as [$name, $imo, $type, $armement, $pavillon, $mode]) {
            Navire::updateOrCreate(['imo' => $imo], [
                'name' => $name,
                'type_navire_id' => $types[$type] ?? null,
                'armement_id' => $sigles[$armement] ?? null,
                'pays_id' => $pays[$pavillon] ?? null,
                'mode_exploitation_defaut' => $mode,
                'actif' => true,
            ]);
        }

        $this->consignataires($pays, $sigles);
    }

    /**
     * Sociétés consignataires et leurs deux rattachements N-N (ADR-0014). Le
     * titulaire est désigné parmi les agents de la société : c'est un déclarant
     * comme les autres, qui gère en plus les comptes de sa société.
     *
     * @param  Collection<string, int>  $pays  identifiants de pays par code ISO
     * @param  Collection<string, int>  $sigles  identifiants d'armement par sigle
     */
    private function consignataires(Collection $pays, Collection $sigles): void
    {
        $ports = Port::pluck('id', 'code');

        // [raison sociale, sigle, RCCM, e-mail, armements représentés, ports]
        $societes = [
            ['SAGA Gabon', 'SAGA', 'RCCM LBV 2014 B 00612', 'consignation@saga-gabon.ga', ['CMA', 'MSK'], ['GAOWE', 'GAPOG']],
            ['SDV Gabon', 'SDV', 'RCCM LBV 2016 B 04821', 'contact@sdv-gabon.ga', ['CMA', 'MSC', 'PIL'], ['GAOWE']],
            ['OMA Gabon', 'OMA', 'RCCM LBV 2018 B 07204', 'agence@oma-gabon.ga', ['MSC'], ['GAOWE']],
            ['Getma Gabon', 'GETMA', 'RCCM POG 2017 B 03158', 'contact@getma-gabon.ga', ['MSK', 'PIL'], ['GAPOG']],
        ];

        foreach ($societes as [$name, $sigle, $rccm, $email, $armements, $codesPorts]) {
            $consignataire = Consignataire::updateOrCreate(['name' => $name], [
                'sigle' => $sigle,
                'rccm_nif' => $rccm,
                'pays_immatriculation_id' => $pays['GA'] ?? null,
                'email' => $email,
                'actif' => true,
            ]);

            $consignataire->armements()->sync(collect($armements)->map(fn (string $s): ?int => $sigles[$s] ?? null)->filter()->all());
            $consignataire->ports()->sync(collect($codesPorts)->map(fn (string $c): ?int => $ports[$c] ?? null)->filter()->all());
        }

        $this->agents();
    }

    /**
     * Comptes agents dans les quatre états du circuit de validation (ADR-0013).
     * En attendant le portail consignataire — seul endroit où une société créera
     * ses agents — ce jeu alimente l'écran de validation du CGC.
     *
     * Un agent n'est affecté qu'à des armements de sa propre société : c'est la
     * règle que le contrôleur fait respecter, le seeder ne doit pas la violer.
     */
    private function agents(): void
    {
        $valideur = User::whereNull('consignataire_id')->orderBy('id')->first();

        // [société, prénom, nom, fonction, statut, sigles d'armements affectés]
        // Le premier agent validé de chaque société en devient le titulaire.
        $titulaires = ['SAGA Gabon' => 'Nadia Bongo', 'SDV Gabon' => 'Paul Ndong', 'OMA Gabon' => 'Rachel Nzé', 'Getma Gabon' => 'Hugues Ada'];

        $agents = [
            ['SAGA Gabon', 'Nadia', 'Bongo', 'Responsable escale', StatutValidation::Valide, ['CMA']],
            ['SAGA Gabon', 'Éric', 'Moussavou', 'Déclarant', StatutValidation::EnAttente, []],
            ['SDV Gabon', 'Paul', 'Ndong', 'Chef d\'agence', StatutValidation::Valide, ['CMA', 'MSC']],
            ['SDV Gabon', 'Sylvie', 'Ombila', 'Déclarante', StatutValidation::Valide, ['PIL']],
            ['SDV Gabon', 'Léon', 'Mbadinga', 'Agent de transit', StatutValidation::EnAttente, []],
            ['OMA Gabon', 'Rachel', 'Nzé', 'Responsable consignation', StatutValidation::Valide, ['MSC']],
            ['OMA Gabon', 'Franck', 'Boussougou', 'Déclarant', StatutValidation::Refuse, []],
            ['Getma Gabon', 'Hugues', 'Ada', 'Agent de transit', StatutValidation::Valide, ['MSK']],
            ['Getma Gabon', 'Prisca', 'Ndoumba', 'Déclarante', StatutValidation::EnAttente, []],
        ];

        $societes = Consignataire::pluck('id', 'name');
        $sigles = Armement::pluck('id', 'sigle');

        foreach ($agents as [$societe, $prenom, $nom, $fonction, $statut, $armements]) {
            $consignataireId = $societes[$societe] ?? null;

            if ($consignataireId === null) {
                continue;
            }

            // Un agent validé est actif ; en attente et refusé ne le sont pas —
            // `is_active` reste la seule vérité lue à la connexion.
            $valide = $statut === StatutValidation::Valide;
            $decide = $statut !== StatutValidation::EnAttente;

            $agent = User::updateOrCreate(
                ['email' => Str::slug($prenom.' '.$nom, '.').'@'.Str::slug($societe).'.ga'],
                [
                    'name' => $prenom.' '.$nom,
                    'first_name' => $prenom,
                    'last_name' => $nom,
                    'job_title' => $fonction,
                    'phone' => '+241 06 '.fake()->numerify('## ## ##'),
                    'password' => 'password',
                    'consignataire_id' => $consignataireId,
                    'statut_validation' => $statut,
                    'is_active' => $valide,
                    'valide_par_user_id' => $decide ? $valideur?->id : null,
                    'valide_le' => $decide ? now() : null,
                    'motif_refus' => $statut === StatutValidation::Refuse
                        ? 'Fonction déclarée non rattachée à la consignation ; demande à re-soumettre avec justificatif.'
                        : null,
                ]
            );

            $agent->armements()->sync(collect($armements)->map(fn (string $s): ?int => $sigles[$s] ?? null)->filter()->all());

            if (($titulaires[$societe] ?? null) === $agent->name) {
                Consignataire::whereKey($consignataireId)->update(['titulaire_user_id' => $agent->id]);
            }
        }
    }
}
