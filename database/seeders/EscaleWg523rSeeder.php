<?php

namespace Database\Seeders;

use App\Enums\EtapeDossier;
use App\Enums\ModeExploitation;
use App\Enums\SensTrafic;
use App\Enums\StatutNavire;
use App\Models\Armement;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Pays;
use App\Models\Port;
use App\Models\TypeNavire;
use Carbon\CarbonImmutable;
use Database\Seeders\Concerns\PoseLeConsignataireMsc;
use Illuminate\Database\Seeder;

/**
 * Le décor d'accueil du manifeste réel `WG523R_1526000635920250707.xml`.
 *
 * Déposer un manifeste suppose un dossier qui l'attend : le fichier ne crée ni
 * navire, ni escale, ni société — il se compare à eux. Ce seeder pose donc
 * exactement ce que `LitUnManifesteAwmds` ira vérifier, et rien de plus :
 *
 * - le **navire** `MSC LIPSIA III` et le **voyage** `WG523R`, les deux seules
 *   données qui font refuser le fichier quand elles divergent ;
 * - le **sens export**, que les 78 `Bol_nature` à « 22 » imposent ;
 * - la **situation portuaire** du passage, dont l'accostage répond au
 *   `Date_of_arrival` du fichier et dont la sortie publiée ouvrira le verrou de
 *   transmission (ADR-0009).
 *
 * Ce qui n'est pas dans le fichier n'est pas inventé. Le n° OMI reste nul :
 * `Registration_number_of_transport_code` porte « 5LCQ4 », un indicatif
 * d'appel, et le parseur ne compare que ce qui EST un OMI.
 *
 * Rejouable : tout passe par la clé naturelle de chaque entité.
 */
final class EscaleWg523rSeeder extends Seeder
{
    use PoseLeConsignataireMsc;

    /** Le passage, tel que le `General_segment` du fichier le décrit. */
    private const VOYAGE = 'WG523R';

    private const NAVIRE = 'MSC LIPSIA III';

    /** `Date_of_arrival` + `Time_of_arrival` — l'accostage réel. */
    private const ARRIVEE = '2025-06-10 14:08:00';

    /** `Date_of_departure`, qui vaut ici `Date_of_last_discharge`. */
    private const DEPART = '2025-06-13 00:00:00';

    public function run(): void
    {
        $port = Port::query()->where('code', 'GAOWE')->firstOrFail();

        $societe = $this->consignataireMsc($port);
        $navire = $this->navire();
        $this->situationPortuaire($port, $navire, $societe);
        $dossier = $this->dossier($port, $navire, $societe);

        $this->command->info("Dossier {$dossier->reference} ouvert — ".self::NAVIRE.' · '.self::VOYAGE.' · export.');
    }

    /**
     * Le navire du manifeste.
     *
     * Le pavillon suit `Nationality_of_transporter_code` — « LR », le Libéria —
     * pour que la fiche et le fichier s'accordent. Le type se lit du contenu :
     * 212 boîtes sur 78 connaissements ne se portent qu'en porte-conteneurs.
     */
    private function navire(): Navire
    {
        return Navire::updateOrCreate(['name' => self::NAVIRE], [
            'imo' => null,
            'pays_id' => Pays::query()->where('code', 'LR')->value('id'),
            'type_navire_id' => TypeNavire::query()->where('name', 'Porte-conteneurs')->value('id'),
            'armement_id' => Armement::query()->where('sigle', 'MSC')->value('id'),
            'mode_exploitation_defaut' => ModeExploitation::LigneReguliere->value,
            'actif' => true,
        ]);
    }

    /**
     * La ligne de situation portuaire du passage.
     *
     * Elle est **sortie et publiée** : c'est le jalon qu'un dossier export
     * attend pour transmettre (`StatutNavire::jalonDeVerrou`). Sans elle, le
     * manifeste s'importerait mais resterait bloqué à la transmission.
     */
    private function situationPortuaire(Port $port, Navire $navire, Consignataire $societe): void
    {
        MouvementNavire::updateOrCreate(
            ['port_id' => $port->id, 'navire_id' => $navire->id, 'voyage' => self::VOYAGE],
            [
                'sens' => SensTrafic::Export,
                'statut' => StatutNavire::Sorti,
                'poste_quai_id' => null,
                'eta' => CarbonImmutable::parse(self::ARRIVEE),
                'etd' => CarbonImmutable::parse(self::DEPART),
                'consignataire_id' => $societe->id,
                'publiee_at' => now(),
            ],
        );
    }

    /**
     * Le dossier d'accueil, ouvert et vide — prêt à recevoir le fichier.
     *
     * Il naît après la situation portuaire pour que le crochet `created` le
     * rapproche seul de sa ligne (ADR-0042) : c'est de là qu'il tiendra
     * l'accostage auquel le fichier sera confronté.
     */
    private function dossier(Port $port, Navire $navire, Consignataire $societe): Escale
    {
        $existant = Escale::query()
            ->where('consignataire_id', $societe->id)
            ->where('navire_id', $navire->id)
            ->where('voyage_normalise', Escale::normaliserVoyage(self::VOYAGE))
            ->where('sens', SensTrafic::Export)
            ->first();

        if ($existant !== null) {
            return $existant;
        }

        $escale = new Escale([
            'consignataire_id' => $societe->id,
            'navire_id' => $navire->id,
            'armement_id' => $navire->armement_id,
            'voyage' => self::VOYAGE,
            'sens' => SensTrafic::Export,
            'port_id' => $port->id,
            'eta_prevue' => CarbonImmutable::parse(self::ARRIVEE),
        ]);

        $escale->ouvert_par = $societe->titulaire_user_id;
        $escale->etape = EtapeDossier::Ouvert;
        $escale->ouvert_le = now();
        $escale->reference = Escale::referenceSuivante($port);
        $escale->save();

        return $escale;
    }
}
