# Journal des décisions (ADR)

> **Pourquoi ce fichier ?** Il garde l'**historique du « pourquoi »**. Le code montre *ce qui* est fait ; ici on trace *pourquoi* on l'a fait, quelles alternatives ont été écartées, et ce que ça implique. C'est la mémoire longue du projet : un agent qui démarre une session le lit pour ne pas refaire un débat déjà tranché ni casser un choix intentionnel.

## Comment l'utiliser
- **Ajouter une entrée** à chaque décision structurante : choix d'archi, convention, techno, compromis de perf, dénormalisation DB, abandon d'une piste.
- **Ne jamais réécrire l'histoire** : une décision remplacée n'est pas supprimée — on la marque `Remplacée par ADR-XXX`.
- Entrées **datées** et numérotées, la plus récente en haut.
- Mis à jour via `/refresh-context` après une tâche significative.

## Format d'une entrée
```
## ADR-000X — <titre court> — AAAA-MM-JJ
**Statut :** Proposée | Acceptée | Remplacée par ADR-000Y | Abandonnée
**Contexte :** le problème, la contrainte, ce qui a déclenché la décision.
**Décision :** ce qu'on a choisi, formulé clairement.
**Alternatives écartées :** ce qu'on n'a pas retenu, et pourquoi.
**Conséquences :** ce que ça implique (avantages, coûts, dette assumée).
```

---

