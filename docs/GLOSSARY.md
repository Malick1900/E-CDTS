# Glossaire métier

> **Pourquoi ce fichier ?** Pour que l'agent utilise **les vrais termes du domaine**, pas une approximation inventée. Un terme métier mal nommé se propage partout : noms de tables, de classes, d'URL, de libellés UI. Ce fichier est la **source de vérité du vocabulaire** du projet.

## Comment l'utiliser
- L'agent **consulte** ce glossaire avant de nommer une entité, une table, une classe ou un libellé.
- Face à un terme métier inconnu ou ambigu → **poser la question** à l'humain, puis **l'ajouter ici**.
- Chaque terme relie le mot métier (langage de l'utilisateur) à son nom technique (code/DB).
- Mis à jour via `/refresh-context`.

## Format
> Les noms techniques marqués _(proposition)_ sont à valider lors de la modélisation (`/grill`).

| Terme métier | Définition | Nom technique (code / table) | Notes |
|---|---|---|---|
| CDTS | Commission sur le droit de trafic sectoriel — contribution calculée et facturée sur les marchandises transitant par les navires | — | C'est **l'objet facturé**, pas une entité en soi |
| Liquidation des droits de trafic | Processus de calcul et de facturation de la CDTS | — | Activité cœur du CGC que e-CDTS digitalise |
| Manifeste cargo | Document officiel listant, expédition par expédition, toutes les marchandises à bord d'un navire pour un voyage donné (poids, volume, quantités, conteneurs…) | `Manifest` / `manifests` _(proposition)_ | Transmis au format **XML** par les consignataires dans e-CDTS (avant : PDF/papier) |
| Expédition | Ligne du manifeste : un envoi de marchandises identifié | `Shipment` / `shipments` _(proposition)_ | Unité de détail du manifeste |
| Consignataire | Société mandataire de l'armement dans le port (ex. SAGA) ; peut représenter plusieurs armements ; gère ses agents et leur affecte les armements | `Consignee` ou `ShippingAgent` _(à trancher)_ | Attention : en anglais maritime, « consignataire de navire » = *ship agent* ; « consignee » = destinataire de la marchandise — **à valider avant de nommer**. ⚠️ **Nature ambiguë dans l'app** : entité seule ou aussi compte de connexion opérant ? → Q14 de `QUESTIONS-CGC.md` |
| Dépouillement | Lecture et vérification, une par une, des quantités du manifeste | — | Automatisé par e-CDTS (aujourd'hui fait à l'œil par un agent) |
| PV de réconciliation | Accord contradictoire sur quantités/catégories : le système propose la nomenclature, le consignataire valide ligne par ligne, le CGC valide et génère le PV | `ReconciliationReport` _(proposition)_ | Cf. WF5 dans `WORKFLOWS-METIER.md` |
| Dossier d'escale | Dossier ouvert par l'agent consignataire pour un voyage de navire (navire + armement), **porteur d'un sens (import ou export)** ; conteneur de tout le circuit jusqu'à clôture | `PortCall` ou `Escale` _(à trancher)_ | **Un dossier par sens** : import et export sur le même passage = deux dossiers. Verrou de transmission directionnel : import → navire « à quai », export → navire « sorti » (date confirmée). Identité : identifiant interne stable + libellé affiché provisoire → n° de manifeste (ADR-0008) |
| Numéro de dossier (libellé) | Le **numéro visible** du dossier : **provisoire** à l'ouverture (avant manifeste), puis remplacé par le **n° de manifeste** une fois celui-ci rattaché, et figé | — | Libellé d'affichage **mutable** ; ce n'est **pas** la clé technique. Cf. ADR-0008 |
| Référence interne (dossier) | **Identifiant technique stable** du dossier, créé à l'ouverture, jamais modifié ni réutilisé ; support de toute la traçabilité (PV, devis, journal, liens) | `id` / `uuid` _(à trancher)_ | Non mis en avant dans l'UI de travail ; consultable pour l'audit. Cf. ADR-0008 |
| Situation portuaire | État publié des mouvements de navires, alimenté quotidiennement depuis la conférence portuaire. **6 statuts** : `en attente` → `en rade` → `à quai` → `hors zone` → `en zone d'exploitation` → `sorti` | — | Référence qui conditionne la facturation ; **source unique** des dates d'accostage/départ lues par les dossiers (ADR-0009). **Consultable en lecture seule sans connexion** (lien depuis l'accueil / la page de connexion). Cf. `ENTITES.md` |
| Rapprochement (dossier ↔ situation) | Liaison d'un dossier d'escale à la ligne de situation portuaire de son navire, via la clé `navire + voyage`. **Automatique** si les voyages normalisés coïncident, sinon **manuel** (1 clic, par le consignataire) | — | Clé normalisée = MAJUSCULES + sans espaces (tirets/car. spéciaux conservés). Principe « saisi une fois, sélectionné ensuite ». Cf. ADR-0009 |
| Verrou de transmission | Condition **calculée** (jamais stockée) autorisant la transmission d'un dossier au CGC : import → navire « à quai » + date d'accostage ; export → navire « sorti » + date de départ | — | S'ouvre seul quand le DEX met à jour la situation portuaire. Cf. ADR-0009, WF3 |
| Dossier orphelin | Dossier ouvert dont le navire n'est pas (encore) rapproché à la situation portuaire ; visible dans l'écran « en attente de rapprochement » | — | Stade **brouillon** (ni manifeste injecté, ni soumis au CGC) → **suppression pure** possible ; sinon **annulation** avec motif. Cf. ADR-0009 |
| Armement | Compagnie maritime exploitant des navires (Maersk, CMA CGM, MSC…) — l'entreprise, au sens portuaire. **Armement et armateur ne font qu'un** dans e-CDTS : une seule fiche | `ShippingLine` _(proposition)_ | Identité société complète : **nom, sigle, pays d'origine, pays d'immatriculation, gérant, RCCM/NIF, adresse**. Représenté par plusieurs consignataires. Référentiel CGC. Cf. `ENTITES.md` |
| Armateur | Le propriétaire/exploitant du navire. **Fusionné avec l'armement** : e-CDTS ne manipule pas d'armateur séparé, ses coordonnées sont portées par la fiche armement | — | Décision 2026-07-27 : plus d'objet distinct ; voir la fiche **Armement** |
| Agent consignataire | Personne physique employée par la société consignataire, utilisateur du portail ; ne travaille que sur les armements que son consignataire lui a affectés | `ConsigneeAgent` _(proposition, à revalider avec le nom retenu pour consignataire)_ | Compte créé par l'Administrateur CGC, activé/désactivé par le consignataire |
| Nomenclature CGC | Grille des catégories tarifaires CDTS du CGC (cf. `BAREME-CDTS.md`) | — | Le « passage à la nomenclature » = catégorisation des lignes du manifeste |
| Conditionnement | Mode de présentation de la marchandise (conteneur, sacherie, vrac, véhicule…) déterminé au dépouillement | — | Première étape du WF5 |
| BIETC | Bordereau d'Identification Électronique de Traçabilité des Cargaisons _(signification à confirmer)_ | — | Condition de clôture : tous les BL doivent être couverts par un BIETC. **Source de la donnée à confirmer** |
| Devis | Montant liquidé de la CDTS, calculé par e-CDTS (barème × quantités du PV validé) et transmis à la DAF | `Quote` / `quotes` _(proposition)_ | Confirmé dans le périmètre (ADR-0006) ; la facture officielle, elle, est établie par la DAF hors app |
| Unité payante | L'unité retenue pour la facturation quand tonne et m³ sont possibles : celle qui donne le montant le plus élevé, « à l'avantage du CGC » | — | Terme officiel CGC (2026-07-03) |
| PV provisoire | La déclaration de classification faite par le consignataire, qui fait office de dépouillement avant validation CGC | — | Devient PV de réconciliation définitif après la navette de validation (ADR-0007) |
| Facture | Facture de la CDTS émise au consignataire | `Invoice` / `invoices` _(proposition)_ | |
| Règlement | Paiement de la facture CDTS | `Payment` / `payments` _(proposition)_ | Fin de la chaîne côté recouvrement |
| Navire / Voyage | Un manifeste correspond à un navire pour un voyage donné | `Vessel` / `Voyage` _(proposition)_ | |
| Booking | Grand cahier où l'agent recopiait à la main les données des manifestes | — | **Processus actuel, appelé à disparaître** ; ne pas confondre avec le sens maritime usuel de « booking » (réservation de fret) |
| Conférence portuaire | Point de départ de la chaîne couverte par e-CDTS | — | Périmètre exact à préciser lors du cadrage |
| Connaissement (BOL) | Titre de transport d'une expédition dans le manifeste (Bill of Lading) | `<Bol_segment>` dans l'AWMDS | Un manifeste = 1 segment général + N connaissements |
| Dégroupage | Éclatement d'un connaissement maître (cargo consolidé) en connaissements fils | Flux `Awbolds` (ASYCUDA) | Inclusion dans le périmètre e-CDTS à trancher |
| Manifeste additif | Dépôt complémentaire au manifeste initial (même numéro) : ajoute des BL oubliés | — | **Procédure exceptionnelle post-validation** (dossier déjà validé/facturé), par profil habilité CGC. Avant validation : simple redépôt libre |
| Manifeste rectificatif | Dépôt correctif (même numéro) : remplace des lignes précises du manifeste précédent | — | Même régime que l'additif ; le dossier consolide les dépôts |

