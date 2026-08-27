# Entités & profils — e-CDTS

> Référentiel **gelé** des entités métier et des profils d'accès. Ce document dit **de quoi chaque objet est fait** et **qui a le droit de faire quoi**. Décrit en français métier — pas de jargon technique. Décisions de référence : ADR-0006, ADR-0008, ADR-0009, ADR-0012, ADR-0013.
>
> Deux mondes de comptes bien distincts : **côté CGC** (profils internes) et **côté client** (consignataires et leurs agents).

## 1. Les entités de référence (master data)

**Comment ça s'emboîte :** un **armement** possède des **navires** ; il est représenté au port par un **consignataire** (société) ; les déclarations sont déposées soit par le consignataire lui-même, soit par ses **agents consignataires** (personnes rattachées à cette société), mais elles sont **toujours facturées à la société consignataire**.

### Armement
La compagnie maritime exploitant des navires (Maersk, CMA CGM, MSC…). **Armement et armateur sont un seul et même objet** dans e-CDTS : la fiche porte l'identité société complète.

Informations portées :
- **Nom de l'armement**
- **Sigle** (ou nom court)
- **Pays d'origine**
- **Pays d'immatriculation**
- **Nom du gérant**
- **RCCM / NIF** (ou équivalent selon le pays)
- **Adresse**

Relations : un armement peut être représenté par **plusieurs consignataires**, et un consignataire représente **plusieurs armements** (relation multiple des deux côtés). Écriture réservée au CGC (référentiel).

### Navire
Le bateau lui-même, rattaché à un armement exploitant.