## ADR-0005 — Périmètre et contraintes de la phase 1 — 2026-07-02
**Statut :** Acceptée
**Contexte :** série d'arbitrages de périmètre pris pendant le cadrage (`/grill`) avec le développeur porteur du projet.
**Décision :**
- **Entrée des manifestes** : XML AWMDS **et** saisie manuelle ligne par ligne + dépôt PDF, dès la phase 1 (certains consignataires n'ont pas de format).
- **Multi-ports dès la phase 1** : situation portuaire, dossiers d'escale et statistiques ventilés par port.
- **Hébergement : cloud VPS** (accès Internet sortant disponible pour API IA et e-mails).
- **Partenaires portuaires (Capitainerie, OPRAG)** : pas de comptes — diffusion externe de la situation portuaire (mail/export).
- **Notifications e-mail** : changements d'état du manifeste, facture disponible, alertes internes CGC — liste extensible en cours de développement.
- **Statistiques** : tableaux de bord + exports **et** comptes en lecture pour les directions CGC.
- **Volumétrie de dimensionnement** : > 200 escales/mois, manifestes pouvant dépasser 500 BL, plusieurs milliers de lignes à dépouiller par semaine.
**Alternatives écartées :** XML seul en phase 1 (exclut les petits consignataires) ; mono-port (ne couvre pas l'activité réelle) ; comptes partenaires (complexité de gestion pour un besoin de consultation simple).
**Conséquences :** l'UI de saisie manuelle d'un manifeste est un chantier à part entière ; le modèle de données porte le port partout ; le dépouillement doit rester fluide sur des manifestes de 500+ BL (pagination, traitement asynchrone du parsing).

## ADR-0004 — Catégorisation tarifaire : pré-classification assistée + validation agent + apprentissage — 2026-07-02
**Statut :** Acceptée (principe) — architecture technique à étudier au moment du plan
**Contexte :** au CGC, aucune règle prédéfinie ne relie une ligne de manifeste à une catégorie du barème CDTS : les agents lisent la description de la marchandise et décident au cas par cas. Pour les conteneurs, la catégorie est déterministe (taille + sec/réfrigéré, présents dans le XML AWMDS). Pour le reste (sacherie, conventionnel, vrac, véhicules), c'est un jugement humain.
**Décision :** e-CDTS **propose** une catégorie pour chaque ligne (pré-classification automatique), et **un agent CGC valide ou corrige** avant l'émission du devis. Chaque correction validée est mémorisée pour améliorer les propositions suivantes. Objectif cible : 95–100 % de propositions correctes à terme.
**Alternatives écartées :** catégorisation 100 % automatique dès la V1 — rejetée (risque de factures fausses sur les cas ambigus, pas de base de règles existante) ; déclaration de la catégorie par le consignataire — non retenue (conflit d'intérêt : le déclarant paierait selon sa propre déclaration).
**Conséquences :** l'UI de dépouillement doit rendre la validation/correction fluide (c'est le cœur du poste de travail agent). Piste d'architecture pressentie (à confirmer au plan) : **historique d'abord, IA ensuite** — (1) conteneurs : règle déterministe ; (2) descriptions déjà rencontrées et validées : réutilisation automatique de la catégorie mémorisée ; (3) descriptions nouvelles : proposition par LLM (ex. Claude) avec les classifications validées comme exemples ; les corrections des agents enrichissent l'historique, donc le taux de réussite monte mécaniquement sans ré-entraînement. Coût et choix du modèle à étudier.

## ADR-0003 — Format des manifestes entrants : XML ASYCUDA World (AWMDS) — 2026-07-02
**Statut :** Acceptée
**Contexte :** e-CDTS doit dépouiller automatiquement les manifestes cargo. Les consignataires au Gabon travaillent déjà avec SYDONIA World (nom français d'ASYCUDA World, système douanier de la CNUCED), qui définit un format XML standard de manifeste.
**Décision :** e-CDTS accepte les manifestes au format **AWMDS** (ASYCUDA World Manifest Data Stream) : racine `Awmds`, un `<General_segment>` (identification, totaux, transport/navire, ports UN/LOCODE, tonnage) + N `<Bol_segment>` (connaissements : traders, conteneurs, marchandises, valeurs). Validation par le schéma officiel `Awmds.xsd`.
**Alternatives écartées :** format XML propriétaire CGC — rejeté car les consignataires produisent déjà de l'AWMDS pour la douane (zéro re-saisie, adoption immédiate) ; EDIFACT CUSCAR — non utilisé localement.
**Conséquences :** le parseur doit suivre la spec UNCTAD (dates `yyyy-MM-dd`, masses en KG, volumes en m³, conteneurs ISO 6346, ports UN/LOCODE). **Point ouvert :** chaque pays personnalise légèrement son profil AWMDS — récupérer des fichiers XML réels issus du SYDONIA gabonais pour valider le profil local avant d'écrire le parseur. Flux annexes (dégroupage `Awbolds`, ajout `Awappend`, co-chargeurs `Awmcds`) : à trancher au cadrage.

## ADR-0002 — Portail externe pour les consignataires — 2026-07-02
**Statut :** Acceptée
**Contexte :** aujourd'hui les manifestes arrivent par mail/papier et un agent CGC re-saisit tout. Il fallait choisir qui accède à e-CDTS.
**Décision :** les consignataires ont un **compte sur un portail externe** : ils déposent eux-mêmes leurs manifestes XML et suivent leurs devis/factures. Les agents CGC traitent derrière.
**Alternatives écartées :** application interne CGC seule (import manuel des XML) — rejetée car elle conserve un maillon manuel ; phase interne puis portail — non retenue, le portail fait partie du périmètre initial.
**Conséquences :** authentification et rôles distincts (consignataire vs agent CGC), exposition Internet (sécurité renforcée), gestion du cycle de vie des comptes consignataires à prévoir.

## ADR-0001 — Adoption du harnais Claude Code — 2026-07-01
**Statut :** Acceptée
**Contexte :** besoin d'un cadre commun pour piloter les agents IA sur les projets Laravel avec des standards « pro » constants.
**Décision :** template par projet (`CLAUDE.md` + `docs/` + `.claude/`), installé via `/init-harness`. Principes : zone de génie 0–80k tokens, plan avant exécution, questionner sans inventer, contexte vivant.
**Alternatives écartées :** config globale `~/.claude` — rejetée car non versionnée avec chaque repo.
**Conséquences :** chaque repo porte son harnais versionné ; à maintenir à jour projet par projet.

<!-- Nouvelles décisions au-dessus de cette ligne -->
