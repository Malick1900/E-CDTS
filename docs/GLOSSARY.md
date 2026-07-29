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
| Consignataire | Société mandataire de l'armement dans le port (ex. SAGA) ; peut représenter plusieurs armements ; gère ses agents et leur affecte les armements | `Consignee` ou `ShippingAgent` _(à trancher)_ | Attention : en anglais maritime, « consignataire de navire » = *ship agent* ; « consignee » = destinataire de la marchandise — **à valider avant de nommer**. **Nature tranchée** (ADR-0023) : le consignataire est une **société**, pas un compte. Elle est désignée par un compte **titulaire** (`consignataires.titulaire_user_id`), qui crée à son tour les comptes de ses agents. C'est elle qui est facturée, jamais la personne qui déclare |
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
| Agent consignataire | Personne physique employée par la société consignataire, utilisateur du portail ; ne travaille que sur les armements que son consignataire lui a affectés | `users` avec `consignataire_id` renseigné | Compte **créé par le titulaire de sa société**, puis **validé par le CGC** avant de pouvoir servir (ADR-0013, WF1) — le CGC valide par derrière, il ne crée pas. Un refus reste en base comme trace opposable (ADR-0024). Activation/désactivation ensuite par le consignataire |
| Titulaire du compte | La personne qui gère le compte de la société consignataire : elle crée les comptes de ses agents **et déclare elle-même**. Une société n'en a qu'un | `consignataires.titulaire_user_id` → `users` | Ouvert par le CGC depuis la fiche société, **actif immédiatement** — le circuit de validation d'ADR-0013 ne vise que les comptes ouverts par la société elle-même (ADR-0027). C'est un agent déclarant comme les autres, avec une portée d'armements ; « titulaire » est un marqueur, pas un statut à part. Une société peut exister avant qu'il ne soit désigné : la colonne affiche alors « À désigner ». Il reçoit un courriel l'invitant à **définir son mot de passe** — le CGC n'en connaît jamais la valeur (ADR-0028) |
| Remplacer le titulaire | Confier la fonction de titulaire à une autre personne : un agent déjà validé de la société, ou quelqu'un dont on ouvre le compte à cette occasion | Route dédiée `…/consignataires/{id}/titulaire` | **N'est pas** modifier l'identité du titulaire en place (cela édite son compte). Le sortant **reste agent déclarant**, avec ses affectations : lui retirer l'accès est un autre geste. Action sensible, à journaliser à l'audit (ADR-0027) |
| Statut d'un compte agent | Les **quatre états** de l'écran de validation : `en attente` (demande soumise), `actif` (validée, l'agent se connecte), `désactivé` (validée puis suspendue), `refusé` (demande rejetée, motif consigné) | `users.statut_validation` × `users.is_active` | Deux colonnes distinctes : la **décision du CGC** et l'**activation** (seule lue à la connexion). Refuser tranche une demande ; désactiver interrompt un accès accordé — ce n'est pas la même chose. Un refus **n'est pas définitif** : la société peut soumettre à nouveau, la décision précédente restant lisible (ADR-0026) |
| Compte client | Compte d'un tiers du portail — titulaire d'un consignataire ou agent consignataire — par opposition au **compte interne** d'un agent du CGC | `users` (mêmes comptes, distingués par leur rattachement) | Ses droits découlent de son **rattachement** (société, armements affectés), pas d'un rôle : le catalogue de rôles ne sert que les internes (ADR-0025). Création et validation réservées à l'Administrateur (`comptes-clients.gerer`) |
| Recomposer un rôle | Modifier la liste des permissions portées par un rôle existant. **N'est pas** créer, renommer ou supprimer un rôle : le catalogue des rôles reste celui du code | `syncPermissions()` (spatie/laravel-permission) | Geste réservé à l'Administrateur (`roles.gerer`). La ligne Administrateur n'est pas recomposable : elle porte le catalogue complet par définition (ADR-0025) |
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
