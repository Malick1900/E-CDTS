<?php

use App\Actions\Manifeste\LitUnManifesteAwmds;
use App\DataTransferObjects\ManifesteLu;
use App\Enums\SensTrafic;
use App\Models\Consignataire;
use App\Models\Escale;
use App\Models\MouvementNavire;
use App\Models\Navire;
use App\Models\Pays;
use Illuminate\Validation\ValidationException;

/*
 * Le parseur AWMDS lu sur pièce (WF4).
 *
 * Les manifestes réels ne sont pas conformes à `Awmds-SVG.xsd` : chaque
 * transporteur en émet un profil appauvri, et les profils divergent entre eux.
 * Ces tests fixent ce que le parseur tolère — et surtout ce qu'il refuse de
 * deviner.
 *
 * @see docs/MANIFESTE-XML.md
 */

function manifesteXml(): string
{
    return (string) file_get_contents(base_path('tests/Fixtures/manifestes/import-mixte.xml'));
}

/**
 * Le dossier d'accueil, tel que la fixture le suppose : le MSC LIPSIA III sur
 * le voyage 26-114S, à l'import. Il n'est jamais enregistré — le parseur ne
 * touche pas la base, et une escale en mémoire lui suffit.
 */
function dossierDe(SensTrafic $sens, string $navire = 'MSC LIPSIA III', string $voyage = '26-114S'): Escale
{
    $escale = new Escale(['voyage' => $voyage, 'sens' => $sens]);
    $escale->voyage_normalise = Escale::normaliserVoyage($voyage);
    $escale->setRelation('navire', new Navire(['name' => $navire]));

    return $escale;
}

/**
 * Le même dossier, mais renseigné : une société, un pavillon, un n° OMI, un
 * accostage. C'est à ce référentiel-là que les réserves de conformité se
 * confrontent — un dossier nu n'a rien à démentir.
 */
function dossierRenseigne(
    string $pavillon = 'LR',
    ?string $imo = '9403360',
    string $societe = 'MSC GABON',
    ?string $accostage = '2026-08-20',
): Escale {
    $escale = dossierDe(SensTrafic::Import);

    $navire = new Navire(['name' => 'MSC LIPSIA III', 'imo' => $imo]);
    $navire->setRelation('pays', new Pays(['code' => $pavillon]));

    $escale->setRelation('navire', $navire);
    $escale->setRelation('consignataire', new Consignataire(['name' => $societe]));
    $escale->setRelation(
        'mouvementNavire',
        $accostage === null ? null : new MouvementNavire(['eta' => $accostage]),
    );

    return $escale;
}

/** Le même manifeste, immatriculé — n° OMI ou indicatif d'appel selon le profil. */
function immatricule(string $valeur): string
{
    return str_replace(
        '<Identity_of_transporter>',
        "<Registration_number_of_transport_code>{$valeur}</Registration_number_of_transport_code><Identity_of_transporter>",
        manifesteXml(),
    );
}

/** Le même manifeste, émis par une compagnie nommée. */
function emisPar(string $societe): string
{
    return str_replace(
        '<Transport_information>',
        "<Transport_information><Carrier><Carrier_name>{$societe}</Carrier_name></Carrier>",
        manifesteXml(),
    );
}

function lire(?string $xml = null, ?Escale $dossier = null): ManifesteLu
{
    return app(LitUnManifesteAwmds::class)->handle(
        $xml ?? manifesteXml(),
        $dossier ?? dossierDe(SensTrafic::Import),
    );
}

it('déplie l’arbre des connaissements et de leurs boîtes', function () {
    $lu = lire();

    expect($lu->bls)->toHaveCount(4)
        ->and($lu->enTete->voyage)->toBe('26-114S')
        ->and($lu->enTete->navire)->toBe('MSC LIPSIA III')
        ->and($lu->anomalies)->toBe([]);
});

it('compte les conteneurs en références DISTINCTES, groupage déduit', function () {
    $lu = lire();

    // Cinq `ctn_segment` dans le fichier, mais `TCLU9988776` se répète sous
    // deux connaissements : c'est une seule boîte, pas deux.
    $lignes = array_sum(array_map(fn ($bl) => count($bl->conteneurs), $lu->bls));

    expect($lignes)->toBe(4)
        ->and($lu->conteneurs())->toBe(3);
});

it('normalise les tailles quel que soit le profil du transporteur', function () {
    [$premier] = lire()->bls;

    // « 40 » chez MSC, « 20G1 » sur un vieux DELMAS : on ne garde que la taille.
    expect($premier->conteneurs[0]->taille)->toBe(40)
        ->and($premier->conteneurs[1]->taille)->toBe(20);
});

