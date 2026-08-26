# Barème CDTS (Commission sur le droit de trafic sectoriel)

> Source : grille officielle CGC transmise par le porteur du projet le 2026-07-02.
> Parité fixe FCFA/EUR : 1 € = 655,957 FCFA (la colonne Euro est une conversion, le FCFA fait foi).
> **Statut : en cours de cadrage** — les « Notes de gestion » (règles d'application) restent à intégrer.

## À l'IMPORT

### 1. Conteneurs (au forfait / unité)
| Code | Type | FCFA | Euro |
|---|---|---:|---:|
| IMP04 | 20' sec | 17 632 | 26,88 € |
| IMP03 | 20' réfrigéré | 30 856 | 47,04 € |
| IMP06 | 40' sec | 32 326 | 49,28 € |
| IMP05 | 40' réfrigéré | 36 734 | 56,00 € |
| IMP07 | 45' sec | 35 264 | 53,76 € |
| IMP08 | 45' réfrigéré | 39 672 | 60,48 € |

### 2. Autres marchandises
| Code | Désignation | Unité | FCFA | Euro |
|---|---|---|---:|---:|
| IMP02 | Sacherie (sucre, farine, céréales) | tonne | 1 102 | 1,68 € |
| IMP11 | Autres emballages | tonne | 1 837 | 2,80 € |
| IMP09 | Véhicule de tourisme | unité | 14 693 | 22,40 € |
| IMP10 | VU et autres — cubage | m³ | 1 837 | 2,80 € |
| IMP10B | VU et autres — métrique | tonne | 2 624 | 4,00 € |
| IMP01 | Conventionnel (autres marchandises) | tonne | 1 968 | 3,00 € |
| IMP17 | Vrac solide — métrique | tonne | 1 312 | 2,00 € |
| IMP18 | Vrac solide — cubage | m³ | 984 | 1,50 € |
| IMP13 | Vrac liquide — métrique | tonne | 1 312 | 2,00 € |
| IMP14 | Vrac liquide — cubage | m³ | 984 | 1,50 € |
| IMP15 | Vrac conteneurisé — métrique | tonne | 1 312 | 2,00 € |
| IMP16 | Vrac conteneurisé — cubage | m³ | 984 | 1,50 € |

## À l'EXPORT

### 1. Conteneurs (au forfait / unité)
| Code | Type | FCFA | Euro |
|---|---|---:|---:|
| EXP04 | 20' sec | 15 428 | 23,52 € |
| EXP03 | 20' réfrigéré | 33 795 | 51,52 € |
| EXP06 | 40' sec | 29 387 | 44,80 € |
| EXP05 | 40' réfrigéré | 33 795 | 51,52 € |
| EXP07 | 45' sec | 35 264 | 53,76 € |
| EXP08 | 45' réfrigéré | 42 506 | 64,80 € |

### 2. Autres marchandises
| Code | Désignation | Unité | FCFA | Euro |
|---|---|---|---:|---:|
| EXP02 | Sacherie | tonne | 735 | 1,12 € |
| EXP09 | Véhicule de tourisme | unité | 11 755 | 17,92 € |
| EXP10 | VU et autres — cubage | m³ | 1 693 | 2,58 € |
| EXP10B | VU et autres — métrique | tonne | 1 968 | 3,00 € |
| EXP01 | Conventionnel (autres marchandises) | tonne | 1 712 | 2,61 € |
| EXP11 | Bois grumes/dérivés conventionnel — lignes régulières | m³ | 1 692 | 2,58 € |
| EXP11B | Bois grumes/dérivés conventionnel — tramping | m³ | 1 909 | 2,91 € |
| EXP12 | Bois grumes/dérivés conteneurisé — lignes régulières | m³ | 1 692 | 2,58 € |
| EXP12B | Bois grumes/dérivés conteneurisé — tramping | m³ | 1 909 | 2,91 € |
| EXP17 | Vrac solide — métrique | tonne | 984 | 1,50 € |
| EXP18 | Vrac solide — cubage | m³ | 656 | 1,00 € |
| EXP13 | Vrac liquide — métrique | tonne | 984 | 1,50 € |
| EXP14 | Vrac liquide — cubage | m³ | 656 | 1,00 € |
| EXP15 | Vrac conteneurisé — métrique | tonne | 984 | 1,50 € |
| EXP16 | Vrac conteneurisé — cubage | m³ | 656 | 1,00 € |

## Nomenclature des types de marchandise (19 types)

> Arrêtée avec le porteur du projet le 2026-08-26. C'est la liste que l'agent a sous les yeux
> à la qualification, ligne par ligne — qu'il saisisse à la main ou qu'il importe un XML.
> Elle reprend les libellés du PV officiel (MSC SPRING III, 2026-07-08), complétés du bois
> et des deux postes rajoutés le 2026-08-26.

**Un type n'est pas une ligne de barème.** Le tarif se résout ensuite par
`type × sens × unité déclarée × conditionnement`, plus le `mode d'exploitation` pour le seul
bois export. Un type ouvre donc jusqu'à quatre lignes selon le sens.

> ⚠ Les références ci-dessous sont celles de `database/seeders/BaremeSeeder.php`, seule
> numérotation qui existe en base. Elle **ne coïncide pas** avec celle de la grille en tête de
> ce document : `IMP02` y désigne la sacherie, en base c'est le bois import. Toute lecture de
> code doit partir du seeder.

| # | Type | Import | Export |
|---|---|---|---|
| 1 | Sacherie — sucre, farine, céréales | IMP08 | EXP08 |
| 2 | Véhicule de tourisme | IMP09 | EXP09 |
| 3 | Véhicule utilitaire & autres (VUA) | IMP10 · IMP14 · IMP15 · IMP16 | EXP10 · EXP13 · EXP14 |
| 4 | Autres marchandises en conventionnel | IMP01 | EXP01 |
| 5 | Liquide conteneurisé | IMP25 · IMP26 | EXP26 · EXP27 |
| 6 | Vrac liquide | IMP21 · IMP22 | EXP22 · EXP23 |
| 7 | Produits dérivés des hydrocarbures | IMP23 · IMP24 | EXP24 · EXP25 |
| 8 | Vrac solide | IMP17 · IMP18 | EXP18 · EXP19 |
| 9 | Produits dérivés des minerais | IMP19 · IMP20 | EXP20 · EXP21 |
| 10 | Conteneur 20'S | IMP04 | EXP04 |
| 11 | Conteneur 40'S | IMP06 | EXP06 |
| 12 | Conteneur 20'F | IMP03 | EXP03 |
| 13 | Conteneur 40'F | IMP05 | EXP05 |
| 14 | Conteneur 45'S | IMP011 | EXP11 |
| 15 | Conteneur 45'F | IMP012 | EXP12 |
| 16 | Bois et produits dérivés en conventionnel | — | EXP02 · EXP02B *(ligne régulière)* · EXP15 *(tramping)* |
| 17 | Bois et produits dérivés conteneurisés | — | EXP16 *(ligne régulière)* · EXP17 *(tramping)* |
| 18 | Autres emballages | IMP13 | — |
| 19 | Minerais et vrac liquide | IMP07 | EXP07 |

### Règles de la liste

- **Types mono-sens** : le bois (16, 17) n'est facturé **qu'à l'export** ; les autres emballages
  (18) n'existent **qu'à l'import**. La liste proposée à l'agent se filtre donc par sens du
  trafic — un type sans ligne dans le sens courant ne s'affiche pas, plutôt que de s'afficher
  à 0 F et d'être choisi par erreur. Un contreplaqué à l'import tombe en `IMP01`.
- **Paires métrique / cubage** : les deux montants sont calculés, on retient le plus élevé
  (unité payante à l'avantage du CGC — cf. Notes de gestion).
- **EVP** : le 45' compte **2 EVP**, comme le 40' ; le 20' en compte 1. La donnée n'existe pas
  dans le manifeste, elle se déduit de la taille.
- **Aucune ligne n'est désactivée** (décision 2026-08-26). `EXP07` et `IMP02` figurent à 0,00
  sur le document transcrit : c'est une valeur, pas un statut, et elle se corrige depuis le
  panneau Admin sans toucher au code.
- **Recouvrement connu** : `IMP07` (minerais et vrac liquide) porte le même tarif à la tonne que
  `IMP21` (vrac liquide métrique) et `IMP19` (dérivés des minerais métrique), mais **n'a pas de
  variante cubage**. Trois entrées plausibles pour un même chargement — à surveiller à la
  qualification.

## Notes de gestion

### Règles confirmées (CGC, 2026-07-03)
- **Unité payante** : quand une catégorie a les deux variantes métrique/cubage (ex. vrac solide IMP17 tonne / IMP18 m³), on calcule les deux montants et on retient **l'unité payante à l'avantage du CGC** (le montant le plus élevé).
- **Lignes régulières vs tramping** (bois export uniquement — EXP11/11B, EXP12/12B ; +~13 % en tramping) : le mode d'exploitation est un **attribut par défaut du navire**, renseigné à son enregistrement dans le référentiel (géré par le CGC). Chaque **escale** hérite ce mode par défaut mais porte sa propre **valeur effective** ; **seul le CGC** peut la modifier, sur demande amont du consignataire, avant l'expédition. **La facturation lit le mode de l'escale**, jamais celui du navire directement — ce qui préserve l'historique et autorise l'exception ponctuelle sans altérer les autres escales du même navire.
- **Exonérations, minimum de perception, arrondis : aucun.** Le barème s'applique tel quel.
- **Le calcul vit dans e-CDTS** (ADR-0006) : l'app applique ce barème aux quantités réconciliées et produit le **devis** ; la facture officielle est établie par la DAF hors app puis téléversée.

### Catégorisation (passage à la nomenclature)
- Le **consignataire classifie lui-même** ses marchandises à la déclaration (PV provisoire), le CGC valide/réfute — cf. ADR-0007.
- Les règles précises de passage manifeste → nomenclature seront affinées par les **simulations DOSI/DEX attendues pour le 30/07/2026** (Q17).
- **Sec vs réfrigéré (`S` / `F`)** _(corrigé 2026-07-09)_ : ne se déduit **pas** du type conteneur du XML — le profil gabonais ne transmet que la **taille** (`20`/`40`/`45`), jamais le code ISO frigo. La distinction se fait par **mots-clés de la description** (`FROZEN`, `REEFER`, `RF`, `CONGELÉ`…), avec la tare en indice secondaire. Détail dans `MANIFESTE-XML.md`.
