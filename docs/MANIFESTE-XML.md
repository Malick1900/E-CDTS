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

**Groupage (1 conteneur ↔ N BL)** : n'existe pas comme lien explicite ; un conteneur groupé se répète à l'identique dans plusieurs `Bol_segment`. → **comptage des boîtes = n° de conteneur distincts** (déduplication globale), jamais « une boîte par ligne ».

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
3. **« TOTAL TC » = conteneurs distincts, pas lignes.** Un conteneur groupé apparaît sous plusieurs BL → il ne compte **qu'une boîte** (déduplication sur `Ctn_reference`).

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

**Point ouvert (à vérifier sur pièce) :** toujours **aucun BL mixte** ni **aucun groupage** dans l'échantillon. À confirmer sur un manifeste mixte réel : est-ce que le `Goods_segment` **se répète** (une ligne de marchandise par nature → séparable) ou reste **agrégé** (→ qualification manuelle obligatoire) ?

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