it('lit la tare sous l’un ou l’autre de ses noms, sans la confondre avec la marchandise', function () {
    [$premier] = lire()->bls;

    expect($premier->conteneurs[0]->tareKg)->toBe(4600)  // Empty_weight
        ->and($premier->conteneurs[1]->tareKg)->toBe(2200) // Goods_weight
        // Le poids de la marchandise reste au connaissement, jamais par boîte.
        ->and($premier->poidsBrutKg)->toBe(40000);
});

it('porte les trois assiettes au connaissement et nulle part ailleurs', function () {
    $bls = lire()->bls;

    expect($bls[1]->poidsBrutKg)->toBe(18000)
        ->and($bls[1]->volumeM3)->toBe(52.4)
        ->and($bls[1]->colis)->toBe(180);
});

it('repère le dégroupage à son connaissement mère', function () {
    $bls = lire()->bls;

    expect($bls[0]->masterReference)->toBeNull()
        ->and($bls[1]->masterReference)->toBe('MSCUMASTER0001');
});

it('traite un BL sans aucune boîte comme entièrement hors conteneur', function () {
    $bls = lire()->bls;

    // `Bol_type_code` vaut pourtant « CNT » sur ce BL de vrac : le champ ment,
    // et le parseur ne s'y fie pas.
    expect($bls[3]->horsConteneur)->toBeTrue()
        ->and($bls[3]->conteneurs)->toBe([])
        ->and($bls[0]->horsConteneur)->toBeFalse();
});

it('ne voit pas de résidu quand les boîtes ne déclarent pas leurs colis', function () {
    // Une somme nulle est une donnée ABSENTE, pas « zéro colis » : la lire
    // comme un résidu enverrait tout un manifeste en qualification manuelle.
    $xml = str_replace(
        ['<Number_of_packages>500</Number_of_packages>', '<Number_of_packages>300</Number_of_packages>'],
        ['<Number_of_packages>0</Number_of_packages>', '<Number_of_packages>0</Number_of_packages>'],
        manifesteXml(),
    );

    expect(lire($xml)->bls[0]->horsConteneur)->toBeFalse();
});

it('détecte un résidu quand les colis du BL dépassent ceux de ses boîtes', function () {
    // 800 colis annoncés au BL, 500 + 300 dans les boîtes : le compte tombe
    // juste. On en ajoute cent au connaissement, sans les mettre dans une boîte.
    $xml = str_replace(
        '<Number_of_packages>800</Number_of_packages>',
        '<Number_of_packages>900</Number_of_packages>',
        manifesteXml(),
    );

    expect(lire($xml)->bls[0]->horsConteneur)->toBeTrue();
});

it('refuse un manifeste dont le sens n’est pas celui du dossier', function () {
    lire(dossier: dossierDe(SensTrafic::Export));
})->throws(ValidationException::class, 'manifeste import');

it('refuse un manifeste dont le voyage n’est pas celui du dossier', function () {
    // Le contrôle le plus discriminant : deux escales du même navire ne
    // partagent jamais un n° de voyage.
    lire(dossier: dossierDe(SensTrafic::Import, voyage: '26-115N'));
})->throws(ValidationException::class, 'voyage 26-114S');

it('accepte un voyage écrit autrement — la comparaison est normalisée', function () {
    // « 26-114 s » et « 26-114S » sont le même passage (ADR-0009).
    expect(lire(dossier: dossierDe(SensTrafic::Import, voyage: '26-114 s'))->bls)->toHaveCount(4);
});

it('refuse un manifeste dont le navire n’est pas celui du dossier', function () {
    lire(dossier: dossierDe(SensTrafic::Import, navire: 'ATLANTIC HARRIER'));
})->throws(ValidationException::class, 'MSC LIPSIA III');

it('accepte un nom de navire tronqué par le schéma', function () {
    // `Identity_of_transporter` est borné à 27 caractères : un nom long y
    // arrive coupé, alors que le référentiel CGC l'écrit en entier.
    $dossier = dossierDe(SensTrafic::Import, navire: 'MSC LIPSIA III DEUXIEME DU NOM');

    expect(lire(dossier: $dossier)->bls)->toHaveCount(4);
});

it('accepte un nom de navire ponctué autrement', function () {
    expect(lire(dossier: dossierDe(SensTrafic::Import, navire: 'M.S.C. Lipsia-III'))->bls)->toHaveCount(4);
});

