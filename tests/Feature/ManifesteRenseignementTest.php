<?php

namespace Tests\Feature;

use App\Enums\EtapeDossier;
use App\Enums\EtatManifeste;
use App\Enums\ModeSaisieManifeste;
use App\Enums\Profil;
use App\Enums\RoleClient;
use App\Enums\SensTrafic;
use App\Enums\TypeMarchandise;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\Manifeste;
use App\Models\ManifesteBl;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\BaremeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Renseigner puis transmettre un manifeste (WF4, phases 4 à 6).
 *
 * Ce que ces tests protègent :
 *
 * 1. **le figement du libellé** — au premier rattachement, le n° de manifeste
 *    devient celui du dossier et ne bouge plus (ADR-0008). Le laisser suivre un
 *    redépôt ferait changer de nom un dossier qui a déjà circulé ;
 * 2. **la pièce probante** — elle vaut preuve de ce qui a été déclaré, et le
 *    CGC rejoue le dépouillement dessus (WF5). Sans elle, la saisie manuelle
 *    n'est opposable à personne ;
 * 3. **les quatre verrous de la transmission**, dont un ne dépend pas du
 *    consignataire : la situation portuaire doit avoir constaté le jalon de son
 *    sens sur une ligne PUBLIÉE (ADR-0009/0013) ;
 * 4. **le sens sans retour** — après transmission, plus rien ne bouge côté
 *    consignataire, sans quoi le dossier changerait sous les yeux de l'agent
 *    qui le dépouille ;
 * 5. **la maille de saisie** — on saisit un connaissement, jamais une ligne de
 *    tableau : poids et volume appartiennent au BL (MANIFESTE-XML.md).
 */
class ManifesteRenseignementTest extends TestCase
{
    use RefreshDatabase;

    private Port $port;

    private Consignataire $consignataire;

    private User $agent;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(BaremeSeeder::class);

        $this->port = Port::factory()->create([
            'code' => 'GAOWE',
            'name' => 'Owendo',
            'prefixe_numerotation' => 'OWD',
        ]);