Informations portées :
- **Nom du navire**
- **Numéro OMI** (identifiant international unique du navire)
- **Pavillon** (pays d'immatriculation)
- **Type de navire** (porte-conteneurs, vraquier, RoRo, conventionnel, pétrolier… — référentiel extensible)
- **Armement de rattachement**
- **Mode d'exploitation par défaut** — `ligne régulière` ou `tramping`. C'est le « réglage d'usine » : chaque escale en hérite mais porte sa propre valeur effective (cf. §2). Champ **facultatif** : un navire enregistré sans mode ouvre des dossiers en **ligne régulière**, le mode ordinaire du port (ADR-0047, amendement du 2026-08-27). Le mode n'impacte la facturation que pour le **bois export** (EXP11/11B, EXP12/12B ; ~13 % de plus en tramping — cf. `BAREME-CDTS.md`).

Le navire est la **clé de réconciliation** navire + voyage (ADR-0009). Écriture réservée au CGC.

### Consignataire
La société mandataire de l'armement dans le port (ex. SAGA). Compte maître créé côté CGC (WF1).

**Informations de la société :**
- **Raison sociale**
- **Sigle**
- **Numéro d'identification de l'entreprise** — registre de commerce (RCCM) / identifiant fiscal (NIF) ou équivalent
- **Pays d'immatriculation**
- **Adresse**
- **Téléphone** et **email** de la société
- **Port(s) de rattachement** — Owendo, Port-Gentil, ou les deux
- **Armement(s) représenté(s)** (relation multiple)

**Informations du titulaire** (la personne qui gère le compte) :
- **Nom** / **Prénom**
- **Fonction / poste**
- **Email professionnel**
- **Téléphone**

Le consignataire crée ses agents, leur **affecte des armements**, et voit **toutes les déclarations de ses agents** (visibilité descendante uniquement).

> **Note d'architecture — pièces justificatives.** L'identité des entreprises (consignataire comme **armement**) devra pouvoir accueillir **plus tard** des pièces jointes prouvant l'identité de la société (RCCM scanné, etc.). On ne les construit pas maintenant, mais la structure des fiches entreprise doit être pensée pour que **l'ajout de documents rattachés soit simple**, sans refonte — de préférence via un mécanisme de pièces jointes **mutualisé** entre entités plutôt que des champs figés fiche par fiche.

### Agent consignataire
Personne physique rattachée à la société consignataire, utilisatrice du portail ; dépose les déclarations **sans être propriétaire du compte**.

Informations portées :
- **Nom** / **Prénom**
- **Fonction / poste**
- **Email professionnel**
- **Téléphone**
- **Société consignataire de rattachement**

Règles : n'opère **que sur les armements qui lui sont affectés** ; compte **validé par le CGC (Administrateur) avant activation** — trace opposable, non-répudiation (ADR-0013).

### Règles de gestion (confirmées)
1. Le **consignataire**, via son **titulaire**, dispose d'un **compte** lui permettant de faire lui-même les déclarations **et** de créer des agents consignataires qui déclarent en son nom.
2. L'**agent consignataire** est une personne supplémentaire rattachée à la même société ; il dépose les déclarations **sans être propriétaire du compte**.
3. Le **CGC valide la création des comptes agents** avant leur activation (ADR-0013).
4. C'est la **société consignataire** qui est **facturée** et qui **règle la CDTS**.

## 2. L'escale (dossier d'escale)

L'**escale** est le **dossier du passage d'un navire** pour un voyage donné (numéro de voyage, date, port), **porteur d'un sens** (import **ou** export → un dossier par sens). C'est le conteneur de tout le circuit jusqu'à la clôture, et le point de rattachement du manifeste.

- **Mode d'exploitation effectif** : recopié automatiquement depuis le navire à la création de l'escale — **ligne régulière** si le navire n'en porte pas —, **modifiable indépendamment**. Une escale n'existe donc jamais sans mode. **Seul le CGC** (Superviseur ou Administrateur) peut le modifier ; le consignataire le voit mais grisé. La facturation lit **le mode de l'escale**, jamais celui du navire. Trace conservée (qui / quand) pour contestation de facture bois.
- Identité : **référence interne stable** (immuable) + **numéro de dossier affiché** provisoire, puis figé au n° de manifeste (ADR-0008).

**Étapes du circuit** (liste fermée, enum `EtapeDossier` — ADR-0041) :

`Ouvert` → `Manifeste` → `Dépouillement` → `Devis émis` → `Facturé` → `Clôturé`

Plus **`Annulé`**, **hors frise** : ce n'est pas une étape franchie mais une sortie de route (ADR-0009), sans rang « x/6 ».

**Périmètre de lecture** : un compte client ne voit que les dossiers de **sa société** — les siens comme ceux de ses collègues, le dossier appartenant à la société et non à la personne qui l'a ouvert. Un interne CGC les voit tous. Calculé côté serveur (`Escale::scopeVisiblePar`), jamais par le front.

**Ouvrir est le geste du consignataire** (WF3) : il détient le n° de voyage et c'est lui qui déclarera. Un interne CGC instruit les dossiers, il n'en ouvre pas — non par défaut de permission, mais parce qu'il n'a aucune société à qui l'attribuer. Quatre champs suffisent : **sens, navire, n° de voyage, port**. L'armement, le poste et la date prévisionnelle sont facultatifs ; le n° de manifeste et la cargaison arrivent à l'étape suivante.

**Clé de rapprochement** : `voyage_normalise` (MAJUSCULES, espaces supprimés, tirets conservés) est **calculé** à l'enregistrement, jamais assigné. Le trait `NormaliseLeVoyage` le porte des **deux côtés** — dossier d'escale et ligne de situation portuaire — parce qu'une règle appliquée d'un seul côté laisserait des dossiers orphelins en silence (ADR-0009, ADR-0042).

**Le rapprochement est automatique et symétrique** (ADR-0042) : il se tente à la création du dossier *et* à l'inscription du navire à la situation portuaire — l'ordre d'arrivée n'est pas garanti, et le dossier précède le plus souvent. Ni le port ni le sens n'entrent dans la clé : un voyage ne dessert qu'un port, et import et export d'un même passage pointent la **même ligne**, chacun y lisant sa date. Si deux lignes répondent à la clé, on s'abstient : le dossier reste `en attente de rapprochement` et le filet manuel tranche. Un rapprochement acquis ne se rejoue pas.

**Rapprocher n'est pas verrouiller** : le lien se pose sur une ligne encore en brouillon ; c'est `publiee_at` seul qui ouvre le verrou de transmission (ADR-0013).

### Situation portuaire
État publié des mouvements de navires, alimenté quotidiennement depuis la conférence portuaire. **Source unique** des dates d'accostage/départ lues par les dossiers (ADR-0009).

**Statuts officiels** (liste fermée, enum `StatutNavire`) :

`Navire attendu` → `En rade` → `À quai` → `Hors zone` → `En zone d'exploitation` → `Sorti`

**Consultation publique** : la situation portuaire est **accessible en lecture seule sans connexion**, via un lien depuis la page d'accueil / de connexion. Aucune action possible en accès public. Seules les lignes **publiées** y figurent.

**Saisir n'est pas publier** (ADR-0013/0039) : le Conférencier renseigne les lignes, qui restent en brouillon ; un supérieur (`situation-portuaire.valider`) les publie d'un geste distinct. Toute modification ultérieure ramène la ligne au brouillon, et le verrou de transmission d'ADR-0009 ne s'ouvre que sur du publié.

## 3. Les 5 profils côté CGC

Les profils sont des **ensembles d'attributions ajustables** (ADR-0012) : on peut ajouter/retirer une attribution à un profil, et une même personne peut **cumuler** plusieurs profils (permissions effectives = union). Le catalogue d'attributions est défini par le **code** ; c'est la **composition** des profils qui est éditable.

| Profil | Rôle en une phrase |
|---|---|
| **Conférencier** | Renseigne la situation portuaire. |
| **Agent dépouilleur** | Traite le dépouillement avec le consignataire ; téléverse la facture. |
| **Superviseur** | Chef du Conférencier et de l'Agent dépouilleur ; valide leurs travaux, gère les référentiels et les utilisateurs de **son équipe**. |
| **Administrateur** | Peut tout faire côté CGC ; crée/valide les comptes clients ; seul à toucher au barème. Profil **fonctionnel** (non nominatif) porté par le Directeur d'Exploitation ou un agent informatique. |
| **Consultant** | Consultation seule des statistiques (DAC et autres directions). |

### Matrice des attributions (profil × attribution)

| Attribution | Conférencier | Agent dépouilleur | Superviseur | Administrateur | Consultant |
|---|:---:|:---:|:---:|:---:|:---:|
| Renseigner la situation portuaire | ✓ | — | ✓ | ✓ | — |
| Dépouillement / réconciliation avec le consignataire | — | ✓ | ✓ | ✓ | — |
| Téléverser la facture | — | ✓ | ✓ | ✓ | — |
| Valider les travaux (situation portuaire + PV) | — | — | ✓ | ✓ | — |
| **Clôturer un dossier** | — | — | ✓ | ✓ | — |
| Modifier le **mode d'exploitation** (escale) | — | — | ✓ | ✓ | — |
| Gérer les **référentiels** | — | — | ✓ | ✓ | — |
| Gérer les **utilisateurs** | — | — | ✓ *(son équipe)* | ✓ *(tous)* | — |
| Créer / valider les **comptes clients** | — | — | — | ✓ | — |
| Modifier le **barème** | — | — | — | ✓ | — |
| Consulter les **statistiques** | — | — | ✓ | ✓ | ✓ |

### Règles transverses
- **Supervision hiérarchique** : le Superviseur ne gère que les utilisateurs de sa propre équipe.
- **Séparation des tâches** : régime **souple** (un profil peut traiter *et* valider en cas d'absence) mais **tout est tracé** (qui a fait quoi, quand — journal d'audit). *À reconfirmer par la DEX si l'on veut interdire de valider son propre travail.*
- **Barème** : réservé à l'Administrateur — toute modification impacte l'ensemble des montants (versionné, ADR-0006).
- **Comptes clients** : validés par le CGC / Administrateur (non-répudiation, ADR-0013).

### Point ouvert
- **Contenu des statistiques** : indicateurs à définir (ex. nombre de véhicules entrés au Gabon, volumes de riz…). À cadrer ultérieurement.