it('nomme les deux escales quand le navire ET le voyage divergent', function () {
    // Le cas réel : un fichier déposé sur le mauvais dossier. S'arrêter au
    // premier écart laisserait croire à une faute de saisie sur le voyage,
    // alors que le remède est de changer de fichier — ou de dossier.
    try {
        lire(dossier: dossierDe(SensTrafic::Import, navire: 'PACIFIC OZOURI', voyage: '41565'));

        expect()->fail('Le manifeste aurait dû être refusé.');
    } catch (ValidationException $e) {
        $motif = $e->validator->errors()->first('fichier');

        expect($motif)
            ->toContain('une autre escale')
            ->toContain('MSC LIPSIA III')
            ->toContain('26-114S')
            ->toContain('PACIFIC OZOURI')
            ->toContain('41565');
    }
});

it('oriente vers le remède plutôt que de constater l’écart', function () {
    try {
        lire(dossier: dossierDe(SensTrafic::Import, voyage: '26-115N'));

        expect()->fail('Le manifeste aurait dû être refusé.');
    } catch (ValidationException $e) {
        expect($e->validator->errors()->first('fichier'))->toContain('Vérifiez le fichier déposé');
    }
});

it('refuse un fichier dont le compte de connaissements ne tombe pas juste', function () {
    $xml = str_replace(
        '<Total_number_of_bols>4</Total_number_of_bols>',
        '<Total_number_of_bols>5</Total_number_of_bols>',
        manifesteXml(),
    );

    lire($xml);
})->throws(ValidationException::class, 'annonce 5 connaissements');

it('refuse un fichier dont le compte de conteneurs ne tombe pas juste', function () {
    // Un conteneur manquant n'est pas du bruit : c'est une erreur de comptage.
    $xml = str_replace(
        '<Total_number_of_containers>3</Total_number_of_containers>',
        '<Total_number_of_containers>4</Total_number_of_containers>',
        manifesteXml(),
    );

    lire($xml);
})->throws(ValidationException::class, 'annonce 4 conteneurs');

it('ne relève pas un écart de masse dans la tolérance', function () {
    // 100 kg sur un navire qui en porte des millions : du bruit de pesée.
    $xml = str_replace(
        '<Total_gross_mass>64000.00</Total_gross_mass>',
        '<Total_gross_mass>64100.00</Total_gross_mass>',
        manifesteXml(),
    );

    expect(lire($xml)->anomalies)->toBe([]);
});

it('signale un écart de masse hors tolérance sans jamais rejeter le fichier', function () {
    $xml = str_replace(
        '<Total_gross_mass>64000.00</Total_gross_mass>',
        '<Total_gross_mass>70000.00</Total_gross_mass>',
        manifesteXml(),
    );

    $lu = lire($xml);

    expect($lu->bls)->toHaveCount(4)
        ->and($lu->anomalies)->toHaveCount(1)
        ->and($lu->anomalies[0])->toContain('6000');
});

it('signale l’absence de totaux de contrôle plutôt que de la passer sous silence', function () {
    $xml = preg_replace('#<Totals_segment>.*?</Totals_segment>#s', '', manifesteXml());

    expect(lire($xml)->anomalies)->toHaveCount(1);
});

// ── Le segment général, et ce qu'il permet de confronter ────────────────────
//
// Le navire et le voyage font foi et REJETTENT (plus haut). Ce qui suit ne
// rejette jamais : le référentiel CGC connaît parfois mal une escale, et
// bloquer sur une fiche incomplète punirait le déclarant d'un manque interne
// (arbitrage du porteur, 2026-08-27). L'écart se dit, la porte reste ouverte.

it('rend le segment général tel que le fichier l’écrit', function () {
    $enTete = lire()->enTete;

    expect($enTete->bureau)->toBe('OW100')
        ->and($enTete->pavillon)->toBe('LBR')
        ->and($enTete->dateArrivee)->toBe('2026-08-20')
        ->and($enTete->portDepart)->toBe('BEANR')
        ->and($enTete->portDestination)->toBe('GAOWE')
        ->and($enTete->totauxPresents)->toBeTrue()
        ->and($enTete->blsAnnonces)->toBe(4)
        ->and($enTete->conteneursAnnonces)->toBe(3)
        ->and($enTete->masseAnnonceeKg)->toBe(64000);
});

it('ne relève rien quand le fichier et le référentiel s’accordent', function () {
    expect(lire(dossier: dossierRenseigne())->anomalies)->toBe([]);
});

