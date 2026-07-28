# Workflows métier e-CDTS (d'après le CDC)

> Source : cahier des charges CGC, restitué par le porteur du projet le 2026-07-02.
> ⚠️ Caveat d'origine : dans le CDC, les blocs « Processus » des workflows 4 à 8 sont des copier-coller du même modèle. Chaque workflow est décrit ici par sa **vraie finalité**, pas par le texte recopié.

## Acteurs

| Famille | Acteur | Rôle |
|---|---|---|
| Interne CGC | Agent Régulation / Technicien Logistique et Transport | Saisit la conférence portuaire, traite les dossiers |
| Interne CGC | Chef de Service Régulation | Valide la nomenclature, génère le PV de réconciliation |
| Interne CGC | Contrôleur | Vérifications de clôture (BIETC, sorties) |
| Interne CGC | Administrateur CGC | Crée les comptes des acteurs externes |
| Interne CGC | Direction Financière et Comptable (DAF) | Établit la facture CDTS (**hors application**) |
| Interne CGC | DOSI | Direction informatique : développement de la plateforme ; simulations de catégorisation avec la DEX (30/07/2026) |
| Interne CGC | DEX | Direction de l'Exploitation : gère la plateforme — **les « agents CGC » des workflows sont les agents de la DEX** |
| Interne CGC | Service recouvrement | Suit les règlements |
| Externe | Consignataire | Gère ses agents, affecte les armements, reçoit les factures |
| Externe | Agent consignataire | Ouvre les dossiers d'escale, téléverse les manifestes, valide la nomenclature, saisit les infos de règlement |
| Partenaire portuaire | Capitainerie | Tient la conférence portuaire quotidienne (11h) — pas forcément utilisateur de l'app |
| Partenaire portuaire | OPRAG | Consulte la situation portuaire |
| — | Système (e-CDTS) | Vérifie, propose, agrège, génère |

**Règles transverses confirmées (2026-07-02/03)** :
- Les rôles internes CGC sont **distincts dans l'application, avec cumul possible** (un même compte peut porter plusieurs rôles).
- Un agent consignataire appartient à **une seule** société consignataire.
- Le compte consignataire **administre et opère** (Q14, Option A) ; affectations armements ↔ agents **N–N** ; un armement peut être représenté par **plusieurs consignataires** (Q15).
- Les **référentiels navires et armements sont gérés par le CGC seul** (Q10, Option A).

## Les 8 workflows

