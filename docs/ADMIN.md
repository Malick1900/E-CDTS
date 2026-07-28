# Espace d'administration — e-CDTS

> Périmètre du back-office CGC. Ce document dit **ce que l'admin gère** et, tout aussi important, **ce qu'il ne gère pas**. Décision de référence : **ADR-0010** (frontière règles = code / admin = données) et **ADR-0002** (rôles cumulables).

## La ligne de partage (à ne jamais franchir)

- **Les règles métier = du code.** Moteur de liquidation (unité payante à l'avantage du CGC, sec/frigo, ligne régulière/tramping), règles de classification, règles de catégorisation manifeste → nomenclature : implémentées en **service / action Laravel**, testées, versionnées par le code. **Elles ne sont pas des réglages d'un panneau.**
- **Le barème = une donnée.** L'admin édite la **grille** de valeurs `nomenclature CGC ↔ prix ↔ unité` (versionnée, ADR-0006). Le moteur codé **lit** cette grille ; il ne se configure pas depuis l'admin.
- **Le transactionnel n'est pas « administré ».** Dossiers, manifestes, PV, devis, factures, situation portuaire sont pilotés par les **workflows**, pas par le panneau. L'admin n'y touche que via ses permissions d'exploitation (audit, déblocage), pas via un module admin dédié.

## Les 4 modules du panneau

### 1. Utilisateurs & habilitations
- Créer / gérer les **utilisateurs internes CGC**.
- Créer les **consignataires** (comptes maîtres, WF1) et **valider les comptes agents** que le consignataire crée lui-même — la validation CGC laisse une **trace opposable** (non-répudiation, ADR-0013).
- **Gérer les rôles et les permissions** (RBAC, ADR-0012). Le **catalogue de permissions** est défini par le **code** (chaque permission = un crochet d'autorisation testé ; on n'en crée pas depuis l'UI). La **composition des rôles est éditable** : l'admin peut, en exploitation et sans déploiement, créer un rôle, ajouter/retirer des permissions existantes à un rôle. L'écran « Rôles & permissions » est une **matrice cochable**.
- **Assigner** un ou plusieurs rôles à un compte. **Modèle many-to-many** : rôles **cumulables** (jamais un enum de rôle unique). Permissions effectives = **union** des permissions des rôles. « Administration » est un jeu de permissions **cumulable avec l'exploitation** — un admin CGC opère aussi les workflows (situation portuaire, dépouillement…).
- **Garde-fous** (ADR-0012) : rôle **super-admin protégé** (non modifiable/supprimable) ; interdiction de retirer sa propre capacité d'administration ; toute mutation de rôle/permission **tracée au journal d'audit** (module 4).
- ⚠️ **Catalogue de rôles par défaut encore à cadrer** (ADR-0012) : les rôles esquissés (Agent DEX, Chef Régulation, Contrôleur, Recouvrement, lecture seule…) sont flous ; leur liste initiale et leur composition feront l'objet d'un cadrage dédié — ce ne sont plus que des **valeurs de départ éditables**.
- Affectation **agent consignataire ↔ armements** : l'agent n'opère que sur les armements qui lui sont affectés.

### 2. Référentiels (master data — CGC seul en écriture)
- **Navires** — porte le **type** et l'attribut **ligne régulière / tramping** (lu par le moteur de calcul ; ADR-0006). Clé de réconciliation (ADR-0009).
- **Armements** (compagnies maritimes) — **armement et armateur fusionnés** ; identité société complète (nom, sigle, pays d'origine, pays d'immatriculation, gérant, RCCM/NIF, adresse). Relation N-N avec les consignataires. Cf. `ENTITES.md`.
- **Ports** — code UN/LOCODE ; multi-ports dès la phase 1 (ADR-0005).
- **Types de navire** — référentiel extensible.

> Les consignataires (côté écriture) sont créés depuis le module 1 (société liée au compte). Ici, ils sont référencés en lecture par les autres référentiels.

### 3. Barème
- Saisie / édition de la **grille tarifaire par nomenclature CGC** — **valeurs uniquement**, versionnée. On n'écrase jamais un tarif : nouvelle version ; un devis déjà liquidé reste sur son barème d'origine (ADR-0006).

### 4. Journal d'audit
- **Connexions** : qui s'est connecté, quand, à quelle heure.
- **Trace des actions majeures** : ouverture / suppression / validation de dossier, et actions assimilées.
- Adossé à l'**identifiant interne immuable** du dossier (ADR-0008) — traçabilité de plateforme d'État.
- **Fil d'Ariane du dossier** (ADR-0013) — *vue métier, pas un module admin* : chaque dossier expose son **parcours** (ouverture → manifeste → dépouillement → PV → validation → devis → clôture) avec **qui a fait quoi et quand**, interventions de l'administrateur incluses. Alimenté par la même traçabilité que l'audit, mais présenté **sur le dossier** ; l'audit reste la vue transversale.

## Ce qui n'est PAS dans le panneau admin

- Les **règles** de calcul / classification / catégorisation → **code**.
- La **configuration du moteur** de liquidation → **code**.
- La **supervision transactionnelle** (dossiers, manifestes, devis, situation portuaire) → **workflows**, accessibles à l'admin via ses permissions d'exploitation, pas comme module admin.
- La **réconciliation** navire+voyage → écran métier « dossiers en attente de rapprochement », filet manuel réservé au **consignataire** (ADR-0009).

## Points ouverts (à trancher avant de concevoir les écrans)

- ~~**Granularité des permissions** : matrice CRUD par module, ou habilitations plus grossières ?~~ **Tranché (ADR-0012)** : permissions fixées par le code, **rôles recomposables/créables depuis l'admin** (matrice éditable), garde-fous. Reste à cadrer le **catalogue de rôles par défaut** (chantier dédié).
- **Q7** : périmètre de visibilité de l'agent consignataire au-delà de ses armements affectés.
- **Q5 / BIETC** : faut-il un **référentiel BIETC** administrable, ou reste-t-il du texte parsé dans la description cargo ? (impacte le module 2)