it('signale un pavillon que la fiche du navire dément', function () {
    $xml = str_replace('LBR', 'LR', manifesteXml());

    $anomalies = lire($xml, dossierRenseigne(pavillon: 'PA'))->anomalies;

    expect($anomalies)->toHaveCount(1)
        ->and($anomalies[0])->toContain('Pavillon');
});

it('ne compare pas un pavillon écrit en trois lettres', function () {
    // Le schéma autorise « LR » comme « LBR », quand le référentiel ne connaît
    // que l'alpha-2 : les opposer signalerait une notation, pas un désaccord.
    expect(lire(dossier: dossierRenseigne(pavillon: 'LR'))->anomalies)->toBe([]);
});

it('signale un n° OMI que la fiche du navire dément', function () {
    $anomalies = lire(immatricule('9999999'), dossierRenseigne())->anomalies;

    expect($anomalies)->toHaveCount(1)
        ->and($anomalies[0])->toContain('OMI');
});

it('ne compare pas un indicatif d’appel à un n° OMI', function () {
    // Le même champ porte l'un ou l'autre selon le transporteur : « 5LCQ4 »
    // chez MSC, un OMI à sept chiffres chez GINA. Les confronter ne dirait
    // qu'une différence de nature.
    expect(lire(immatricule('5LCQ4'), dossierRenseigne())->anomalies)->toBe([]);
});

it('signale un manifeste émis par une autre société que celle du dossier', function () {
    $anomalies = lire(emisPar('SAGA LIBREVILLE'), dossierRenseigne())->anomalies;

    expect($anomalies)->toHaveCount(1)
        ->and($anomalies[0])->toContain('SAGA LIBREVILLE');
});

it('accepte une raison sociale abrégée autrement', function () {
    // « MSC GABON SA » et « MSC GABON » sont la même maison : la comparaison
    // porte sur le préfixe aplati, comme pour le nom du navire.
    expect(lire(emisPar('MSC GABON SA'), dossierRenseigne())->anomalies)->toBe([]);
});

it('signale une arrivée qui ne tombe pas sur l’accostage constaté', function () {
    // `Date_of_arrival` est la date RÉELLE d'arrivée (CGC, 2026-08-27) : elle
    // se confronte à la situation portuaire, deux faits l'un contre l'autre.
    $anomalies = lire(dossier: dossierRenseigne(accostage: '2026-08-22'))->anomalies;

    expect($anomalies)->toHaveCount(1)
        ->and($anomalies[0])->toContain('22/08/2026');
});

it('ne compare pas l’arrivée d’un dossier que rien ne rapproche', function () {
    // Sans ligne de situation portuaire, il n'y a pas d'accostage constaté —
    // et l'`eta_prevue` du dossier n'est qu'une annonce : l'écart y serait la
    // règle, pas l'anomalie.
    expect(lire(dossier: dossierRenseigne(accostage: null))->anomalies)->toBe([]);
});

it('ne refuse jamais le fichier sur ces écarts-là', function () {
    $lu = lire(emisPar('SAGA LIBREVILLE'), dossierRenseigne(accostage: '2026-08-22'));

    expect($lu->bls)->toHaveCount(4)
        ->and($lu->anomalies)->toHaveCount(2);
});

it('refuse un fichier qui n’est pas un XML lisible', function () {
    lire('ceci n’est pas du XML');
})->throws(ValidationException::class);

it('refuse un XML valide qui ne porte aucun connaissement', function () {
    lire('<Awmds><General_segment/></Awmds>');
})->throws(ValidationException::class, 'aucun connaissement');

it('ne résout pas les entités externes d’un fichier reçu d’un tiers', function () {
    // Une porte XXE classique : si l'entité se résolvait, le contenu du fichier
    // désigné remonterait dans la description du connaissement.
    $xml = <<<'XML'
        <?xml version="1.0"?>
        <!DOCTYPE Awmds [<!ENTITY fuite SYSTEM "file:///etc/passwd">]>
        <Awmds>
            <Bol_segment>
                <Bol_id><Bol_reference>X1</Bol_reference><Bol_nature>23</Bol_nature></Bol_id>
                <Goods_segment>
                    <Goods_description>&fuite;</Goods_description>
                    <Num_of_ctn_for_this_bol>0</Num_of_ctn_for_this_bol>
                </Goods_segment>
            </Bol_segment>
        </Awmds>
        XML;

    // L'entité ne se résout pas : la description reste vide plutôt que de
    // porter le contenu du fichier visé.
    $description = lire($xml)->bls[0]->description ?? '';

    expect($description)->not->toContain('root:');
});
