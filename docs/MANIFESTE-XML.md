# Manifeste — champs du tableau de dépouillement

> Colonnes à extraire du manifeste XML (AWMDS / ASYCUDA World) pour **liquider la CDTS**.
> Arrêté avec le porteur du projet le 2026-07-08, **vérifié sur 4 manifestes réels le 2026-07-09**
> (MSC + DELMAS, import et export, profil gabonais OW100 Owendo / GAPOG Port-Gentil).
> Principe : **le tableau reste le plus simple possible** — uniquement ce qui sert à identifier et à facturer.

## Structure AWMDS réelle (vérifiée sur pièce — clôt ADR-0003)

**1 `<General_segment>`** (navire, voyage, ports, `Totals_segment`) + **N `<Bol_segment>`** (un par connaissement/BL). Le **conteneur est niché dans le BL** : chaque `<Bol_segment>` contient N `<ctn_segment>` répétés.

```
Awmds
├─ General_segment
│   ├─ General_segment_id : Customs_office_code, Voyage_number, Date_of_arrival, Time_of_arrival…
│   ├─ Totals_segment : Total_number_of_bols, Total_number_of_containers, Total_gross_mass
│   ├─ Transport_information : Identity_of_transporter (navire), Nationality_of_transporter_code (pavillon)…
│   └─ Load_unload_place : Place_of_departure_code / Place_of_destination_code   ← sens du voyage
└─ Bol_segment  (1 par BL)
    ├─ Bol_id : Bol_reference, Line_number, Bol_nature, Bol_type_code, Master_bol_ref_number
    ├─ Load_unload_place : Place_of_loading_code / Place_of_unloading_code   ← ports RÉELS du BL
    ├─ Traders_segment : Exporter, Notify, Consignee
    ├─ ctn_segment  (RÉPÉTÉ, 1 par conteneur) : Ctn_reference, Number_of_packages,
    │                 Type_of_container, Empty_Full, Empty_weight (= tare)
    ├─ Goods_segment : Gross_mass, Volume_in_cubic_meters, Goods_description,
    │                  Number_of_packages, Num_of_ctn_for_this_bol
    └─ Value_segment / Location
```

**Maille du tableau = le BL**, avec ses conteneurs en **sous-lignes dépliables**. Confirmé par la structure : le à-plat « 1 ligne = 1 conteneur » est une vue dérivée qu'on reconstruit en dépliant.

**Groupage (1 conteneur ↔ N BL)** : n'existe pas comme lien explicite ; un conteneur groupé se répète à l'identique dans plusieurs `Bol_segment`. → **comptage des boîtes = n° de conteneur distincts** (déduplication globale), jamais « une boîte par ligne ». La répétition d'une `Ctn_reference` **est** le marqueur du groupage — il n'y en a pas d'autre à attendre.

> **Deux comptes coexistent, et l'écart entre eux est le groupage** (ADR-0049). Les boîtes distinctes d'un côté, les lignes `ctn_segment` de l'autre. Les transporteurs annoncent tantôt l'un, tantôt l'autre : les **deux sont admis**. Et une boîte groupée **ne paie qu'un forfait**, porté par le premier connaissement qui la déclare — elle n'est manutentionnée qu'une fois.

## Colonnes du tableau (liste minimale validée)

> Ordre d'affichage gauche → droite (arrêté 2026-07-08, N° conteneur placé avant la désignation).
> Noms de balises **réels** (profil gabonais MSC/DELMAS vérifié) — restent à re-confirmer si un nouveau transporteur apparaît.