### WF1 — Inscription (§6.2.1 & 6.2.2)
Création du compte consignataire **par le CGC** (pas d'auto-inscription). **La demande initiale de la société passe entièrement hors application** (Q13, résolu 2026-07-08) : aucun formulaire public de demande d'accès à développer. L'Administrateur CGC crée le compte ; le système génère les identifiants, envoyés par mail ; changement de mot de passe obligatoire à la première connexion.
**Précisions CGC (2026-07-03)** :
- Le compte consignataire est tenu par un humain qui **administre ET opère** (il peut ouvrir des dossiers, téléverser des manifestes, valider — comme un agent) — Q14, Option A.
- Le consignataire **crée ses comptes agents dans l'application** ; le **CGC les valide** avant activation — le circuit de validation laisse une **trace opposable** en cas de litige (remplace la « transmission de liste » du CDC ; Q16, confirmé par ADR-0013).
- Affectations armements ↔ agents en **N–N** (plusieurs agents sur un même armement) — Q15.
- Un même armement **peut être représenté par plusieurs consignataires** (pas d'exclusivité) — Q15.

### WF2 — Conférence portuaire / Situation portuaire (§6.2.3)
> Détail précisé le 2026-07-03 (document projet).

Une conférence portuaire a lieu **chaque jour à 11h à la Capitainerie** ; l'agent DEX reporte ces données dans un formulaire dédié de l'application.

**Acteurs** : l'**Agent DEX** **saisit** la Situation Portuaire ; un **supérieur la vérifie et la valide avant publication** (permission dédiée, ADR-0013) — cette validation conditionne **à la fois** la diffusion externe (OPRAG…) **et** le verrou de transmission (ADR-0009 : le verrou s'ouvre sur une situation **validée**, pas seulement saisie). Les **consignataires y accèdent en lecture seule**.

**Données saisies par navire** :
- **Identité** : nom, type (PC = porte-conteneurs, GC = général cargo, RR = roulier — **exemples** : il existe aussi minéraliers et autres → référentiel de types **extensible**), pavillon, armateur
- **Logistique** : n° de voyage, consignataire responsable (**information descriptive uniquement** : elle ne restreint pas qui peut ouvrir/transmettre un dossier), poste à quai
- **Chronologie** : ETA, ETD
- **Statut** : `Navire attendu` · `En rade` · `À quai` · `En zone d'exploitation` · `Sorti`
- **Sens** : import ou export

**Contrôles automatiques** :
- anti-doublons : couple **navire/voyage unique** ;
- anti-chevauchement : **un seul navire par poste à quai** à un instant donné ;
- cohérence statut/dates : **blocage à la publication** si incohérent.

**Rôle de verrou dans le workflow** — le verrou est **directionnel** (précisé 2026-07-08) :
- **Import** : l'élément central est que le navire soit **« à quai »** avec date d'accostage confirmée → le dossier import devient transmissible.
- **Export** : l'élément central est que le navire soit **au départ (« sorti »)** avec date de départ confirmée → le dossier export devient transmissible.

Le rapprochement dossier ↔ situation portuaire se fait par la clé **navire + n° de voyage** (clé unique de la situation, confirmé 2026-07-03). Le consignataire peut anticiper la création du dossier, mais pas le transmettre avant. À la clôture, le système **lie la référence du dossier au mouvement navire** (traçabilité).

### WF3 — Ouverture du dossier d'escale (§6.2.4)
L'agent consignataire ouvre un **dossier d'escale** pour un voyage (navire + armement), en choisissant dans les **référentiels navires et armements gérés exclusivement par le CGC** (Q10, Option A — le navire porte notamment son attribut ligne régulière/tramping). Le dossier reste « ouvert » tant que la date à quai/sortie n'est pas confirmée par la situation portuaire. Tableau de bord des dossiers + alertes d'incohérence.
**Précisions CGC (2026-07-03)** :
- Plusieurs manifestes peuvent concerner une même escale physique de navire (Q11), mais **chaque consignataire ouvre son propre dossier** avec **sa propre escale, indépendante** (pas de fusion ni de rattachement automatique entre les dossiers de SAGA et de GETMA pour le même navire/voyage).
- **C'est l'ouverture du dossier qui crée l'escale** (souvent avant l'arrivée du navire) ; la situation portuaire ne pousse pas les dates dans les dossiers : elle agit comme **verrou de transmission** (cf. WF2) et le lien dossier ↔ mouvement navire est établi **à la clôture**.
- **Un dossier par sens** (précisé 2026-07-08) : le dossier porte un sens **import ou export**. Un consignataire qui décharge de l'import et charge de l'export sur le même passage de navire ouvre **deux dossiers distincts** (même navire, même n° de voyage), chacun débloqué par son propre verrou (import → à quai ; export → sorti) et suivant son propre circuit jusqu'à clôture.
- **Numérotation du dossier (précisé 2026-07-09, ADR-0008)** : à l'ouverture, le dossier reçoit un **identifiant interne stable** (invisible, immuable, support de la traçabilité) et un **numéro affiché provisoire** (le manifeste n'existe pas encore). Ce numéro affiché deviendra le **n° de manifeste** au rattachement du manifeste (cf. WF4) ; l'identifiant interne, lui, ne change jamais.

### WF4 — Transmission du manifeste (§6.2.5)
L'agent consignataire sélectionne le dossier et téléverse le manifeste : **XML** ; saisie ligne par ligne + PDF pour les consignataires sans format. **Les deux modes d'entrée sont dans la phase 1** (confirmé 2026-07-02). Le système contrôle la conformité (champs requis, formats). États du manifeste : **soumis, en validation, validé, transmis**.

**Rattachement du n° de manifeste (précisé 2026-07-09, ADR-0008)** : au premier rattachement d'un manifeste, le **numéro affiché** du dossier passe de provisoire au **n° de manifeste** et se **fige** (l'identifiant interne ne change jamais). Source du numéro : **extrait du XML AWMDS** en mode XML ; **saisi par le consignataire** en mode manuel (recopié de son manifeste papier — champ requis). Les manifestes **additifs/rectificatifs** ultérieurs portent le **même numéro** et ne modifient donc pas le libellé.