## Statuts & énumérations
> Lister ici les valeurs fermées du domaine (elles doivent correspondre aux enums PHP — cf. `ARCHITECTURE.md`).

| Enum | Valeurs | Signification |
|---|---|---|
| _(à définir au cadrage)_ | — | Cycles de vie probables : manifeste, dépouillement, devis, facture, règlement |

## Acronymes & abréviations
| Sigle | Signification |
|---|---|
| CDTS | Commission sur le droit de trafic sectoriel |
| CGC | Conseil Gabonais des Chargeurs (établissement public sous tutelle du Ministère des Transports) |
| PV | Procès-verbal (de réconciliation) |
| KPI | Key Performance Indicator — indicateur de performance suivi par e-CDTS |
| ASYCUDA / SYDONIA | Automated SYstem for CUstoms DAta — système douanier de la CNUCED (SYDONIA World = nom français, utilisé par les douanes gabonaises) |
| AWMDS | ASYCUDA World Manifest Data Stream — format XML officiel du manifeste cargo (racine `Awmds`, validé par `Awmds.xsd`) |
| ASYFCI | ASYCUDA Fast Cargo Integration — module ASYCUDA d'intégration des manifestes XML |
| UN/LOCODE | Code ONU des lieux/ports (ex. GALBV = Libreville) |
| DOSI | Direction informatique du CGC, en charge du développement de la plateforme e-CDTS ; mène les simulations de catégorisation avec la DEX |
| DEX | Direction de l'Exploitation du CGC, en charge de la gestion de la plateforme e-CDTS |