        $this->consignataire = Consignataire::factory()->create();
        $this->agent = User::factory()->create([
            'consignataire_id' => $this->consignataire->id,
        ]);
        $this->agent->syncRoles([RoleClient::Agent->value]);
    }

    private function interne(Profil $profil): User
    {
        $user = User::factory()->create();
        $user->assignRole($profil->value);

        return $user;
    }

    /**
     * Un dossier ouvert. `$verrouOuvert` inscrit d'abord le navire à la
     * situation portuaire : le rapprochement se fait au crochet `created` de
     * l'escale, donc la ligne doit exister avant elle (ADR-0042).
     */
    private function dossier(
        SensTrafic $sens = SensTrafic::Import,
        bool $verrouOuvert = false,
    ): Escale {
        $navire = Navire::factory()->create(['name' => 'MSC LIPSIA III']);
        $voyage = '26-'.fake()->unique()->numerify('###').'S';

        if ($verrouOuvert) {
            MouvementNavire::factory()
                ->{$sens === SensTrafic::Import ? 'aQuai' : 'sorti'}()
                ->create([
                    'port_id' => $this->port->id,
                    'navire_id' => $navire->id,
                    'voyage' => $voyage,
                    'sens' => $sens,
                    'publiee_at' => now()->subHour(),
                ]);
        }

        return Escale::factory()->create([
            'consignataire_id' => $this->consignataire->id,
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
            'voyage' => $voyage,
            'sens' => $sens,
            'etape' => EtapeDossier::Ouvert,
        ]);
    }

    /**
     * La fixture, calee sur le voyage du dossier.
     *
     * Le navire ne bouge pas — les dossiers de ce test portent tous le MSC
     * LIPSIA III —, mais le voyage est tire a chaque ouverture, et l'import
     * refuse desormais un fichier qui ne correspond pas (ADR-0046).
     */
    private function fichierXml(Escale $escale): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'GA110438MDS.xml',
            str_replace(
                '<Voyage_number>26-114S</Voyage_number>',
                '<Voyage_number>'.$escale->voyage.'</Voyage_number>',
                (string) file_get_contents(base_path('tests/Fixtures/manifestes/import-mixte.xml')),
            ),
        );
    }

    /** Un connaissement saisi à la main, dans sa forme minimale valable. */
    private function connaissement(array $ecarts = []): array
    {
        return array_replace([
            'reference' => 'MSCUAB999888',
            'expediteur' => 'ANVERS TRADING NV',
            'destinataire' => 'ETS NDONG',
            'description' => 'RIZ EN SACS',
            'poids_brut_kg' => 24000,
            'volume_m3' => null,
            'colis' => 480,
            'hors_conteneur' => false,
            'conteneurs' => [
                ['reference' => 'MSCU1112223', 'taille' => 40, 'colis' => 480, 'tare_kg' => 3800],
            ],
        ], $ecarts);
    }

    /*
     * ── Phase 5 — l'import XML AWMDS ─────────────────────────────────────
     */

    public function test_l_apercu_resume_le_segment_general_sans_rien_ecrire(): void
    {
        // Regarder n'est pas déposer. L'aperçu lit le fichier, le confronte au
        // dossier et rend le segment général — mais il ne crée pas de
        // manifeste et ne laisse rien sur le disque : le navigateur garde le
        // fichier jusqu'à la confirmation.
        $escale = $this->dossier();
        $cle = 'inertia.flash_data.apercuManifeste';

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml/apercu", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertRedirect("/dossiers/{$escale->id}/manifeste")
            ->assertSessionHas($cle.'.enTete.navire', 'MSC LIPSIA III')
            ->assertSessionHas($cle.'.enTete.bureau', 'OW100')
            ->assertSessionHas($cle.'.enTete.dateArrivee', '2026-08-20')
            ->assertSessionHas($cle.'.enTete.portDestination', 'GAOWE')
            ->assertSessionHas($cle.'.contenu.bls', 4)
            ->assertSessionHas($cle.'.contenu.conteneurs', 3)
            // La fixture porte un conteneur groupé — 4 lignes pour 3 boîtes.
            // Le fichier est conforme ; le groupage se dit quand même, parce
            // qu'il change ce qui sera facturé (ADR-0049).
            ->assertSessionHas(
                $cle.'.reserves',
                fn (array $reserves): bool => count($reserves) === 1
                    && str_contains($reserves[0], 'groupé'),
            );

        $this->assertNull($escale->fresh()->manifeste);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_l_apercu_refuse_ce_que_l_import_refuserait(): void
    {
        // L'aperçu n'assouplit aucun contrôle, il les avance : un fichier
        // déposé sur le mauvais dossier est renvoyé ici, avant que le
        // consignataire n'ait rien engagé.
        $escale = $this->dossier();

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml/apercu", [
                'fichier' => $this->fichierXml($this->dossier()),
            ])
            ->assertSessionHasErrors('fichier')
            ->assertSessionMissing('inertia.flash_data.apercuManifeste');
    }

    public function test_l_apercu_signale_un_ecart_de_conformite_sans_fermer_la_porte(): void
    {
        // `Date_of_arrival` est la date RÉELLE d'arrivée (CGC, 2026-08-27) :
        // elle se confronte à l'accostage constaté par la conférence. L'écart
        // se dit — et l'import reste possible, parce que le référentiel n'est
        // pas toujours à jour et qu'on ne punit pas le déclarant pour cela.
        $escale = $this->dossier(verrouOuvert: true);
        $escale->mouvementNavire?->update(['eta' => '2026-08-22 08:00:00']);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml/apercu", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertSessionHasNoErrors()
            ->assertSessionHas(
                'inertia.flash_data.apercuManifeste.reserves',
                // Deux réserves : le groupage que la fixture porte, et l'écart
                // d'arrivée que ce test examine.
                fn (array $reserves): bool => count($reserves) === 2
                    && str_contains(implode(' ', $reserves), '22/08/2026'),
            );
    }

    public function test_l_import_xml_deplie_le_manifeste_et_fige_le_libelle_du_dossier(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $manifeste = $escale->fresh()->manifeste;

        $this->assertNotNull($manifeste);
        $this->assertSame(ModeSaisieManifeste::Xml, $manifeste->mode_saisie);
        $this->assertSame(4, $manifeste->bls()->count());

        // Le numéro n'est pas saisi : e-CDTS l'attribue, dans la forme des
        // manifestes gabonais réels (ADR-0046).
        $this->assertMatchesRegularExpression('/^\\d{4} M \\d{5}$/', (string) $manifeste->numero);

        // Un import est acquis d'un coup : le libellé du dossier cesse d'être
        // provisoire aussitôt, et l'étape avance.
        $escale->refresh();
        $this->assertSame($manifeste->numero, $escale->numero_affiche);
        $this->assertNotNull($escale->numero_fige_le);
        $this->assertSame(EtapeDossier::Manifeste, $escale->etape);
    }

    public function test_l_import_conserve_le_fichier_comme_piece_probante(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $manifeste = $escale->fresh()->manifeste;

        $this->assertSame('GA110438MDS.xml', $manifeste->piece_jointe_nom);
        $this->assertTrue($manifeste->pieceProbantePresente());
        Storage::disk('local')->assertExists($manifeste->piece_jointe_chemin);
    }

    public function test_l_import_prequalifie_les_boites_dont_la_taille_est_lisible(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $premier = $escale->fresh()->manifeste->bls()->orderBy('ligne_numero')->first();
        $boites = $premier->conteneurs()->orderBy('id')->get();

        // « FROZEN CHICKEN QUARTERS -18C » : la description dit le froid, la
        // taille dit le forfait. C'est toute la pré-qualification.
        $this->assertSame(TypeMarchandise::Conteneur40F, $boites[0]->type_marchandise);
        $this->assertSame(TypeMarchandise::Conteneur20F, $boites[1]->type_marchandise);
    }

    public function test_l_import_refuse_un_fichier_dont_le_sens_n_est_pas_celui_du_dossier(): void
    {
        $escale = $this->dossier(SensTrafic::Export);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertSessionHasErrors('fichier');

        $this->assertNull($escale->fresh()->manifeste);
    }

    public function test_un_import_refuse_ne_laisse_aucune_trace_sur_le_disque(): void
    {
        $escale = $this->dossier(SensTrafic::Export);

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_l_import_refuse_un_fichier_ouvert_sur_un_autre_voyage(): void
    {
        $escale = $this->dossier();

        // Le fichier annonce 26-114S ; le dossier a tiré un autre voyage.
        $fichier = UploadedFile::fake()->createWithContent(
            'GA110438MDS.xml',
            (string) file_get_contents(base_path('tests/Fixtures/manifestes/import-mixte.xml')),
        );

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml", ['fichier' => $fichier])
            ->assertSessionHasErrors('fichier');

        $this->assertNull($escale->fresh()->manifeste);
    }

    public function test_l_import_refuse_un_fichier_ouvert_sur_un_autre_navire(): void
    {
        $escale = $this->dossier();
        $fichier = $this->fichierXml($escale);
        $escale->navire->update(['name' => 'ATLANTIC HARRIER']);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml", ['fichier' => $fichier])
            ->assertSessionHasErrors('fichier');

        $this->assertNull($escale->fresh()->manifeste);
    }

    public function test_un_dossier_ne_recoit_qu_un_manifeste(): void
    {
        $escale = $this->dossier();
        Manifeste::factory()->create(['escale_id' => $escale->id]);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/xml", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertStatus(409);
    }

    public function test_un_interne_cgc_ne_depose_pas_de_manifeste(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->post("/dossiers/{$escale->id}/manifeste/xml", [
                'fichier' => $this->fichierXml($escale),
            ])
            ->assertForbidden();
    }

    /*
     * ── Phase 4 — la saisie manuelle et son PDF probant ──────────────────
     */

    public function test_la_saisie_manuelle_ouvre_un_manifeste_vide_et_sans_numero(): void
    {
        $escale = $this->dossier();

        // Rien n'est demandé au consignataire : le numéro n'est pas à lui de
        // le fournir, et il n'est pas encore dû (ADR-0046).
        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/saisie")
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $escale->refresh();

        $this->assertSame(ModeSaisieManifeste::Manuel, $escale->manifeste->mode_saisie);
        $this->assertSame(0, $escale->manifeste->bls()->count());
        $this->assertNull($escale->manifeste->numero);

        // Le dossier reste sous son numéro provisoire — la saisie n'est pas
        // close —, mais son étape avance : il a bien reçu un manifeste.
        $this->assertTrue($escale->numeroProvisoire());
        $this->assertSame(EtapeDossier::Manifeste, $escale->etape);
    }

    public function test_un_connaissement_se_saisit_avec_ses_boites(): void
    {
        $escale = $this->dossier();
        $manifeste = Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/connaissements", $this->connaissement())
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $bl = $manifeste->bls()->first();

        $this->assertSame('MSCUAB999888', $bl->reference);
        // Les assiettes vivent au connaissement, jamais par boîte.
        $this->assertSame(24000, $bl->poids_brut_kg);
        $this->assertSame(480, $bl->colis);
        $this->assertSame(1, $bl->conteneurs()->count());
        $this->assertSame(40, $bl->conteneurs()->first()->taille);
    }

    public function test_un_connaissement_sans_boite_ni_part_hors_conteneur_est_refuse(): void
    {
        $escale = $this->dossier();
        Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        // Il ne produirait aucune ligne : rien à qualifier, rien à facturer.
        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/connaissements", $this->connaissement([
                'conteneurs' => [],
                'hors_conteneur' => false,
            ]))
            ->assertSessionHasErrors('conteneurs');
    }

    public function test_un_connaissement_de_vrac_se_saisit_sans_aucune_boite(): void
    {
        $escale = $this->dossier();
        $manifeste = Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/connaissements", $this->connaissement([
            'conteneurs' => [],
            'hors_conteneur' => true,
        ]));

        $bl = $manifeste->bls()->first();

        $this->assertTrue($bl->hors_conteneur);
        $this->assertSame(0, $bl->conteneurs()->count());
    }

    public function test_corriger_un_connaissement_preserve_les_qualifications_deja_posees(): void
    {
        $escale = $this->dossier();
        $manifeste = Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        $this->actingAs($this->agent)->post(
            "/dossiers/{$escale->id}/manifeste/connaissements",
            $this->connaissement(),
        );

        $bl = $manifeste->bls()->first();
        $boite = $bl->conteneurs()->first();
        $boite->update(['type_marchandise' => TypeMarchandise::Conteneur40S]);

        // Corriger le tonnage du BL ne doit pas faire retomber sa boîte en
        // « à qualifier » : ce serait perdre un travail déjà fait.
        $this->actingAs($this->agent)->put(
            "/dossiers/{$escale->id}/manifeste/connaissements/{$bl->id}",
            $this->connaissement(['poids_brut_kg' => 25500]),
        );

        $bl->refresh();

        $this->assertSame(25500, $bl->poids_brut_kg);
        $this->assertSame(
            TypeMarchandise::Conteneur40S,
            $bl->conteneurs()->first()->type_marchandise,
        );
    }

    public function test_retirer_un_connaissement_emporte_ses_boites(): void
    {
        $escale = $this->dossier();
        $manifeste = Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        $this->actingAs($this->agent)->post(
            "/dossiers/{$escale->id}/manifeste/connaissements",
            $this->connaissement(),
        );

        $bl = $manifeste->bls()->first();

        $this->actingAs($this->agent)
            ->delete("/dossiers/{$escale->id}/manifeste/connaissements/{$bl->id}")
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $this->assertDatabaseMissing('manifeste_bls', ['id' => $bl->id]);
        $this->assertDatabaseMissing('manifeste_conteneurs', ['manifeste_bl_id' => $bl->id]);
    }

    public function test_un_connaissement_d_un_autre_manifeste_n_existe_pas(): void
    {
        $mien = $this->dossier();
        Manifeste::factory()->manuel()->create(['escale_id' => $mien->id]);

        $autre = Manifeste::factory()->manuel()->create();
        $etranger = ManifesteBl::factory()->create(['manifeste_id' => $autre->id]);

        $this->actingAs($this->agent)
            ->delete("/dossiers/{$mien->id}/manifeste/connaissements/{$etranger->id}")
            ->assertNotFound();
    }

    public function test_le_pdf_probant_se_joint_puis_se_telecharge(): void
    {
        $escale = $this->dossier();
        $manifeste = Manifeste::factory()->create([
            'escale_id' => $escale->id,
            'mode_saisie' => ModeSaisieManifeste::Manuel,
        ]);

        $this->assertFalse($manifeste->pieceProbantePresente());

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/piece", [
                'fichier' => UploadedFile::fake()->create('Manifeste.pdf', 300, 'application/pdf'),
            ])
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $manifeste->refresh();

        $this->assertSame('Manifeste.pdf', $manifeste->piece_jointe_nom);
        Storage::disk('local')->assertExists($manifeste->piece_jointe_chemin);

        $this->actingAs($this->agent)
            ->get("/dossiers/{$escale->id}/manifeste/piece")
            ->assertOk()
            ->assertDownload('Manifeste.pdf');
    }

    public function test_l_agent_cgc_telecharge_la_piece_pour_controler_sur_piece(): void
    {
        $escale = $this->dossier();
        Manifeste::factory()->create([
            'escale_id' => $escale->id,
            'mode_saisie' => ModeSaisieManifeste::Manuel,
        ]);

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/piece", [
            'fichier' => UploadedFile::fake()->create('Manifeste.pdf', 120, 'application/pdf'),
        ]);

        // Le contrôle sur pièce est le geste du CGC (WF5) : il doit pouvoir
        // ouvrir le PDF depuis l'écran de dépouillement.
        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->get("/dossiers/{$escale->id}/manifeste/piece")
            ->assertOk();
    }

    public function test_la_piece_d_un_import_xml_ne_se_retire_pas(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        // Elle EST le fichier qui a produit le tableau : la retirer laisserait
        // un manifeste déplié sans rien qui l'atteste.
        $this->actingAs($this->agent)
            ->delete("/dossiers/{$escale->id}/manifeste/piece")
            ->assertForbidden();
    }

    /*
     * ── Phase 6 — la transmission au CGC ─────────────────────────────────
     */

    /** Un manifeste prêt à partir : une ligne, qualifiée, avec sa pièce. */
    private function manifestePret(Escale $escale): Manifeste
    {
        $manifeste = Manifeste::factory()->manuel()->create(['escale_id' => $escale->id]);

        $bl = ManifesteBl::factory()->create([
            'manifeste_id' => $manifeste->id,
            'hors_conteneur' => true,
            'conteneurs_annonces' => 0,
            'poids_brut_kg' => 32000,
            'type_marchandise' => TypeMarchandise::Sacherie,
        ]);

        $bl->conteneurs()->delete();

        return $manifeste;
    }

    public function test_la_transmission_verrouille_le_manifeste_et_avance_le_dossier(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $manifeste = $this->manifestePret($escale);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $manifeste->refresh();
        $escale->refresh();

        $this->assertSame(EtatManifeste::Transmis, $manifeste->etat);
        $this->assertNotNull($manifeste->transmis_le);
        $this->assertFalse($manifeste->modifiable());
        $this->assertSame(EtapeDossier::Depouillement, $escale->etape);
    }

    public function test_la_transmission_numerote_une_saisie_manuelle_restee_provisoire(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $manifeste = $this->manifestePret($escale);

        // Tant que la saisie court, le dossier n'a pas de numéro (ADR-0046).
        $this->assertNull($manifeste->numero);
        $this->assertTrue($escale->numeroProvisoire());

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/transmission");

        $manifeste->refresh();
        $escale->refresh();

        // La saisie est close, donc acquise : elle reçoit son numéro, et le
        // dossier cesse d'être provisoire.
        $this->assertMatchesRegularExpression('/^\\d{4} M \\d{5}$/', (string) $manifeste->numero);
        $this->assertSame($manifeste->numero, $escale->numero_affiche);
        $this->assertNotNull($escale->numero_fige_le);
    }

    public function test_les_numeros_attribues_se_suivent_sans_trou(): void
    {
        $premier = $this->dossier();
        $second = $this->dossier();

        foreach ([$premier, $second] as $escale) {
            $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
                'fichier' => $this->fichierXml($escale),
            ]);
        }

        $numeros = [
            $premier->fresh()->manifeste->numero,
            $second->fresh()->manifeste->numero,
        ];

        $racine = now()->format('Y').' M ';

        $this->assertSame($racine.'00001', $numeros[0]);
        $this->assertSame($racine.'00002', $numeros[1]);
    }

    public function test_la_transmission_est_fermee_tant_qu_une_ligne_reste_a_qualifier(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $manifeste = $this->manifestePret($escale);
        $manifeste->bls()->update(['type_marchandise' => null]);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertSessionHasErrors('transmission');

        $this->assertSame(EtatManifeste::Brouillon, $manifeste->fresh()->etat);
    }

    public function test_la_transmission_est_fermee_sans_piece_probante(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $manifeste = $this->manifestePret($escale);
        $manifeste->update([
            'piece_jointe_chemin' => null,
            'piece_jointe_nom' => null,
            'piece_jointe_octets' => null,
        ]);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertSessionHasErrors('transmission');
    }

    public function test_la_transmission_est_fermee_tant_que_la_situation_portuaire_n_a_rien_constate(): void
    {
        // Le quatrième verrou, le seul qui ne dépende pas du consignataire :
        // sans ligne rapprochée et publiée, rien ne part (ADR-0009).
        $escale = $this->dossier();
        $this->manifestePret($escale);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertSessionHasErrors('transmission');

        $this->assertSame(EtapeDossier::Manifeste, $escale->fresh()->etape);
    }

    public function test_une_ligne_de_situation_non_publiee_n_ouvre_pas_la_transmission(): void
    {
        $navire = Navire::factory()->create();
        $voyage = '26-501S';

        // Rapprochée mais en brouillon : identifier n'est pas opposer (ADR-0042).
        MouvementNavire::factory()->aQuai()->create([
            'port_id' => $this->port->id,
            'navire_id' => $navire->id,
            'voyage' => $voyage,
            'sens' => SensTrafic::Import,
            'publiee_at' => null,
        ]);

        $escale = Escale::factory()->create([
            'consignataire_id' => $this->consignataire->id,
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
            'voyage' => $voyage,
            'sens' => SensTrafic::Import,
            'etape' => EtapeDossier::Ouvert,
        ]);

        $this->assertNotNull($escale->mouvement_navire_id);
        $this->manifestePret($escale);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertSessionHasErrors('transmission');
    }

    public function test_le_verrou_est_directionnel(): void
    {
        // Un dossier export n'attend pas l'accostage mais la SORTIE du navire.
        $navire = Navire::factory()->create();
        $voyage = '26-502N';

        MouvementNavire::factory()->aQuai()->create([
            'port_id' => $this->port->id,
            'navire_id' => $navire->id,
            'voyage' => $voyage,
            'sens' => SensTrafic::Export,
            'publiee_at' => now(),
        ]);

        $escale = Escale::factory()->create([
            'consignataire_id' => $this->consignataire->id,
            'navire_id' => $navire->id,
            'port_id' => $this->port->id,
            'voyage' => $voyage,
            'sens' => SensTrafic::Export,
            'etape' => EtapeDossier::Ouvert,
        ]);

        $this->manifestePret($escale);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertSessionHasErrors('transmission');
    }

    public function test_un_manifeste_transmis_ne_se_corrige_plus(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $manifeste = $this->manifestePret($escale);
        $manifeste->update(['etat' => EtatManifeste::Transmis, 'transmis_le' => now()]);
        $escale->update(['etape' => EtapeDossier::Depouillement]);

        $this->actingAs($this->agent)
            ->post("/dossiers/{$escale->id}/manifeste/connaissements", $this->connaissement())
            ->assertForbidden();

        $this->actingAs($this->agent)
            ->delete("/dossiers/{$escale->id}/manifeste")
            ->assertForbidden();
    }

    public function test_un_interne_cgc_ne_transmet_pas_a_la_place_du_consignataire(): void
    {
        $escale = $this->dossier(verrouOuvert: true);
        $this->manifestePret($escale);

        $this->actingAs($this->interne(Profil::AgentDepouilleur))
            ->post("/dossiers/{$escale->id}/manifeste/transmission")
            ->assertForbidden();
    }

    /*
     * ── La reprise à zéro ────────────────────────────────────────────────
     */

    public function test_reprendre_a_zero_efface_tout_mais_garde_le_libelle_du_dossier(): void
    {
        $escale = $this->dossier();

        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $manifeste = $escale->fresh()->manifeste;
        $chemin = $manifeste->piece_jointe_chemin;

        $this->actingAs($this->agent)
            ->delete("/dossiers/{$escale->id}/manifeste")
            ->assertRedirect("/dossiers/{$escale->id}/manifeste");

        $escale->refresh();

        $this->assertNull($escale->manifeste);
        $this->assertDatabaseCount('manifeste_bls', 0);
        Storage::disk('local')->assertMissing($chemin);

        // Le dossier a circulé sous ce numéro : il ne le perd pas (ADR-0008).
        $this->assertSame($manifeste->numero, $escale->numero_affiche);
        $this->assertSame(EtapeDossier::Manifeste, $escale->etape);
    }

    public function test_un_redepot_ne_change_pas_le_libelle_deja_fige(): void
    {
        $escale = $this->dossier();

        // Premier import : le dossier reçoit son libellé définitif.
        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $fige = $escale->fresh()->numero_affiche;
        $this->assertNotNull($fige);

        // Reprise à zéro, puis redépôt : le nouveau manifeste reçoit son
        // propre numéro, mais le dossier garde celui sous lequel il a circulé.
        $this->actingAs($this->agent)->delete("/dossiers/{$escale->id}/manifeste");
        $this->actingAs($this->agent)->post("/dossiers/{$escale->id}/manifeste/xml", [
            'fichier' => $this->fichierXml($escale),
        ]);

        $escale->refresh();

        // Le numéro gravé sur le dossier ne revient pas à la séquence, même si
        // le manifeste qui le portait a disparu.
        $this->assertNotSame($fige, $escale->manifeste->numero);
        $this->assertSame($fige, $escale->numero_affiche);
    }
}
