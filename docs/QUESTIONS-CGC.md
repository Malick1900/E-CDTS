# Questions en attente pour le CGC

> Alimenté pendant le cadrage (`/grill`). Quand une réponse arrive, elle est reportée dans les docs concernés (BAREME-CDTS, WORKFLOWS-METIER, GLOSSARY, DECISIONS) et la question est cochée ici avec la date.

## Barème / calcul
- [ ] **Q1 — Notes de gestion du barème** : la transmission s'est interrompue après « Notes de gestion : ». Récupérer le texte complet des règles d'application.
- [ ] **Q2 — Lignes régulières vs tramping (bois export)** : comment détermine-t-on qu'un navire est en ligne régulière (EXP11/EXP12) ou en tramping (EXP11B/EXP12B) ? Qui porte cette information ?
- [ ] **Q3 — Exonérations, minimum de perception, arrondis** : existe-t-il des marchandises/clients exonérés, une facture minimale, des règles d'arrondi (au FCFA près, à la tonne/m³ supérieur…) ?
- [ ] **Q4 — Où vit le calcul du montant CDTS ?** La facture est établie par la DAF hors application. e-CDTS doit-il quand même appliquer le barème et produire un montant (devis / montant liquidé sur le PV) transmis à la DAF ? Ou l'app s'arrête-t-elle aux quantités/catégories réconciliées, la DAF calculant elle-même ? **Point qui change fortement le périmètre.**

## Workflows
- [ ] **Q5 — BIETC** : signification exacte du sigle, et d'où vient la donnée « ce BL est couvert par un BIETC » ? (géré dans e-CDTS, saisi par un agent, ou interfacé avec un système tiers ?)
- [ ] **Q6 — Correctifs de manifeste** : un consignataire peut-il corriger un manifeste déjà transmis (BL oublié, quantité erronée) ? Jusqu'à quel stade (avant validation ? avant PV ? avant clôture ?) et selon quel circuit (redépôt, avenant, intervention CGC) ?
- [ ] **Q7 — Visibilité des agents consignataires** : confirmer la règle — un agent consignataire ne voit que les dossiers des armements qui lui sont affectés, le consignataire (compte maître) voit tout ce qui le concerne ?
- [ ] **Q8 — PV de réconciliation** : contenu exact du document (quelles colonnes, montants inclus ou non), et qui le signe formellement ?

## Consignataires, navires, escales (bloc WF1–WF3)
- [ ] **Q10 — Référentiels navires et armements** : qui crée et maintient les listes de navires et d'armements dans e-CDTS ? (CGC seul ? le consignataire peut-il créer un navire manquant à l'ouverture d'un dossier ?)
- [ ] **Q11 — Un ou plusieurs dossiers par escale ?** Pour un même navire/voyage, y a-t-il un seul dossier d'escale (consignataire titulaire) ou plusieurs consignataires peuvent-ils déposer chacun leur manifeste (co-chargeurs) ?
- [ ] **Q12 — Circuit exact d'ouverture du dossier d'escale (WF3)** : qui l'ouvre précisément, à quel moment (avant l'arrivée ? après la conférence ?), avec quelles informations obligatoires ? Et ensuite : le rapprochement avec la situation portuaire (confirmation de la date à quai/sortie) est-il automatique par navire/voyage ou reporté à la main ?
- [ ] **Q13 — Circuit de demande de compte consignataire** : comment la demande initiale arrive-t-elle au CGC (courrier, mail, formulaire papier) ? Quelles pièces justificatives ? L'Administrateur CGC saisit-il le formulaire dans l'app ?
- [ ] **Q14 — Nature du « consignataire » dans l'application** — question structurante pour le modèle de données :
    - Le consignataire est-il un **compte de connexion** (identifiant + mot de passe, un humain derrière — directeur d'agence, responsable des opérations ?) ou seulement une **entité société** enregistrée dans la base (ex. « SAGA »), représentée uniquement par ses agents ?
    - S'il a un compte : peut-il **faire lui-même les opérations** (ouvrir un dossier d'escale, téléverser un manifeste, valider la nomenclature) ou uniquement **administrer** (transmettre la liste de ses agents, affecter les armements, activer/désactiver) ?
    - Le WF1 dit qu'il « reçoit ses identifiants » — donc un login existe — mais son périmètre d'action n'est décrit nulle part.
    - _Modélisation pressentie côté dev (à valider par le CGC) : une société Consignataire (entité) + des utilisateurs rattachés, dont un ou plusieurs comptes « administrateur consignataire » qui gèrent agents et affectations ; la question restante étant : ces comptes admin peuvent-ils aussi opérer ?_
- [ ] **Q15 — Affectations armements ↔ agents** : un même armement peut-il être affecté à **plusieurs agents** du même consignataire (équipe, remplaçants) ? Et à l'inverse, un même armement peut-il être représenté par **deux consignataires différents** (sur le même port ou sur des ports différents), ou y a-t-il exclusivité ?
- [ ] **Q16 — Transmission de la liste des agents** (WF1) : le consignataire transmet-il sa liste d'agents hors application (mail/courrier, puis saisie par l'Administrateur CGC) ou via un écran de l'application ?

## Statistiques
- [ ] **Q9 — Liste des KPI** : quels indicateurs précis les directions veulent-elles suivre (trafic par port/catégorie/période, délais de traitement, taux de recouvrement…) ?

## (les questions suivantes seront ajoutées au fil du cadrage)
