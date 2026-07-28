# Champs de données par entité — brouillon d'entretien

> **But** : préparer les entretiens avec les futurs utilisateurs. Pour chaque entité, une liste
> de champs **proposés comme point de départ** (ce qui semble logique d'après le cadrage), et les
> **❓ questions à leur poser** (ambiguïtés, champs non confirmés).
> **Statut : brouillon** — ce n'est PAS encore `DATABASE.md`. Rien n'est figé ; on tranche après les entretiens.
> Convention : puce simple = champ proposé par défaut · **❓** = à confirmer/décider avec les utilisateurs.

---

## A. Référentiels (gérés par le CGC seul)

### 1. Navire
- Nom du navire
- Type de navire *(→ référentiel Type de navire)*
- Pavillon (nationalité)
- Armateur *(⚠ distinct de l'« armement/compagnie » — voir glossaire)*
- Attribut **ligne régulière / tramping** *(énum — lu par le moteur de calcul, bois export)*
- ❓ **Numéro IMO** : le veut-on comme identifiant officiel du navire ? *(jamais mentionné dans le cadrage — à valider)*
- ❓ Autres identifiants utiles (indicatif d'appel, MMSI) ? Selon leurs habitudes.

### 2. Armement (compagnie maritime)
- Nom / raison sociale *(ex. Maersk, CMA CGM, MSC)*
- ❓ Code / identifiant interne : en veulent-ils un, ou le nom suffit ?
- ❓ Coordonnées / contact de la compagnie utiles ?
- *Relations : un armement peut être représenté par plusieurs consignataires (N‑N).*

### 3. Port
- Code UN/LOCODE *(ex. GALBV Libreville, GAOWE Owendo, GAPOG Port‑Gentil)*
- Nom
- Pays
- **Préfixe de numérotation devis/facture** *(ex. `BV` pour Libreville → `DELBV…`/`FALBV…`)*
- ❓ Liste exacte des ports à gérer en phase 1 ?

### 4. Type de navire
- Code *(ex. porte‑conteneurs, cargo général, roulier, minéralier…)*
- Libellé
- ❓ Liste de départ des types à créer ? *(observés sur la situation Owendo réelle : Caboteur, Porte-conteneurs (PC/P-C), Tanker, Centrale flottante, Remorqueur, Minéralier, G/C — cargo général, parfois avec la nature « blé »/« clinker » —, GC, Drague)*
- ⚠ La situation portuaire suit AUSSI des navires **non commerciaux** (remorqueur, drague, centrale flottante) — sans lien CDTS. Le référentiel doit les couvrir.

---

## B. Comptes & accès

### 5. Consignataire (société — compte maître)
- Raison sociale
- Compte de connexion (email / identifiants ; change son mot de passe à la 1re connexion)
- État du compte (actif / suspendu)
- Date d'activation
- ❓ Informations légales à stocker (RCCM, NIF, adresse, contact) ? Lesquelles ?
- ❓ **Nommage technique** : `Consignee` vs `ShipAgent` *(ambiguïté du glossaire — à trancher côté équipe, pas utilisateurs)*
- *Relations : 1‑N agents ; N‑N armements ; 1‑N dossiers.*

### 6. Agent consignataire
- Nom / identité (personne physique)
- Compte utilisateur (identifiants)
- Société de rattachement *(une seule)*
- **État de validation** : créé par le consignataire → **validé par le CGC** / activé → désactivé
- Armements affectés *(N‑N — l'agent n'opère que sur ceux‑ci)*
- ❓ Coordonnées (téléphone, fonction) utiles ?
- ❓ **Q7** : l'agent ne voit‑il QUE les dossiers de ses armements affectés ? *(à confirmer formellement)*

### 7. Utilisateur interne CGC + Rôles + Permissions (RBAC)
- **Utilisateur** : nom, email, identifiants, 2FA / passkeys *(fourni par le starter kit)* — peut cumuler plusieurs rôles.
- **Rôle** : nom, libellé *(composition en permissions éditable ; rôles seedés = valeurs de départ ; un super‑admin protégé)*.
- **Permission** : nom *(catalogue défini par le code)*.
- ❓ **Catalogue de rôles par défaut** (Agent DEX, Chef Régulation, Contrôleur, Recouvrement, Administrateur, lecture seule…) et **qui fait quoi** : chantier dédié à cadrer. *(Ne pas figer maintenant.)*

---

## C. Chaîne transactionnelle

### 8. Situation portuaire (ligne de mouvement navire)
- Navire *(→ Navire)*
- Numéro de voyage *(clé unique navire + voyage)*
- Port
- Sens *(import / export)*
- **Statut navire** : `Navire attendu` · `En rade` · `À quai` · `En zone d'exploitation` · `Sorti`
- Poste à quai *(un seul navire par poste à un instant t)*
- ETA (arrivée prévue) · ETD (départ prévu)
- **Date d'accostage** *(confirmée — ouvre le verrou import)*
- **Date de départ** *(confirmée — ouvre le verrou export)*
- Consignataire responsable *(information descriptive, pas un filtre)*
- **État de validation** : saisie/brouillon → **validée/publiée** *(validée par un supérieur avant publication)*
- Saisi par / validé par *(traçabilité)*
- **HPE — Heure Prévue d'Entrée** *(heure prévue d'accostage ; renseignée pour les navires en rade — ex. 14H00, 06H00)*
- **HPS — Heure Prévue de Sortie** *(heure prévue de départ ; renseignée pour les navires à quai — ex. « 05H00 AC », « 02H00 AC »)*
- Port / terminal de la ligne *(peut différer du port en tête du document — ex. `ANTARES` sur une situation Owendo)*
- *Constat (situation Owendo réelle, 12/11/2024) : les regroupements du document = nos statuts navire (`Quai` · `Zone d'exploitation` · `Sortie` · `Rade d'attente` · `Navires attendus`), plus un bloc « Récapitulatif du week-end ». **Aucun n° de voyage** n'y figure → confirme le rapprochement navire+voyage (ADR-0009). L'app doit pouvoir **régénérer ce rapport** (diffusion OPRAG/Capitainerie, ADR-0005).*
- ❓ Signification exacte de **HPE / HPS** et de la mention « **AC** » (à confirmer / accostage ?).
- ❓ Le « poste à quai » : codé (`P1`–`P4`, `P3/4`, `OCT`, `GSEZ 2`, `ZNE EXPL`…) — liste fermée par port, ou texte libre ? Peut viser deux postes (`P3/4`) ?
- ❓ `ANTARES` : terminal d'Owendo ou port distinct ? *(→ granularité port / terminal / poste)*
- ❓ « **Récapitulatif du week-end** » : rôle de cette section (bloc de synthèse) ?
- ❓ Autres jalons datés voulus (mise à quai, fin d'opérations…) ?

### 9. Dossier d'escale
- **Identifiant interne stable** *(immuable, technique — support de toute la traçabilité)*
- **Libellé affiché (n° de dossier)** *(provisoire à l'ouverture → devient le n° de manifeste, puis figé)*
- Date de figeage du libellé
- Sens *(import ou export — un dossier par sens)*
- Navire · Armement · Numéro de voyage
- Consignataire · Agent ouvreur
- Port
- Référence à la ligne de situation portuaire *(la date est lue, jamais copiée)*
- État de rapprochement *(en attente de rapprochement / rapproché)*
- État du dossier / cycle de vie *(ouvert → transmis → en dépouillement → PV définitif → en facturation → facturé → clôturé ; ou annulé)*
- Motif + date d'annulation
- *Verrou de transmission = **calculé**, pas un champ stocké.*
- ❓ **Liste fermée exacte des états** du dossier : à valider avec eux (jamais listée telle quelle).
- ❓ **Q19** : y a‑t‑il une **date limite de déclaration CDTS** à porter sur le dossier (verrou / retard / pénalité) ?

### 10. Manifeste + Connaissement (BL) + Conteneur — *cœur du dépouillement*

**Manifeste** *(un dossier peut en contenir plusieurs — voir type)*
- Numéro de manifeste *(extrait du XML, ou saisi en manuel — requis ; fige le libellé du dossier)*
- Dossier *(→ Dossier)*
- Mode de saisie *(XML AWMDS / manuel + PDF)*
- Fichier PDF joint *(mode manuel)*
- Code bureau de douane
- Numéro de voyage
- Date + heure d'arrivée
- Identité du transporteur (navire) · Pavillon
- Port de départ / de destination *(UN/LOCODE — détermine le sens)*
- Totaux : nombre de BL, nombre de conteneurs, masse brute totale
- **Type** : initial / additif / rectificatif
- **État** : soumis · en validation · validé · transmis
- Auteur du dépôt + date
- ❓ **BIETC/BESC** *(Q5)* : d'où vient la donnée « ce BL est couvert par un BIETC » ? champ saisi, référentiel administrable, ou texte parsé de la description ? Signification exacte du sigle ?

**Connaissement / BL** *(la maille du tableau de dépouillement)*
- N° de BL · Numéro de ligne
- Type / groupage *(BL simple vs house/dégroupage)*
- Nature du BL *(code `22` = export, `23` = import)*
- Port de chargement · Port de déchargement *(UN/LOCODE réels du BL)*
- Expéditeur · Destinataire
- **Description marchandise** *(base de la catégorisation ; contient BIETC et indices sec/frigo)*
- Poids brut (kg → tonnes) *(au niveau BL)*
- Volume (m³) *(au niveau BL)*
- Nombre de colis / unités *(facturation à l'unité — véhicules)*
- Nombre de conteneurs de ce BL
- Catégorie de conditionnement *(saisie au dépouillement — sacherie, conteneur, vrac, véhicule…)*
- ❓ Champs du BL qu'ils consultent réellement au dépouillement qu'on aurait oubliés ?

**Conteneur** *(N par BL)*
- N° de conteneur *(ISO 6346)*
- Taille *(20 / 40 / 45 — la taille seule, pas le code ISO complet)*
- Nombre de colis
- Plein / vide
- Tare (poids à vide) *(indice secondaire sec/frigo — ≠ poids marchandise)*
- *Sec/Frigo n'est PAS un champ : déduit par mots‑clés de la description (règle de code).*

### 11. PV de réconciliation / ligne de dépouillement
- Dossier
- **Versions du PV + historique de la navette** *(qui a contesté quoi, quand)*
- **État** : provisoire *(déclaration consignataire)* → accord de navette → **définitif** *(validé hiérarchiquement)*
- Validé par + date *(validation hiérarchique finale)*
- *En‑tête (dérivé des entités liées)* : consignataire, navire, armement, pavillon, type navire, n° voyage, sens, ETA/ETD, n° manifeste, statut navire ; agent traitant *(optionnel)*
- **Ligne de dépouillement** :
  - Nomenclature CGC retenue *(→ Barème : code IMPxx/EXPxx)*
  - Conditionnement / catégorie
  - Quantité **CGC** · Quantité **consignataire** · Quantité **réconciliée** *(les 3 colonnes de la navette)*
  - Unité *(tonne / m³ / unité / boîte)*
  - Observations
  - Montant calculé *(barème × quantité — automatique, temps réel)*
- **Ventilation conteneurs** : `20'S · 40'S · 20'F · 40'F · 45'S · 45'F` → TOTAL TC (Boîtes)
- ❓ Colonnes/observations supplémentaires qu'ils utilisent sur le PV papier actuel ?

### 12. Devis
- Numéro de devis *(préfixé port)*
- Dossier · PV source *(définitif)*
- Montant liquidé (FCFA)
- Date *(figée à la validation du PV)*
- Fichier PDF *(généré, téléchargeable)*
- Version du barème appliqué *(un devis liquidé reste sur son barème d'origine)*

### 13. Facture
- Numéro de facture officielle *(numérotation DAF, préfixé port)*
- Dossier · Devis rattaché
- Date de facture
- Montant facturé *(écart vs devis = avertissement non bloquant, tracé)*
- Fichier *(PDF / JPG / PNG)*
- **Type** : initiale / rectificative *(remplace)* / additive *(complète)*
- En vigueur *(la plus récente ; jamais d'écrasement, historique conservé)*
- État *(ex. « Facture disponible »)*
- Téléversé par + date

### 13bis. Règlement *(paiement hors application)*
- Mode de règlement · Montant · Référence *(saisis par l'agent consignataire)*
- ❓ Rattaché à la facture ou au dossier ? Cycle de suivi voulu par le recouvrement ?

---

## D. Barème (grille tarifaire — versionnée)
- Code nomenclature *(ex. IMP04, EXP11B — clé)*
- Désignation / libellé
- Sens *(import / export)*
- Unité *(forfait conteneur / tonne / m³ / unité)*
- Montant FCFA *(entier — aucun arrondi)*
- Montant Euro *(conversion, 1 € = 655,957 FCFA — le FCFA fait foi)*
- Qualité navire *(ligne régulière / tramping — pour le bois export)*
- Version / date de validité *(jamais écrasé ; nouvelle version)*
- ❓ **Stratégie de versionnement** : le devis fige ses montants (snapshot) OU vraies versions datées du barème ? *(décision d'équipe)*

---

## Questions transverses prioritaires à poser
1. **Manifeste — BIETC/BESC (Q5)** : signification, provenance, faut‑il un référentiel ?
2. **Navire — IMO** : identifiant officiel voulu ou non ?
3. **Consignataire** : quelles informations légales stocker (RCCM, NIF…) ?
4. **Agent (Q7)** : visibilité limitée à ses armements affectés — confirmé ?
5. **Dossier (Q19)** : existe‑t‑il un délai contraignant de déclaration CDTS ?
6. **Dossier** : liste exacte des états du cycle de vie.
7. **PV** : colonnes/mentions du PV papier actuel à ne pas perdre.
8. **Situation portuaire** : jalons datés et postes à quai réellement suivis.

> Décisions d'équipe (pas des utilisateurs) : nommage `Consignee`/`ShipAgent`, versionnement du barème, catalogue de rôles.
