# Questions en attente pour le CGC

> Alimenté pendant le cadrage (`/grill`). Quand une réponse arrive, elle est reportée dans les docs concernés (BAREME-CDTS, WORKFLOWS-METIER, GLOSSARY, DECISIONS) et la question est cochée ici avec la date.

## ✅ Répondues le 2026-07-03 (questionnaire CGC)

- [x] **Q1 — Notes de gestion du barème** → couvertes par les réponses 1 et 4 du questionnaire : unité payante à l'avantage du CGC, pas d'exonérations/minimum/arrondis. _(Le texte officiel des notes reste bienvenu s'il existe, mais plus bloquant.)_
- [x] **Q2 — Lignes régulières vs tramping** → la qualité (ligne régulière / tramping) est **précisée à l'enregistrement du navire** dans le référentiel. Reporté dans GLOSSARY et WORKFLOWS-METIER.
- [x] **Q3 — Exonérations, minimum, arrondis** → **Non**, le barème s'applique tel quel. Reporté dans BAREME-CDTS.
- [x] **Q4 — Où vit le calcul CDTS** → **Option A** : e-CDTS applique le barème aux quantités réconciliées et produit le **devis** ; la DAF établit la facture officielle dans son système et la téléverse dans e-CDTS. → **ADR-0006**.
- [x] **Q6 — Correctifs de manifeste** → principe d'**addition de manifestes** : un dossier de traitement CDTS peut contenir **plusieurs manifestes du même numéro**, un nouveau dépôt corrigeant le précédent. _(Mécanique exacte en cours de précision — voir grilling.)_
- [x] **Q8 — PV de réconciliation** → le consignataire **classifie lui-même** (il sait mieux que quiconque ce qui est sacherie, etc.) : sa déclaration fait office de dépouillement (**PV provisoire**), que le CGC **valide ou réfute** ; navette dans les deux sens jusqu'à **validation finale**. → **ADR-0007**.
- [x] **Q10 — Référentiels navires/armements** → **Option A : le CGC gère les deux référentiels** ; les consignataires choisissent dans la liste.
- [x] **Q11 — Plusieurs manifestes par escale** → oui, **plusieurs manifestes peuvent faire partie d'une même escale de navire**. _(Articulation dossier/escale en cours de précision — voir grilling.)_
- [x] **Q14 — Nature du consignataire** → **Option A** : compte de connexion (humain derrière) qui **administre ET opère** (dossiers, manifestes, validations).
- [x] **Q15 — Affectations** → un armement peut être affecté à **plusieurs agents** du même consignataire (N–N) ; et un même armement **peut être représenté par deux consignataires différents** (pas d'exclusivité).
- [x] **Q16 — Liste des agents** → le consignataire **crée ses comptes agents dans l'application**, le **CGC valide** ensuite (avant activation) — le circuit laisse une trace opposable en cas de litige _(confirmé le 2026-07-12, ADR-0013)_.
- [x] **(Catégorisation tarifaire)** → la **DOSI** et la **DEX** doivent faire des **simulations d'ici le 30/07/2026** pour préciser les règles. ADR-0004 nuancée par ADR-0007.

## ⏳ Toujours ouvertes

- [ ] **Q5 — BIETC** : signification exacte du sigle, et d'où vient la donnée « ce BL est couvert par un BIETC » ? (géré dans e-CDTS, saisi par un agent, ou interfacé avec un système tiers ?) — _Constat 2026-07-09 sur manifestes réels : le n° BIETC/BESC apparaît **noyé dans la description marchandise** du XML (ex. `BIETC NO.: 0632858`), ce n'est pas un champ structuré ; s'il faut l'exploiter, il faudra le parser depuis le texte. Reste à confirmer l'usage métier attendu._
- [ ] **Q7 — Visibilité des agents consignataires** : confirmer formellement — un agent ne voit que les dossiers des armements qui lui sont affectés ; le consignataire (compte maître) voit tout ce qui le concerne.
- [ ] **Q9 — Liste des KPI** : quels indicateurs précis les directions veulent-elles suivre ?
- [ ] **Q17 — Résultat des simulations DOSI/DEX** (attendu ~30/07/2026) : règles précises de passage manifeste → nomenclature CGC (livrable exact inconnu à ce jour).
- [ ] **Q19 — Délai de déclaration CDTS** _(soulevé 2026-07-12)_ : existe-t-il une règle imposant au consignataire de faire sa CDTS **avant un certain délai** (ex. X jours après l'arrivée / le déchargement du navire) ? Si oui : est-il **contraignant** (verrou / retard / pénalité) ou **indicatif** (simple affichage, comme la mention « réclamations sous 2 semaines » du PV) ? Retrouver le passage exact du CDC. _Rien inscrit tant que non confirmé — ne pas inventer._

## ✅ Complément répondu le 2026-07-03 (grilling développeur)
- [x] **Addition de manifestes** _(précisé)_ : avant validation du PV, correction **libre** par simple redépôt. L'additif (complément) / rectificatif (remplace des lignes) est la **procédure exceptionnelle post-validation** (dossier figé, voire facturé), réservée à un profil habilité CGC.
- [x] **Escale ↔ dossiers** : un dossier **par consignataire** ; l'escale fédère plusieurs dossiers.
- [x] **DOSI / DEX** : direction informatique (développement) / direction de l'exploitation (gestion de la plateforme).
- [x] **Génération du devis** _(corrigé le 2026-07-03)_ : le chiffrage est **automatique et simultané** au passage à la nomenclature — les montants sont visibles en temps réel des deux côtés pendant la navette ; à la validation finale du PV, ils constituent le devis, sans déclenchement manuel. Le devis est **téléchargeable** (PDF).
- [x] **Q18 — Transmission du devis à la DAF** : **hors application**. La DAF n'utilise pas e-CDTS : un agent CGC (agent de la DEX) télécharge le devis et le lui transmet ; la facture revient de la même façon (téléversée par l'agent CGC).
- [x] **Q13 — Circuit de demande du compte consignataire initial** _(résolu 2026-07-08)_ : la demande passe **entièrement hors application** (démarche de la société auprès du CGC, hors e-CDTS). Rien à développer en amont : l'Administrateur CGC crée le compte dans l'app une fois la demande acceptée (cf. WF1).
- [x] **Un dossier par sens** _(précisé 2026-07-08)_ : le dossier d'escale porte un sens **import ou export** ; import + export sur le même passage de navire = **deux dossiers distincts**, chacun avec son verrou (import → à quai, export → sorti).
- [x] **Q12 — Situation portuaire ↔ dossier** _(résolu 2026-07-03)_ : le dossier crée sa propre escale (escales **indépendantes** entre consignataires, pas de rattachement automatique) ; la situation portuaire, saisie par le seul Agent DEX (lecture seule pour les consignataires), agit comme **verrou de transmission** (verrou **directionnel**, précisé 2026-07-08 : dossier **import** transmissible quand le navire est **à quai** avec date confirmée ; dossier **export** transmissible quand le navire est **au départ / sorti** avec date confirmée) ; le lien dossier ↔ mouvement navire est établi **à la clôture** (traçabilité). Statuts navire : Navire attendu / En rade / À quai / En zone d'exploitation / Sorti.
