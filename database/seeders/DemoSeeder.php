<?php

namespace Database\Seeders;

use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Enums\StatutValidation;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\PosteQuai;
use App\Models\TypeNavire;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
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

            if ($titulaires[$societe] === $agent->name) {
                Consignataire::whereKey($consignataireId)->update(['titulaire_user_id' => $agent->id]);
            }
        }

        // Les rôles se déduisent de la position, donc après que les titulaires
        // sont désignés — d'où une passe finale plutôt qu'une pose dans la
        // boucle (ADR-0031).
        Artisan::call('clients:synchroniser-roles');

        $this->situationPortuaire();
    }

    /**
     * Une situation portuaire d'exemple : les six jalons représentés, sur les
     * deux ports, pour que la frise d'escale et le verrou de transmission se
     * lisent d'un coup d'œil sur un environnement neuf.
     *
     * Deux lignes restent en brouillon (`publiee_at` nul) : c'est l'état
     * courant d'une conférence en cours de saisie, et ce qui alimente le
     * compteur « modifications non publiées » de l'écran.
     */
    private function situationPortuaire(): void
    {
        $ports = Port::pluck('id', 'code');
        $navires = Navire::pluck('id', 'name');
        $societes = Consignataire::pluck('id', 'name');
        $postes = PosteQuai::get()->groupBy('port_id')->map(fn (Collection $groupe): Collection => $groupe->pluck('id', 'code'));

        // [port, navire, voyage, sens, statut, poste, ETA, ETD, consignataire, publiée]
        $lignes = [
            ['GAOWE', 'Maersk Cadiz', '26-114S', SensTrafic::Import, StatutNavire::Quai, 'M3', '-2 days 06:40', null, 'SAGA Gabon', true],
            ['GAOWE', 'Nordic Okume', '26-055', SensTrafic::Export, StatutNavire::ZoneExploitation, 'Bois', '-3 days 16:45', null, 'SDV Gabon', true],
            ['GAOWE', 'CMA CGM Congo', '26-118N', SensTrafic::Export, StatutNavire::HorsZone, 'M1', '-1 days 09:30', null, 'SAGA Gabon', true],
            ['GAOWE', 'MSC Bilbao', '26-120S', SensTrafic::Import, StatutNavire::Rade, null, '+1 days 14:00', null, 'OMA Gabon', true],
            ['GAOWE', 'Pacific Ozouri', '26-071', SensTrafic::Export, StatutNavire::Sorti, null, '-6 days 05:20', '-1 days 22:10', 'SDV Gabon', true],
            // Le brouillon du jour : saisi à la conférence, pas encore validé.
            ['GAOWE', 'Maersk Nuku', '44-08', SensTrafic::Import, StatutNavire::Attendu, null, '+3 days 08:00', null, 'Getma Gabon', false],
            ['GAPOG', 'Cap San Owendo', '26-014', SensTrafic::Export, StatutNavire::Quai, 'Quai Nord', '-1 days 02:00', null, 'Getma Gabon', true],
            ['GAPOG', 'Maersk Cadiz', '12-009', SensTrafic::Import, StatutNavire::Attendu, null, '+2 days 10:00', null, 'SAGA Gabon', false],
        ];

        foreach ($lignes as [$codePort, $navire, $voyage, $sens, $statut, $poste, $eta, $etd, $societe, $publiee]) {
            $portId = $ports[$codePort] ?? null;
            $navireId = $navires[$navire] ?? null;

            if ($portId === null || $navireId === null) {
                continue;
            }

            MouvementNavire::updateOrCreate(
                ['port_id' => $portId, 'navire_id' => $navireId, 'voyage' => $voyage],
                [
                    'sens' => $sens,
                    'statut' => $statut,
                    'poste_quai_id' => $poste === null ? null : ($postes[$portId][$poste] ?? null),
                    'eta' => now()->modify($eta),
                    'etd' => $etd === null ? null : now()->modify($etd),
                    'consignataire_id' => $societes[$societe] ?? null,
                    'publiee_at' => $publiee ? now()->setTime(11, 34) : null,
                ]
            );
        }
    }
}