| # | Colonne | Balise AWMDS réelle | Niveau | Rôle |
|---|---|---|---|---|
| 1 | **N° de BL** | `Bol_id/Bol_reference` | BL | Identifie la ligne / le connaissement |
| 2 | **Type de BL** (groupage / non) | `Bol_id/Master_bol_ref_number` (vide = simple ; renseigné = house/dégroupage) | BL | Repère le **dégroupage/groupage** |
| 3 | **Port de chargement** | `Load_unload_place/Place_of_loading_code` (UN/LOCODE) | BL | Identification + **statistiques** |
| 4 | **Port de déchargement** | `Load_unload_place/Place_of_unloading_code` (UN/LOCODE) | BL | Identification + **statistiques** |
| 5 | **Expéditeur** | `Traders_segment/Exporter/Exporter_name` | BL | Identification |
| 6 | **Destinataire** | `Traders_segment/Consignee/Consignee_name` | BL | Identification |
| 7 | **N° de conteneur** | `ctn_segment/Ctn_reference` | conteneur | Comptage des boîtes (« TOTAL TC » du PV) |
| 8 | **Taille du conteneur** | `ctn_segment/Type_of_container` (**⚠ taille seule : `20` / `40` / `45`, pas le code ISO complet**) | conteneur | Détermine le **forfait** conteneur (20'/40'/45') |
| 9 | **Description de la marchandise** | `Goods_segment/Goods_description` | BL | Base de la **catégorisation** + détection sec/frigo (voir règles) |
| 10 | **Poids brut (KG → tonnes)** | `Goods_segment/Gross_mass` | **BL** | Facturation **à la tonne** (sacherie, conventionnel, vrac, produits dérivés) |
| 11 | **Volume (m³)** | `Goods_segment/Volume_in_cubic_meters` | **BL** | Facturation **au cubage** (vrac cubage, bois, VU cubage) |
| 12 | **Colis / unités** | `Goods_segment/Number_of_packages` (ou `ctn_segment/Number_of_packages` par conteneur) | BL/conteneur | Facturation **à l'unité** — véhicules de tourisme (⚠ souvent `0` sur RoRo — voir vigilance) |

> **Poids et volume sont au niveau BL** (`Goods_segment`), **pas par conteneur**. Le `Empty_weight` du `ctn_segment` est la **tare** (poids à vide), à ne pas confondre avec le poids marchandise.

## Les trois moteurs de la liquidation
La CDTS se calcule sur : **le conteneur** (n° + taille), **le poids** (tonnes, niveau BL), **le volume** (m³, niveau BL) — plus **la description** pour choisir la case du barème, et **les unités** pour le seul cas des véhicules.

## Maille d'affichage vs maille de facturation _(arrêté 2026-07-14)_

Le tableau de dépouillement s'affiche **à plat : 1 ligne = 1 conteneur** (le n° de BL se répète autant de fois que le BL a de conteneurs), plus **1 ligne « vrac »** pour la part non conteneurisée d'un BL. Ce choix (validé sur la maquette) évite l'expand/collapse : l'opérateur voit tout d'un coup.

Mais la **maille de facturation** reste le **BL** pour le poids/volume et le **conteneur** pour le forfait. D'où **3 règles de totaux non négociables** (sinon les agrégats explosent) :

1. **Poids & volume ne se répètent PAS par ligne.** Ils sont au niveau BL : on les porte sur **une seule ligne du BL** (les autres lignes du même BL laissent la case vide). Le total en tonnes/m³ somme **une fois par BL**, jamais une fois par conteneur.
2. **Le montant dépend du moteur.** Forfait conteneur → **une ligne = un montant** (sommable par ligne). Vrac (tonne/cubage) → montant calculé **une seule fois au niveau BL**, jamais dupliqué.
3. **« TOTAL TC » = conteneurs distincts, pas lignes.** Un conteneur groupé apparaît sous plusieurs BL → il ne compte **qu'une boîte** (déduplication sur `Ctn_reference`) **et ne paie qu'un forfait**, porté par le premier BL qui le déclare (ADR-0049). Le montant suit la même déduplication que le compte : une manutention, un montant. C'est la limite de la règle 2 ci-dessus.

## Typologie des BL et règle d'or _(arrêté 2026-07-14)_

Trois cas, dont un seul est difficile :

| Cas | Détection | Facturation | Statut |
|---|---|---|---|
| **Pur conteneur** | `Num_of_ctn_for_this_bol ≥ 1`, pas de résidu | forfait par boîte | auto ✔ |
| **Pur vrac — assiette présente** | `Num_of_ctn_for_this_bol = 0` **et** la donnée d'assiette de la catégorie existe (poids pour tonne, volume pour cubage) | tonne / cubage (niveau BL) | auto ✔ |
| **Pur vrac — assiette manquante** _(constat 2026-07-28)_ | `Num_of_ctn_for_this_bol = 0` mais la catégorie facture **à l'unité** avec `Number_of_packages = 0` (typique RoRo / véhicules de tourisme) | assiette absente du XML — **non calculable seule** | → **qualification manuelle** |
| **BL mixte** | conteneur **+** marchandise hors conteneur (ex. véhicules non empotés) sur le même connaissement | **non répartissable** par la machine | → **qualification manuelle** |

**Pourquoi le mixte coince :** `Gross_mass` / `Volume_in_cubic_meters` sont un **agrégat unique** au niveau BL — le manifeste ne dit pas « X t dans le conteneur + Y t de véhicules ». Le `ctn_segment` donne le **nombre de colis** par conteneur mais **pas le poids marchandise** (l'`Empty_weight` est la tare). La machine peut donc **détecter** un résidu hors conteneur (rapprochement colis BL vs somme des colis conteneurs) mais **pas répartir** le poids/volume.

**Règle d'or — on ne devine jamais.** Le parseur facture **seul** les cas nets (pur conteneur, pur vrac) ; dès qu'il détecte un **résidu hors conteneur**, il **ne calcule pas** et route la ligne en **« à qualifier »** pour que l'opérateur tranche. Objectif : zéro devinette = zéro erreur silencieuse. C'est le rôle du dropdown « catégorie de conditionnement » et du compteur « lignes à qualifier » de la maquette.

**Échantillon élargi (2026-07-28).** Deux manifestes **0 % conteneurisé** reçus (transporteur **SAGA LIBREVILLE**, bureau **OW110**), qui répondent en partie à la demande DEX du 2026-07-14 :
- **Vrac liquide** (navire *BITU RIVER* — bitume, acide, additifs) : 8 BL, pas de `ctn_segment`, `Gross_mass` renseigné, **pas de `Volume_in_cubic_meters`** → seule l'assiette **tonne** est disponible (la règle « unité payante = max(métrique, cubage) » est triviale faute de cubage). Cas net → **auto ✔**.
- **Véhicules RoRo** (navire *OLYMPIAN HIGHWAY* — Toyota, Kia) : 5 BL, pas de `ctn_segment`, `Gross_mass` **et** `Volume_in_cubic_meters` présents, mais **`Number_of_packages = 0`** alors que les véhicules de tourisme se facturent **à l'unité**. Le seul comptage possible (numéros de châssis dans `Goods_description`) est **partiel** : sur l'échantillon, 2 BL sur 5 ont la liste de châssis **vide**. → ces BL tombent dans **« pur vrac — assiette manquante »** = qualification manuelle.

**Point ouvert (à vérifier sur pièce) :** toujours **aucun BL mixte** dans l'échantillon. À confirmer sur un manifeste mixte réel : est-ce que le `Goods_segment` **se répète** (une ligne de marchandise par nature → séparable) ou reste **agrégé** (→ qualification manuelle obligatoire) ?

**Le groupage, lui, est tranché** (ADR-0049) : il reste absent de l'échantillon de référence, mais les deux questions qu'il posait — comment le compter, comment le facturer — ont reçu leur réponse plutôt que d'attendre le fichier qui les aurait posées en production.

## Le segment général : ce que le fichier dit de l'escale _(2026-08-27, ADR-0048)_

Le `General_segment` n'est pas qu'un en-tête : c'est le seul endroit du fichier où l'on peut vérifier qu'on tient bien le manifeste **de cette escale**. Il est lu d'un bloc (`EnTeteLu`) et **résumé à l'écran avant tout enregistrement** — le consignataire voit ce qu'il s'apprête à importer, et décide.

| Donnée | Balise | Confrontée à | Verdict |
|---|---|---|---|
| **Navire** | `Identity_of_transporter` | navire du dossier | **rejet** — préfixe aplati (la balise est bornée à 27 caractères) |
| **N° de voyage** | `Voyage_number` | `voyage_normalise` | **rejet** — le plus discriminant des deux |
| **Sens** | `Bol_nature` (niveau BL) | sens du dossier | **rejet** — balise absente = accepté |
| **Connaissements** | `Totals_segment` | contenu réel | **rejet** — un manifeste tronqué n'est pas facturable |
| **Conteneurs** | `Totals_segment` | boîtes distinctes **ou** lignes `ctn_segment` | **rejet** si l'annonce ne tombe sur **aucun** des deux (ADR-0049) — le groupage sépare légitimement ces deux comptes, la troncature non |
| **Groupage** | `Ctn_reference` répétée | — | réserve — il change le nombre de boîtes manutentionnées, donc le montant |
| **Masse brute** | `Total_gross_mass` | cumul des BL | réserve au-delà de 100 kg |
| **Pavillon** | `Nationality_of_transporter_code` | `navires.pays.code` | réserve — **seulement sur 2 lettres** : le schéma admet `LR` comme `LBR`, le référentiel ne connaît que l'alpha-2 |
| **Immatriculation** | `Registration_number_of_transport_code` | `navires.imo` | réserve — **seulement si 7 chiffres** : le même champ porte l'indicatif d'appel (`5LCQ4` chez MSC) ou l'OMI (`9403360` chez GINA) |
| **Émetteur** | `Shipping_Agent_name`, sinon `Carrier_name` | consignataire du dossier | réserve — ⚠ la balise nomme l'**agent local** (MSC GABON SA, SAGA LIBREVILLE), jamais l'armement propriétaire |
| **Date d'arrivée** | `Date_of_arrival` | `mouvements_navire.eta` | réserve — c'est la date **RÉELLE** d'arrivée (CGC, 2026-08-27), donc elle se compare à l'accostage constaté, **jamais** à l'`eta_prevue` du dossier |
| **Bureau de douane** | `Customs_office_code` | — | **affiché, non contrôlé** : c'est un bureau, pas un port. `OW110` figure sur un fichier à destination `GAPOG` |
| Dates de départ, ports départ / destination | `Date_of_departure`, `Load_unload_place` | — | affichés |

**Deux niveaux, et un seul ferme la porte.** Ce qui **désigne** le dossier rejette ; ce qui le **décrit** se signale et laisse passer. Le référentiel CGC n'est pas opposable au déclarant : une fiche navire sans OMI est un manque interne, pas une faute du consignataire.

**Rien ne se compare contre du vide.** Une donnée absente d'un côté ou de l'autre n'est pas un écart — c'est une comparaison qui n'a pas lieu.

Le n° de manifeste **n'apparaît pas** dans le résumé : aucune balise ne le porte, e-CDTS l'attribue à l'écriture (ADR-0046).

## État du parseur _(2026-08-27, ADR-0045)_

`LitUnManifesteAwmds` met en œuvre ce document. Ce qu'il tolère et ce qu'il refuse, en un coup d'œil :

| Situation | Comportement |
|---|---|
| `Type_of_container` = `20` / `40` / `20G1` | taille seule retenue ; toute autre valeur → boîte **à qualifier**, jamais arrondie |
| Tare sous `Empty_weight` **ou** `Goods_weight` | les deux lues, jamais confondues avec le poids marchandise |
| Groupage (même `Ctn_reference` sous N BL) | comptée **une** boîte |
| `Master_bol_ref_number` **ou** `Master_information` | les deux lues (le XSD dit l'un, les fichiers MSC l'autre) |
| Écart de BL ou de conteneurs vs `Totals_segment` | **rejet** du fichier |
| Écart de masse ≤ 100 kg | ignoré ; au-delà → **signalé, jamais rejeté** |
| `Totals_segment` absent | signalé — les comptes n'ont pas pu être vérifiés |
| `Bol_nature` divergent du sens du dossier | **rejet** ; balise absente → accepté |
| `Voyage_number` divergent du dossier | **rejet** ; comparaison sur la forme normalisée (ADR-0009) |
| `Identity_of_transporter` divergent du navire | **rejet** ; comparaison sur préfixe aplati — la balise est bornée à 27 caractères |
| Navire **et** voyage divergents | **rejet** en nommant les deux escales : le fichier est celui d'un autre dossier, pas une faute de saisie |
| BL sans `ctn_segment` | entièrement hors conteneur (`Bol_type_code` ignoré : il ment) |
| Colis des boîtes tous à 0 | donnée **absente**, pas un résidu |
| Colis du BL > somme des boîtes déclarantes | résidu → part hors conteneur |
| Pavillon en 3 lettres (`LBR`) | **non comparé** — le référentiel ne connaît que l'alpha-2 |
| `Registration_number` qui n'est pas un OMI (`5LCQ4`) | **non comparé** — indicatif d'appel, autre nature |
| Pavillon / OMI / émetteur / arrivée divergents | **réserve**, jamais rejet (ADR-0048) |
| Entités XML externes | non résolues (`LIBXML_NONET`) |

**Le fichier est lu deux fois** : une première pour l'aperçu — qui n'écrit rien —, une seconde à la confirmation, pour écrire (ADR-0048). Les mêmes contrôles s'appliquent aux deux passages ; l'aperçu ne les assouplit pas, il les avance.

Le n° de manifeste n'est lu **nulle part** : aucune balise ne le porte — `Port_voyage_id`, seul candidat par sa forme, est **commenté** dans `Awmds-SVG.xsd`. **e-CDTS l'attribue** (ADR-0046).

## Règles de codage (pas des colonnes)
- **Sens (import / export)** : lisible dans `Bol_id/Bol_nature` — **`22` = export, `23` = import** (vérifié : voyages export GALBV→étranger tout en `22` ; imports étranger→GALBV/GAPOG tout en `23`). Cohérent avec le sens du voyage (`General_segment/Load_unload_place`) et avec « un dossier par sens ».
- **Sec / réfrigéré** _(corrigé 2026-07-09)_ : **ne se déduit PAS du type conteneur**. Le profil gabonais ne transmet que la **taille** (`20`/`40`/`45`), jamais le code ISO 6346 frigo. La distinction sec/frigo se fait par **mots-clés de la description** (`FROZEN`, `REEFER`, `RF`, `CONGELÉ`, `HI-CUBE REEFER`, `-18C`…), avec la **tare en indice secondaire** (un 40' frigo pèse ~4 400–4 800 kg à vide contre ~3 700–3 900 pour un 40' sec). Ce n'est **pas** une colonne du tableau.
- **Code HS : exclu.** Il varie d'un pays à l'autre, n'entre pas dans la catégorisation, et n'est de toute façon **pas un champ structuré** (parfois noyé dans la description).
- **BIETC / BESC** _(constat 2026-07-09, nuancé le 2026-07-28)_ : **l'emplacement dépend du profil transporteur.** Sur MSC/DELMAS il est **noyé dans `Goods_description`** (ex. `BIETC NO.: 0632858`) → à parser depuis le texte. Sur le profil **SAGA LIBREVILLE** il est porté par une **balise dédiée `Shipping_marks`** (ex. `BIETC:0675165`). Le parseur doit donc chercher aux **deux endroits** selon le profil.

## Ignoré à ce stade
`Notify` (notify party), `Marks1/2/3` (marques & scellés), `Sealing_Party`, `Value_segment` (fret/valeurs à 0 dans le profil), mode de transport : sans intérêt pour la liquidation.

## Points de vigilance parseur
- **Noms de balises variables entre transporteurs** : MSC donne `Type_of_container=40` ; un vieux DELMAS donne `20G1` (code ISO partiel) et nomme le poids conteneur `Goods_weight` au lieu de `Empty_weight`. Le parseur doit tolérer ces variantes de profil.
- **Deux niveaux de ports** : `General_segment` = port Gabon (Owendo `OW100`, Port-Gentil `GAPOG`) ; `Bol_segment` = origine/destination réelles (transbordement). Pour la CDTS, le port de rattachement est le **port Gabon**.