**Éclatement en tableau (précisé 2026-07-03)** : au téléversement, le contenu du XML **s'éclate en tableau** — chaque ligne du manifeste devient une ligne d'un tableau (potentiellement multi-pages). Le consignataire **vérifie ligne par ligne** (bonne description, bon contenu), puis renseigne en bout de ligne la **catégorie de conditionnement** (sacherie, conteneur, vrac…) : **préremplie pour les conteneurs** (déductible du XML), **à définir par lui pour le reste**. Ce tableau vérifié et catégorisé est ce qui part en réconciliation (WF5).
**Saisie manuelle = le même tableau** : le consignataire sans format XML **remplit lui-même ce tableau ligne par ligne** (avec son PDF en pièce jointe). Un seul et même écran de travail, deux façons de l'alimenter : éclatement automatique du XML, ou saisie directe.

**Deux régimes de correction (précisé 2026-07-03)** :
- **Avant réconciliation/validation** (pas de PV validé, pas de facturation) : correction **libre** — le consignataire redépose simplement son manifeste et refait le circuit. Aucun formalisme.
- **Après validation finale du PV** (dossier parti en facturation, voire facturé) : le dossier est **figé pour le consignataire** ; seul un **profil habilité CGC** peut déposer un **manifeste additif** (complément : BL oubliés) ou **rectificatif** (remplace des lignes précises) — « les deux selon le cas » (Q6) — pour rouvrir et corriger l'entièreté du dossier. Le dossier peut donc contenir **plusieurs manifestes du même numéro** ; dépouillement et devis portent sur le **résultat consolidé**.

