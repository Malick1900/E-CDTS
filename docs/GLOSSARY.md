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
| Dossier d'escale | Dossier ouvert par l'agent consignataire pour un voyage de navire (navire + armement) ; conteneur de tout le circuit jusqu'à clôture | `PortCall` ou `Escale` _(à trancher)_ | Reste « ouvert » tant que la date à quai/sortie n'est pas confirmée par la situation portuaire |
| Situation portuaire | État publié des mouvements de navires (en rade, à quai, en départ), alimenté quotidiennement depuis la conférence portuaire | — | Référence qui conditionne la facturation |
| Armement | Compagnie maritime exploitant des navires (Maersk, CMA CGM, MSC…) — l'entreprise, au sens portuaire | `ShippingLine` _(proposition)_ | Le consignataire affecte les armements à ses agents. Référentiel : gestion à confirmer (Q10) |
| Armateur | Celui qui « arme » le navire : le possède et/ou l'exploite (équipage, entretien). Un armement peut exploiter sans être propriétaire (affrètement) | — | Dans e-CDTS on manipule des **armements** (compagnies), pas des armateurs individuels |
| Agent consignataire | Personne physique employée par la société consignataire, utilisateur du portail ; ne travaille que sur les armements que son consignataire lui a affectés | `ConsigneeAgent` _(proposition, à revalider avec le nom retenu pour consignataire)_ | Compte créé par l'Administrateur CGC, activé/désactivé par le consignataire |
| Nomenclature CGC | Grille des catégories tarifaires CDTS du CGC (cf. `BAREME-CDTS.md`) | — | Le « passage à la nomenclature » = catégorisation des lignes du manifeste |
| Conditionnement | Mode de présentation de la marchandise (conteneur, sacherie, vrac, véhicule…) déterminé au dépouillement | — | Première étape du WF5 |
| BIETC | Bordereau d'Identification Électronique de Traçabilité des Cargaisons _(signification à confirmer)_ | — | Condition de clôture : tous les BL doivent être couverts par un BIETC. **Source de la donnée à confirmer** |
| Devis | Estimation chiffrée de la CDTS, générée après le PV de réconciliation | `Quote` / `quotes` _(proposition)_ | Précède la facture |
| Facture | Facture de la CDTS émise au consignataire | `Invoice` / `invoices` _(proposition)_ | |
| Règlement | Paiement de la facture CDTS | `Payment` / `payments` _(proposition)_ | Fin de la chaîne côté recouvrement |
| Navire / Voyage | Un manifeste correspond à un navire pour un voyage donné | `Vessel` / `Voyage` _(proposition)_ | |
| Booking | Grand cahier où l'agent recopiait à la main les données des manifestes | — | **Processus actuel, appelé à disparaître** ; ne pas confondre avec le sens maritime usuel de « booking » (réservation de fret) |
| Conférence portuaire | Point de départ de la chaîne couverte par e-CDTS | — | Périmètre exact à préciser lors du cadrage |
| Connaissement (BOL) | Titre de transport d'une expédition dans le manifeste (Bill of Lading) | `<Bol_segment>` dans l'AWMDS | Un manifeste = 1 segment général + N connaissements |
| Dégroupage | Éclatement d'un connaissement maître (cargo consolidé) en connaissements fils | Flux `Awbolds` (ASYCUDA) | Inclusion dans le périmètre e-CDTS à trancher |

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