### WF5 — Dépouillement & PV de réconciliation (§6.2.6) — le cœur du projet
**Circuit précisé par le CGC (2026-07-03, Q8 — ADR-0007)** :
1. **Consignataire** : classifie **lui-même** ses marchandises (c'est lui qui sait le mieux ce qui est sacherie, vrac, etc.) — sa déclaration fait office de dépouillement : le **PV provisoire**. Le système l'assiste (conditionnement, agrégation, proposition de nomenclature — cf. ADR-0004, nuancée).
2. **CGC** (agent traitant / Chef de Service Régulation) : **valide ou réfute** le PV provisoire.
3. **Navette** dans les deux sens (contestations/corrections) jusqu'à l'**accord** consignataire ⇄ agent traitant.
4. **Validation hiérarchique finale** — un **palier unique** au-dessus de l'agent traitant, matérialisé par une **permission dédiée** portée par un ou plusieurs profils au choix du CGC (chef de service, directeur, ou administrateur qui cumule tout ; ADR-0012/0013). Ce visa scelle l'accord → **PV de réconciliation définitif** = accord contradictoire validé sur quantités/catégories. C'est cet état définitif qui fige le devis (ADR-0006).

**Chiffrage simultané (correction 2026-07-03)** : le calcul des montants n'est **pas une étape séparée** — dès qu'une ligne est passée à la nomenclature CGC, son montant est calculé **automatiquement** (barème × quantité, unité payante à l'avantage du CGC) et **visible en temps réel des deux côtés** (consignataire et CGC) pendant toute la navette. WF5 et WF6 sont donc simultanés : chacun voit en permanence « ce que ça coûte » au fil des classifications et des corrections.

Les règles de catégorisation seront affinées par les **simulations DOSI/DEX (attendues 30/07/2026)**.

**Structure du PV papier/PDF (d'après un PV réel MSC SPRING III, 2026-07-08)** :
> ⚠️ Ce PV papier est la **version manuelle actuelle** (sans plateforme). Ses champs ne sont **pas** la spec littérale de l'app : on ajuste (cf. en-tête applicatif ci-dessous).
- **En-tête applicatif** (précisé 2026-07-08) — champs à afficher dans l'application :
  - **Obligatoires** : consignataire, navire, armement, pavillon, type navire, n° de voyage, sens (import/export), ETA/ETD, n° de manifeste, n° de conteneur, **statut navire (à quai / sorti)** — ce dernier **absent du PV papier** mais nécessaire dans l'app (porte l'info du verrou directionnel : import → à quai, export → sorti).
  - **Optionnel** : agent traitant — pas un champ acquis de facto dans notre workflow (la navette est consignataire ⇄ CGC, sans « agent traitant » unique désigné automatiquement).
- **Corps à trois colonnes** : `Données CGC` · `Données Consignataire` · `Données Réconciliées` + `Observations`. Ce ne sont **pas deux comptages aveugles** : ce sont les **deux positions de la navette** (déclaration du consignataire, chiffre retenu par le CGC) ; la colonne « réconciliées » scelle l'accord final.
- **Détail conteneurs** ventilé taille × nature : `20'S · 40'S · 20'F · 40'F · 45'S · 45'F` (**S = Sec, F = Frigo/réfrigéré**) → **TOTAL TC** (« Boîtes »). Correspond directement aux codes conteneurs du barème.
- **Visas** : CGC, Consignataire, Chef de Service, Directeur.
- **Mention** « réclamations sous 2 semaines » : **à titre indicatif** imprimé sur le PDF du PV — pas un verrou applicatif à implémenter.

### WF6 — Devis & Facturation (§6.2.7)
**Décision CGC (2026-07-03, Q4 — Option A, ADR-0006)** :
1. **e-CDTS calcule en continu** : les montants (barème × quantités) sont calculés **automatiquement dès le passage à la nomenclature**, ligne par ligne, et visibles des deux parties pendant la navette (cf. WF5 — chiffrage simultané). À la **validation finale du PV**, ces montants figés constituent le **devis** (montant liquidé) — aucun déclenchement manuel nécessaire _(corrige la réponse « déclenché par un agent CGC » du même jour)_. Le devis est **téléchargeable** (document PDF) par le consignataire comme par le CGC.
2. **La DAF ne touche pas à l'application** : un **agent CGC (agent de la DEX)** télécharge le devis et le **transmet à la DAF hors application** (Q18 — résolu 2026-07-03). La DAF établit la **facture officielle dans son propre système**.
3. **Téléversement de la facture** (dans l'onglet « Devis & Facturation » du dossier, réservé à un agent CGC habilité — la facture vient de la DAF, hors app) :
   - L'agent dépose le fichier de la facture (**PDF / JPG / PNG**) et saisit le **n° de facture officielle** (numérotation DAF), la **date** et le **montant facturé**.
   - **Rapprochement devis ↔ facture** : si le montant facturé diffère du montant du devis, **avertissement non bloquant** (la DAF peut avoir une raison légitime) — l'agent peut rattacher malgré tout, la divergence est tracée.
   - **Corrections = additif / rectificatif** (même logique que le manifeste, cf. WF4/ADR-0008) : on **n'écrase jamais** une facture rattachée. Une facture corrigée est déposée comme **rectificative** (remplace) ou **additive** (complète) ; l'historique complet reste visible, la plus récente est marquée **« en vigueur »**.
   - **Traçabilité** : qui a téléversé, quand, quel montant → fil d'Ariane du dossier (ADR-0013).
   - Au rattachement : état « **Facture disponible** », le consignataire est **notifié** (ADR-0005) et peut la **télécharger** (lecture seule, pas de dépôt côté consignataire).

### WF7 — Règlement (§6.2.8)
⚠️ **Le paiement se fait hors application.** L'agent consignataire saisit le mode de règlement, le montant, la référence. Le Service recouvrement suit.

### WF8 — Clôture du dossier (§6.2.9)
Réservée au CGC. L'Agent CGC / Contrôleur vérifie que **tous les BL sont couverts par un BIETC**, que les cargaisons sont sorties (imports), référence le dossier dans la situation portuaire, puis clôture. **Seul le CGC peut clôturer.**
**Numérotation devis/facture (précisé 2026-07-08)** : les **n° de devis et n° de facture** (préfixés par port, ex. `DELBV` / `FALBV` pour Libreville) sont **rattachés au dossier à la clôture**, une fois tout le circuit terminé. À partir de là, ils sont **visibles de tous** — consignataire, agents CGC, agents DEX — dans le dossier clôturé.

## Points ouverts (cadrage en cours)
> Les questions en attente de réponse CGC sont centralisées dans `QUESTIONS-CGC.md` (calcul CDTS/devis, BIETC, barème).
