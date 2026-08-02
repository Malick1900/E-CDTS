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

## ADR-0033 — On ne donne pas ce qu'on n'a pas : l'attribution d'un rôle est bornée par ses propres permissions — 2026-08-02
**Statut :** Acceptée (arbitrage du porteur, 2026-08-02) — **ferme une faille d'ADR-0025**, dont elle rend la séparation effective.
**Contexte :** ADR-0025 a séparé `utilisateurs.gerer` de `roles.gerer` précisément « pour qu'un Superviseur ne puisse pas s'octroyer n'importe quelle permission en deux clics ». La séparation était contournable en un clic : le Superviseur, qui gère les comptes internes, voyait dans le formulaire de création **toutes** les cases de rôles, dont *Administrateur*. Il se créait un compte administrateur — ou s'ajoutait le rôle à lui-même — et reprenait tout ce que la séparation lui refusait. Constaté par le porteur sur l'écran « Nouvel utilisateur ».
**Décision :**
- **Un rôle n'est attribuable que par un compte qui porte déjà chacune de ses permissions.** La règle porte sur le contenu réel des rôles, pas sur leurs noms : recomposer un rôle déplace aussitôt qui peut l'attribuer.
- **Le retrait est le symétrique de l'attribution** : on ne modifie pas un compte dont on ne saurait pas conférer les rôles. Sans cela, le Superviseur ne créait pas d'Administrateur mais le rétrogradait — ou, plus direct encore, lui changeait son mot de passe pour prendre sa place, `UserUpdateRequest` acceptant ce champ. La porte se ferme donc au niveau du **compte**, pas de la charge utile : édition, changement de mot de passe et désactivation d'un Administrateur sont refusés au Superviseur d'un seul geste.
- La règle est posée **aux deux niveaux**, comme pour les rôles clients (ADR-0031) : l'écran ne propose plus ce qui n'est pas conférable, et la validation le refuse — une requête forgée n'a pas d'écran à contourner.
- Le super-admin n'est pas concerné : il outrepasse via `Gate::before`, donc `can()` lui répond oui pour tout.
**Alternatives écartées :**
- *Interdire nommément le rôle « Administrateur » aux non-Administrateurs* — trois lignes, très lisible, mais elle se périme au premier rôle recomposé : un Conférencier à qui l'on confierait `roles.gerer` resterait attribuable par un Superviseur.
- *« On n'attribue qu'un rôle qu'on porte soi-même »* — écartée : elle interdirait au Superviseur de créer un Conférencier, ce qui est son travail.
- *Ne fermer que l'attribution, laisser le retrait ouvert* — écartée par le porteur : elle laisse intacte la neutralisation d'un administrateur, et surtout le vol de son compte par changement de mot de passe.
**Conséquences :**
- Un Superviseur peut créer et éditer Conférencier, Agent dépouilleur, Consultant et Superviseur — dont les permissions sont incluses dans les siennes — mais ni voir ni toucher un compte Administrateur. C'est un **rétrécissement réel de ses pouvoirs**, assumé.
- La liste des comptes porte un drapeau `peut_modifier` par ligne : l'écran grise ce que la `UserPolicy` refuserait, au lieu de laisser cliquer vers un 403.
- Le coût est une jointure de plus (`roles.permissions`) sur la liste des comptes internes, et une lecture du rôle par entrée validée. Négligeable à l'échelle des comptes CGC.
- **Non traité :** rien n'empêche encore un Administrateur de se retirer à lui-même le rôle Administrateur ; l'anti-auto-blocage d'ADR-0012 ne couvre que `utilisateurs.gerer`.

## ADR-0032 — Ce que la page de connexion révèle : l'état du compte, jamais son existence — 2026-07-31
**Statut :** Acceptée (grilling du porteur, 2026-07-31) — **complète ADR-0013, ADR-0024 et ADR-0026**.
**Contexte :** deux colonnes gouvernent l'accès d'un compte agent (ADR-0026) mais **une seule était lue à la connexion**. `is_active` bloquait, muettement — « sans révéler la cause exacte ». `statut_validation` ne bloquait pas du tout : un agent créé par sa société et **pas encore validé par le CGC** pouvait se connecter et atterrir sur un écran vide, alors que le circuit d'ADR-0013 dit précisément qu'il ne peut rien faire avant validation. Le porteur a demandé des messages explicites, y compris pour un compte inexistant.
**Décision :**
- **L'état d'un compte n'est révélé qu'après vérification du mot de passe.** Tant que le couple identifiant/mot de passe n'est pas juste, la réponse est un **message générique unique**, identique pour un email inconnu et pour un mot de passe faux.
- Une fois les identifiants reconnus, quatre issues : `en attente` → « votre compte est en attente de validation par le CGC » ; `refusé` → message de refus ; désactivé → « votre compte a été suspendu, contactez le CGC » ; sinon, la session s'ouvre.
- Dans les trois premiers cas, **la session ne s'ouvre pas** — le message informe, il n'accorde rien.
**Alternatives écartées :**
- *Annoncer « ce compte n'existe pas » dès un email inconnu*, comme demandé initialement — **écarté après mise en garde, arbitrage du porteur** : le formulaire de connexion serait devenu un **annuaire**. Tester des adresses en masse aurait révélé lesquelles sont des comptes valides du CGC — le premier reproche d'un audit sur une plateforme d'État. Le compromis retenu informe l'utilisateur légitime (qui connaît son mot de passe) sans rien apprendre à l'inconnu.
- *Garder le silence complet*, comme aujourd'hui — écarté : un titulaire dont l'agent « n'arrive pas à se connecter » appelle le CGC pour un problème de mot de passe qui n'en est pas un. Le coût se paie au support.
- *Laisser entrer l'agent en attente vers un écran d'attente* — écarté : ADR-0013 lui interdit d'opérer ; une session ouverte qui ne mène à rien est une promesse vide, et une surface d'attaque de plus.
**Conséquences :**
- `Fortify::authenticateUsing()` ne peut plus se contenter d'un booléen : il distingue l'échec d'identification de l'échec d'état. Les messages sont des **erreurs de validation sur le champ email**, comme le reste du formulaire.
- La limitation à **5 tentatives par minute** reste la seule barrière contre l'essai de mots de passe en masse ; elle devient structurante, puisque c'est elle qui empêche d'atteindre le palier où l'état est révélé.
- Le cas « désactivé » gagne un message là où ADR-0012 avait choisi le silence : la cause n'est plus cachée à qui prouve être le titulaire du compte.

## ADR-0031 — Deux rôles clients au catalogue, figés — 2026-07-31
**Statut :** Acceptée (grilling du porteur, 2026-07-31) — **amende ADR-0025**, dont elle retient l'alternative écartée le 2026-07-29.
**Contexte :** ADR-0025 avait refusé d'inscrire « Titulaire » et « Agent consignataire » au catalogue de rôles, au motif qu'un administrateur pourrait **vider ces rôles par mégarde et retirer « déclarer » à tous les agents du pays**. Les droits clients découlaient donc du seul rattachement. En cadrant la navigation filtrée d'ADR-0030, la question s'est reposée : l'interface a besoin d'un appel d'autorisation **uniforme**, qui ne sache pas à qui elle parle. Le porteur a rouvert le débat avec un argument nouveau — *« ça permet de voir réellement à l'écran les capacités du titulaire et des agents »*.
**Décision :**
- **Deux rôles rejoignent le catalogue** : `Consignataire titulaire` et `Consignataire agent` — noms arrêtés à l'implémentation (2026-07-31), pour qu'ils se lisent comme les autres colonnes de la matrice, à côté de « Conférencier » et « Agent dépouilleur ».
- Ils sont **figés** : non recomposables depuis l'écran « Rôles & permissions », au même titre que la ligne Administrateur. Ils s'y affichent **tout cochés et en lecture** — le but est précisément de rendre ces capacités visibles.
- Composition : le compte maître porte `situation-portuaire.consulter`, `dossiers.consulter`, `devis.consulter` et `mes-agents.gerer` ; l'agent, les deux premières seulement.
- **`mes-agents.gerer`** porte tout le pouvoir du titulaire sur sa propre société : créer et modifier ses agents, **leur affecter les armements**, éditer les coordonnées de contact.
- **La portée reste le rattachement.** Le rôle dit *ce qu'on peut faire*, la société et les armements affectés disent *sur quoi* — cette séparation, posée en ADR-0025 et déjà écrite dans le modèle, ne bouge pas.
- Le rôle est **assigné à l'ouverture du compte** et rattrapé pour les comptes clients déjà en base.
**Alternatives écartées :**
- *Une règle unique dans le code* (les permissions clients accordées à côté du `Gate::before` du super-admin) — techniquement équivalente et fidèle à ADR-0025, mais **elle ne se voit nulle part**. C'est exactement ce que le porteur a refusé : une capacité qui n'apparaît sur aucun écran est une capacité qu'on oublie, et que personne ne peut vérifier sans lire le code.
- *Des rôles clients recomposables* — écarté : rouvre mot pour mot le risque d'ADR-0025. Les figer neutralise l'objection sans rien coûter, puisque ces droits sont **les mêmes pour tous les titulaires et tous les agents** : il n'y a aucune variabilité à administrer.
**Conséquences :**
- **ADR-0025 est amendée sur ce point précis** — son « le catalogue ne sert que les internes CGC » ne tient plus. Tout le reste de cette ADR (garde `comptes-clients.gerer`, ligne Administrateur figée, écran qui recompose sans créer) reste en vigueur.
- `Profil::estRecomposable()` gagne deux exclusions ; la matrice passe de 5 à **7 lignes**, qu'il faut désormais **grouper** — internes CGC d'un côté, comptes clients de l'autre — sans quoi elle mélange deux populations sans le dire.
- **Le CGC perd l'écriture sur l'affectation des armements** : `mes-agents.gerer` la donne au titulaire seul. La matrice reste affichée côté CGC **en lecture seule** — voir qui opère sur quoi sert au support et à l'audit ; la route d'écriture, elle, disparaît.
- `GLOSSARY.md` (« Compte client ») est corrigé : les droits ne découlent plus du seul rattachement.

## ADR-0030 — Une coquille unique pour l'activité, une navigation filtrée par permission — 2026-07-31
**Statut :** Acceptée (grilling du porteur, 2026-07-31) — **solde la dette laissée par ADR-0021** (« reste à brancher la redirection post-login selon le type de compte »).
**Contexte :** seul le panneau d'administration CGC avait une coquille écrite — bandeau institutionnel, rail vertical de 4 modules, en-tête d'écran, onglets. Les **huit maquettes** du projet Claude Design (`Connexion`, `Administration`, `Administration consignataire`, `Situation portuaire`, `Dossiers escale`, `Ouverture dossier escale`, `Manifeste`, `Devis et Facturation`) montrent que tout le reste de l'application partage une **autre** charpente : le même bandeau, mais un en-tête applicatif **horizontal** portant la navigation. Le porteur a tranché : cette charpente est celle de l'**activité**, pour les clients comme pour les internes ; le rail vertical reste l'exception administrative.
**Décision :**
- **Deux coquilles, pas une.** « Activité » (navigation horizontale) pour **tout le monde** ; « Administration CGC » (rail vertical) pour le Superviseur et l'Administrateur, atteinte par l'entrée *Administration* et quittée par « Retour à la plateforme » — lien déjà en place. Elles partagent le bandeau institutionnel, l'en-tête d'écran et la barre d'onglets.
- **Aucun aiguillage post-login.** Tout le monde arrive sur `/dashboard` ; ce sont la navigation et le contexte affiché qui diffèrent, pas la route. Un consignataire ouvre la plateforme et **il est chez lui**.
- **Cinq entrées, chacune conditionnée à une permission** : *Tableau de bord* (toujours), *Situation portuaire*, *Dossiers d'escale*, *Devis & factures*, *Administration*. Un agent consignataire ne voit ni *Devis & factures* — c'est de l'argent, il reste au titulaire — ni *Administration*. Le Consultant ne voit que le tableau de bord jusqu'à ce que le module Statistiques existe.
- **L'entrée *Administration* mène à deux endroits selon le compte** : l'espace de sa société pour un titulaire, le panneau CGC pour un Superviseur ou un Administrateur. Jamais les deux.
- **Carte de contexte** en haut à droite — « Espace de {société} — Agrément {n°} » pour un compte client, **rien** pour un interne CGC. *À l'implémentation (2026-08-01) : le numéro d'agrément n'existe pas en base ; la carte affiche le **RCCM/NIF** en attendant que le champ soit tranché.*
- **Trois permissions de consultation à créer** : `situation-portuaire.consulter`, `dossiers.consulter`, `devis.consulter`. Le catalogue ne décrivait jusqu'ici que des **actions** ; une navigation filtrée a besoin de droits de **lecture**.
- **Qui reçoit quelle consultation, côté CGC** (matrice arrêtée le 2026-08-01) : le Conférencier n'a que *Situation portuaire* — il la renseigne, il ne suit pas les dossiers ; l'Agent dépouilleur et le Superviseur ont les trois ; l'Administrateur les a par son catalogue ; le **Consultant n'en a aucune** — son écran est *Statistiques*, qui n'existe pas encore.
- **`mes-agents.gerer` quitte la composition de l'Administrateur** : « ses » agents, ce sont ceux d'une société consignataire, et un compte interne n'en a pas. La ligne Administrateur reste figée, mais elle ne porte plus le catalogue *complet*.
- Les entrées dont le module n'existe pas encore mènent à un écran « à venir », comme `bareme` et `audit` aujourd'hui. Le tableau de bord est **vide** pour tous, provisoirement.
- **Deux écarts assumés à la maquette** : le bloc sécurité se limite au mot de passe (passkeys et 2FA retirés par ADR-0019), et la demande d'ajout d'un armement ne sera pas construite — elle se traite **hors système**, la liste des armements du client reste en lecture seule.
**Alternatives écartées :**
- *Rediriger chaque type de compte vers sa propre route d'accueil* — écarté : deux fois plus de routes pour un contenu qui diffère de toute façon par les données projetées, et un point de bascule de plus à maintenir à chaque nouveau profil.
- *Afficher les cinq entrées à tout le monde et laisser le 403 trancher* — écarté : une navigation qui promet ce qu'elle ne tient pas. Le refus expliqué (`errors/403`) reste le filet pour une URL tapée à la main, pas le mode de fonctionnement normal.
- *Étendre le rail vertical à toute l'application* — écarté : il a été dessiné pour quatre modules d'administration, pas pour un parcours d'exploitation.
**Conséquences :**
- Le tableau de bord du starter kit disparaît au profit d'un écran unique dans la nouvelle coquille. `AdminShell` n'est pas touché.
- Chaque module livré ensuite (situation portuaire, dossiers, manifeste, devis) **se branche sur une entrée déjà en place** — c'est le bénéfice de poser la charpente avant le contenu.
- La navigation devient le point de vérité de « qui a le droit de voir quoi » : toute nouvelle permission de consultation devra y être rattachée, sous peine d'un module inatteignable.
- Les entrées sont **calculées côté serveur** (`HandleInertiaRequests`) et non déduites des permissions dans le navigateur : « quelle permission ouvre quel écran » est une règle métier, et l'entrée *Administration* mène de toute façon à deux endroits selon le compte.
- Les bases déjà peuplées sont rattrapées par **`roles:aligner-consultations`** — additive, parce que rejouer le seeder écraserait les compositions amendées depuis l'écran des rôles.
- La **puce utilisateur gagne un menu** que la maquette n'avait pas : sans lui, la déconnexion ne serait atteignable depuis aucun écran d'activité.

## ADR-0029 — Branche unique sur `main`, sans pull request, tant qu'il n'y a qu'un développeur — 2026-07-30
**Statut :** Acceptée (arbitrage du porteur, 2026-07-30) — **remplace la section « Branches » de `WORKFLOW.md`**.
**Contexte :** le harnais posait un modèle par branches courtes avec `main` protégée et revue obligatoire. Dans les faits, une seule branche a été ouverte (`feature/phase-3-referentiels-crud`) et quatre tranches y ont été empilées — référentiels, comptes clients, matrice des rôles, fiches détail — sans jamais être mergée. Le nom décrivait alors un quart du contenu et a dû être renommé. Le porteur a relevé que le problème se reproduirait à chaque nouveau sujet : une branche longue portant un nom thématique est condamnée à mentir. Par ailleurs le modèle ne tenait pas sa promesse — la revue obligatoire n'a pas de sens quand le seul relecteur est l'auteur.
**Décision :**
- Le développement se fait **directement sur `main`**, sans branche de fonctionnalité et sans pull request. `main` n'est pas protégée sur GitHub.
- **Un commit par tranche livrée**, poussé aussitôt. C'est la leçon de l'incident : quatre tranches empilées avant le premier commit s'étaient entremêlées dans les mêmes fichiers (`UserController`, `routes/web.php`, `utilisateurs.tsx`) et ne pouvaient plus être séparées en commits cohérents.
- **La checklist locale remplace la revue** : Pint, Pest, `composer types:check`, et pour le front `tsc`, ESLint et le build — avant le push, jamais après.
- Un commit qui passe mal se répare par **`git revert`**. Jamais de réécriture d'historique sur `main`.
**Alternatives écartées :** *garder les branches courtes* — écarté : sans second développeur, elles ajoutent un coût de nommage et de merge sans apporter de relecture. *Branche longue nommée par thème* — c'est précisément ce qui a échoué : le pire des deux modèles, puisqu'on paie le coût de la branche sans la refermer.
**Conséquences :**
- **La CI ne peut plus rien empêcher.** Elle se déclenche sur push vers `main` et constate après coup ; il n'y a plus de merge à bloquer. C'est le coût assumé de la décision, et la raison pour laquelle la checklist locale n'est plus facultative.
- Le modèle par branches courtes reste la **cible le jour où un second développeur rejoint le projet** — il est décrit dans `WORKFLOW.md` pour ne pas être réinventé.
- Deux sujets menés en parallèle ne peuvent plus être isolés l'un de l'autre.
- Dependabot continue de créer ses propres branches : c'est le seul cas où une branche apparaît sans intervention.

## ADR-0028 — Les décisions sur les comptes clients sont notifiées par courriel ; le mot de passe ne circule jamais — 2026-07-29
**Statut :** Acceptée (arbitrage du porteur, 2026-07-29) — **complète ADR-0013, ADR-0024 et ADR-0027**.
**Contexte :** rien ne sortait de l'application. Un titulaire dont le CGC venait d'ouvrir le compte ne l'apprenait que si un agent l'appelait, et le mot de passe initial — saisi par le CGC — circulait hors de tout canal maîtrisé. De même, une société dont un agent était validé ou refusé n'en savait rien : le motif de refus, pourtant obligatoire, ne quittait pas la base.
**Décision :**
- **Ouverture d'un compte titulaire** → courriel à l'intéressé portant un **lien de définition de mot de passe** (jeton du flux de réinitialisation existant). Le champ mot de passe disparaît du tiroir : le CGC pose un secret jetable qu'il ne connaît pas et qui ne sert jamais. Le lien expire au bout d'une heure, d'où le rappel explicite du recours « mot de passe oublié ».
- **Validation et refus d'un compte agent** → courriel à **trois destinataires** : l'agent, le titulaire du compte de sa société, et l'adresse de la société. Dédoublonné par adresse — dans les petites structures le titulaire est aussi le contact, et deux courriels identiques donneraient à croire à deux décisions. Un destinataire manquant (société sans adresse, titulaire non désigné) n'empêche pas les autres d'être prévenus.
- **Le refus porte son motif.** C'est la contrepartie de son caractère obligatoire (ADR-0024) : sans lui, la société ne sait pas quoi corriger avant de soumettre à nouveau.
- **Envoi après commit, jamais pendant.** Un courriel parti sur une transaction qui échoue annoncerait un compte qui n'existe pas.
- **Textes en français indépendamment de la locale de l'instance** (`->locale('fr')` sur chaque notification) : les destinataires sont des sociétés gabonaises. `lang/fr.json` traduit les quelques chaînes du gabarit Laravel.
**Alternatives écartées :** *mot de passe transmis dans le courriel* — proscrit : un secret en clair dans une boîte de réception, et le CGC détiendrait les identifiants de ses assujettis. *L'administrateur saisit le mot de passe et le communique de vive voix* — écarté par le porteur au profit du lien : le secret circulait encore. *Notifications en file d'attente (`ShouldQueue`)* — écartées pour l'instant : sans exécutant actif rien ne partirait, et l'échec serait silencieux ; le volume (quelques comptes par mois) ne justifie pas cette infrastructure.
**Conséquences :** l'instance doit être dotée d'un SMTP réel — `MAIL_MAILER` vaut `log` en développement, les messages n'y quittent pas les journaux. L'expéditeur par défaut devient institutionnel (`ne-pas-repondre@cgc.ga`, « e-CDTS — Conseil Gabonais des Chargeurs ») et non plus `hello@example.com`. Un échec d'envoi remonte aujourd'hui comme une erreur de requête : à revoir si le SMTP se révèle instable en production.

## ADR-0027 — Le titulaire s'ouvre depuis la fiche société, actif d'emblée, et déclare comme les autres — 2026-07-29
**Statut :** Acceptée (arbitrage du porteur, 2026-07-29) — **complète ADR-0023**, **applique ADR-0010**.
**Contexte :** ADR-0023 a tranché la *modélisation* du titulaire (un `User` désigné par `consignataires.titulaire_user_id`), mais aucun écran ne le renseignait : la colonne restait nulle pour toutes les sociétés. Or c'est lui qui crée les comptes de ses agents (WF1) — sans titulaire, le portail consignataire n'a personne pour s'y connecter. Restait à décider *où* on le saisit, *comment* il s'active, et *ce qu'il peut faire*.
**Décision :**
- **Il se saisit sur la fiche société**, dans le même tiroir et la même transaction. ADR-0010 confie au module 1 « la création des consignataires (comptes maîtres) » : le compte maître naît avec la société, pas dans un écran séparé.
- **Le bloc est facultatif.** Une fiche société peut exister avant que son titulaire ne soit désigné — c'était déjà l'hypothèse de `titulaire_user_id` nullable. Mais dès qu'une adresse e-mail est saisie, identité et mot de passe deviennent obligatoires : on n'ouvre pas un compte à moitié.
- **Il est actif immédiatement, sans passer par le circuit de validation** d'ADR-0013. Ce circuit protège des comptes que la société ouvre elle-même ; ici c'est le CGC qui saisit — il n'a pas à se valider lui-même. La trace (`valide_par_user_id`, `valide_le`) est renseignée avec l'agent CGC qui a ouvert le compte, si bien que l'origine de tout compte client reste lisible.
- **C'est un agent déclarant à part entière** : il figure dans l'onglet Agents, porte une portée d'armements (ADR-0009) et se suspend comme les autres. Sa qualité de titulaire est un **marqueur**, pas un statut à part — elle dit qu'il gère *en plus* les comptes de sa société.
- **Modifier le bloc édite le compte existant**, il ne désigne pas quelqu'un d'autre. Changer de titulaire est un geste distinct, qui n'existe pas encore.
**Alternatives écartées :** *un écran dédié à l'ouverture du compte maître* — rejeté : deux gestes pour un seul acte métier, et une fenêtre pendant laquelle la société existe sans personne pour l'administrer. *Soumettre le titulaire au circuit de validation* — rejeté : le CGC validerait ce qu'il vient lui-même de saisir. *Un titulaire purement gestionnaire, sans portée d'armements* — écarté par le porteur : dans les sociétés visées, celui qui gère les comptes déclare aussi.
**Conséquences :** l'onglet Consignataires gagne une colonne « Titulaire du compte », qui affiche « À désigner » tant qu'il manque — l'absence devient visible plutôt que muette.

**Complément du 2026-07-29 — le remplacement existe.** Le porteur a tranché : l'administrateur doit pouvoir confier la fonction à quelqu'un d'autre. Geste **distinct** de la modification de la fiche, sur sa propre route, avec deux chemins — désigner un agent **déjà validé de la société** (réorganisation interne) ou **ouvrir le compte d'une nouvelle personne** (le sortant est parti). Le sortant **reste agent déclarant** : il perd la gestion des comptes, pas son accès ni ses affectations ; le désactiver est le geste séparé de l'onglet Agents. L'entrant est prévenu par courriel (ADR-0028). Action sensible : **à inscrire au journal d'audit** quand ce module existera. La saisie du mot de passe par le CGC, elle, a disparu au profit du lien envoyé par courriel (ADR-0028).

## ADR-0026 — Compte agent : la décision du CGC et l'activation sont deux colonnes distinctes ; le refus n'est pas définitif — 2026-07-29
**Statut :** Acceptée (arbitrage du porteur, 2026-07-29) — **implémente ADR-0013 et ADR-0024**.
**Contexte :** en câblant le circuit de validation des comptes agents (ADR-0013), il fallait décider comment stocker les quatre états de l'écran — actif, en attente, désactivé, refusé — sachant que `users.is_active` existait déjà et **conditionne seul la connexion** (garde du `FortifyServiceProvider`). Deux mécanismes d'activation dans la même table auraient été un piège : le jour où l'un dit oui et l'autre non, c'est le garde d'authentification qui tranche, pas l'écran.
**Décision :**
- **Deux colonnes, deux responsabilités.** `statut_validation` (`en_attente` / `valide` / `refuse`) porte la **décision du CGC** ; `is_active` reste la **seule vérité de la connexion**. Les quatre états affichés sont leur combinaison : `valide` + actif = actif, `valide` + inactif = désactivé. Rien à changer à l'authentification.
- **Le compte agent vit dans `users`**, distingué par `consignataire_id` non nul. Une contrainte `CHECK` (PostgreSQL) impose que les deux colonnes soient nulles ensemble ou renseignées ensemble : un interne n'a pas de statut de validation.
- **Le refus n'est pas définitif.** Une société dont l'agent est refusé peut soumettre à nouveau : le compte repasse en attente, **sans effacer la décision précédente** (qui, quand, motif), qui n'est remplacée que par la décision suivante. Conforme à ADR-0024 : le compte refusé reste en base comme trace opposable, sans devenir une impasse administrative.
- **Le motif de refus est obligatoire.** C'est lui qui rend la décision opposable et qui indique à la société ce qu'elle doit corriger.
- **Refuser ≠ désactiver.** Le refus tranche une demande (depuis `en_attente` seulement) ; la désactivation interrompt un accès déjà accordé (sur un compte `valide` seulement). Les transitions invalides sont rejetées, jamais absorbées en silence.
- **La portée agent ↔ armements** (ADR-0009) est bornée aux armements représentés par sa société : un identifiant hors périmètre **fait échouer la requête**, il n'est pas filtré discrètement.
- **Le décompte « comptes à valider » est une donnée partagée Inertia**, pas une prop de page : le badge vit dans le rail d'administration, donc s'affiche depuis n'importe quel module. Il vaut 0 pour qui ne détient pas `comptes-clients.gerer`.
**Alternatives écartées :** *un seul enum à quatre valeurs remplaçant `is_active` pour les agents* — rejeté : deux mécanismes d'activation coexisteraient dans la même table et le garde de connexion devrait connaître les deux. *Une table `agents` séparée reliée 1-1 à `users`* — rejetée : une jointure systématique et un modèle de plus pour isoler ce qu'une colonne nullable distingue déjà. *Refus définitif* — écarté par le porteur : une erreur de manipulation deviendrait irréversible, alors que la trace est déjà assurée par la conservation du compte. *Prop de page pour le badge* — rejetée : elle n'alimenterait le rail que sur l'écran Utilisateurs.
**Conséquences :** l'écran Agents est un écran de **décision**, sans création — la société crée ses agents depuis son portail, qui reste à construire ; d'ici là le jeu de démonstration alimente les quatre états. Le volet client (fiche société **et** comptes agents) passe entièrement sous `comptes-clients.gerer` (ADR-0025), ce qui solde l'incohérence des routes consignataires. Les contraintes `CHECK` ne sont posées que sur PostgreSQL, la suite de tests tournant sur SQLite.

## ADR-0025 — Catalogue de rôles réservé aux internes ; matrice recomposable, ligne Administrateur figée — 2026-07-29
**Statut :** Acceptée (grilling du porteur, 2026-07-29) — **précise ADR-0012 et ADR-0015**, **amende ADR-0012** sur la création de rôles. **Amendée par ADR-0031** (2026-07-31) : le catalogue accueille finalement deux rôles clients, figés.
**Contexte :** avant de construire l'écran « Rôles & permissions », quatre zones d'ombre restaient : jusqu'où va le catalogue (les clients en font-ils partie ?), ce qu'on peut faire depuis l'écran, qui peut le faire, et comment le CGC est protégé de lui-même.
**Décision :**
- ~~**Le catalogue ne sert que les internes CGC.** Les droits d'un compte client découlent de son **rattachement** (société consignataire, armements affectés), vérifiés par des policies dédiées — pas d'un rôle spatie.~~ **Amendé (ADR-0031)** : deux rôles clients **figés** rejoignent le catalogue, pour que ces capacités soient visibles à l'écran. Le rattachement reste la source de la **portée**, jamais du droit.
- **Tout le volet client est gardé par `comptes-clients.gerer`** — fiche société consignataire **et** validation des comptes agents — donc **Administrateur seul** (cohérent ADR-0013). Le Superviseur conserve `utilisateurs.gerer` pour les comptes internes uniquement.
- **L'écran recompose, il ne crée pas.** On coche/décoche les permissions des rôles existants ; la création, le renommage et la suppression de rôles ne sont **pas** au périmètre.
- **Nouvelle permission `roles.gerer`** (13e du catalogue), portée par l'Administrateur seul. Sans elle, un Superviseur détenteur de `utilisateurs.gerer` pouvait s'octroyer `bareme.modifier` — escalade de privilèges en deux clics.
- **La ligne Administrateur est figée** : elle porte le catalogue complet par définition (ADR-0015, « peut tout faire côté CGC »), s'affiche tout cochée et non modifiable. Seuls Conférencier, Agent dépouilleur, Superviseur et Consultant sont recomposables.
- **Le Superviseur voit l'onglet Consignataires en lecture seule** : la liste et les rattachements, sans bouton d'ajout ni actions de ligne. Même régime pour l'onglet Agents.
- L'écran est le **4ᵉ onglet** de `/admin/utilisateurs`, visible pour les seuls détenteurs de `roles.gerer`.
- **Aucune journalisation** de la recomposition pour l'instant : le module Journal d'audit définira son mécanisme et couvrira tous les gestes sensibles d'un coup.
**Alternatives écartées :**
- *Ajouter des rôles « Titulaire » et « Agent consignataire » au catalogue* — unifierait le contrôle d'accès derrière `can()`, mais exposerait des rôles qu'un administrateur pourrait vider par mégarde, retirant « déclarer » à tous les agents du pays. Le rattachement est de toute façon la source de vérité pour les clients (armements affectés) : un rôle n'aurait rien ajouté. — **Retenue depuis (ADR-0031)** : les rôles sont **figés**, ce qui referme le risque du vidage, et ils rendent visibles à l'écran des capacités qui, autrement, ne se lisaient que dans le code.
- *CRUD complet des rôles*, comme l'annonçait ADR-0012 — écarté par proportionnalité : il faudrait traiter l'unicité des noms, le sort d'un rôle supprimé encore porté par des comptes, les rôles vides. Le besoin réel (« le Superviseur ne doit plus toucher au barème ») est couvert par la recomposition seule. **Réouvrable.**
- *Garder l'écran sous `utilisateurs.gerer`* — laissait l'escalade ouverte, avec pour seul garde-fou un journal d'audit a posteriori qui n'existe pas encore.
- *Anti-auto-blocage par contrôle à l'enregistrement* (refuser de retirer `roles.gerer` au dernier rôle qui la porte) — devenu **sans objet** : figer la ligne Administrateur rend le verrouillage impossible par construction, sans une ligne de code de garde.
- *Journaliser dès maintenant* — écarté pour ne pas figer un format que le module Audit devrait ensuite reprendre ou migrer. Coût assumé : l'historique des premières recompositions est perdu.
**Conséquences :**
- ~~**Dette immédiate** : les trois routes consignataires de la phase 3 sont sous `utilisateurs.gerer` et doivent passer sous `comptes-clients.gerer`.~~ **Soldée** (phase 4) : tout le volet client, agents compris, est passé sous `comptes-clients.gerer`.
- `Permission` gagne `roles.gerer` ; `Profil::permissionsParDefaut()` la donne à l'Administrateur (automatiquement, via `Permission::cases()`).
- L'écran doit gérer un **état lecture seule**, nouveau dans le panneau d'administration : jusqu'ici un onglet était accessible ou absent.
- Le rôle `super-admin` n'apparaît pas dans la matrice : protégé, il outrepasse via `Gate::before` et ne porte aucune permission explicite — l'afficher serait mensonger. Cohérent avec son exclusion déjà en place des rôles attribuables.
- ADR-0012 reste vrai sur le fond (la composition est éditable) mais son « créer d'autres rôles » est **reporté**, pas acquis.

**Mise en œuvre (2026-07-29)** — décision appliquée telle quelle, sans amendement :
- `Permission::RolesGerer` est la 13ᵉ du catalogue ; `Permission::domaine()` groupe l'affichage en Exploitation / Administration / Consultation. `Profil::estRecomposable()` porte la liste blanche (tout sauf `Administrateur` et `super-admin`).
- `PATCH admin/utilisateurs/roles/{role}` (`Admin\Users\RoleController`) sous `can:roles.gerer`. Le refus des rôles figés est **dans `RoleUpdateRequest::authorize()`**, pas dans l'UI : une requête forgée n'a pas d'interface à contourner.
- La matrice n'est pas projetée du tout (`matriceRoles` nul) sans `roles.gerer` — la composition des rôles ne transite pas jusqu'au navigateur d'un Superviseur.
- L'**état lecture seule** annoncé se matérialise par un `BandeauInfo` : les actions disparaissent *et* une phrase dit pourquoi, l'Administrateur étant nommé comme interlocuteur. Un écran amputé sans explication se lirait comme une panne. Même principe pour le refus serveur : tout 403 web rend `pages/errors/403.tsx` au lieu de la page nue de Laravel.
- Couvert par `tests/Feature/Admin/RoleMatrixTest.php` (7 cas), dont le gel d'`Administrateur`, l'intouchabilité de `super-admin` et l'escalade fermée au Superviseur.

## ADR-0024 — Un compte agent refusé est conservé en base comme trace opposable — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28) — **précise ADR-0013**.
**Contexte :** ADR-0013 soumet l'ouverture d'un compte agent à la validation du CGC. Restait à trancher le sort d'une demande **refusée** : disparaît-elle, ou reste-t-elle en base ? La question n'est pas technique mais juridique — le CGC est une administration, et la déclaration douanière engage.
**Décision :** le refus est un **état**, pas une suppression. Le compte refusé reste en base avec son statut `refusé` ; il ne peut pas se connecter, mais il est listé, consultable et réexaminable. Aucune purge : ni à la main, ni par le temps.
**Alternatives écartées :**
- **Supprimer la demande refusée.** Elle efface la preuve que le CGC a bien statué, et à quelle date. Une société pourrait soutenir qu'elle n'a jamais reçu de réponse ; l'administration n'aurait rien à opposer. C'est exactement ce que la non-répudiation d'ADR-0013 cherche à empêcher.
- **Conserver la trace ailleurs (journal d'audit seul), en supprimant le compte.** La trace survivrait, mais l'écran de gestion ne montrerait plus rien : le gestionnaire ne saurait pas qu'une demande a déjà été refusée et pourrait rouvrir le même compte sans le savoir. La trace doit être là où la décision se prend.
**Conséquences :**
- Le statut d'un compte agent est un **cycle de vie** (`en attente` → `actif` | `refusé`, et `actif` ⇄ `désactivé`), pas un booléen. Cohérent avec ADR-0012 : on désactive, on ne supprime pas — ici on refuse, on ne supprime pas non plus.
- Un même e-mail peut porter une demande refusée puis une demande réexaminée : l'unicité de `users.email` interdit un second compte, le réexamen agit donc **sur le compte existant**. C'est le comportement déjà esquissé par la démo (bouton « Réexaminer »).
- **Reste à trancher, à l'implémentation des Agents :** faut-il enregistrer le **motif** du refus et l'**identité du valideur** ? Une trace opposable sans auteur ni motif est faible ; mais c'est une question de spec, pas de schéma, et elle n'est pas encore posée au porteur.

## ADR-0023 — Le titulaire d'un consignataire est un compte `User` désigné par la société — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28) — **précise ADR-0014**.
**Contexte :** ADR-0014 décrit le titulaire par ses attributs (nom, prénom, fonction, email pro, tél), ce qui laissait ouverte une question de modélisation : simples colonnes sur la fiche société, ou véritable compte ? Or le titulaire **se connecte**, **déclare** et **crée ses agents** — il lui faut donc de toute façon un compte authentifiable.
**Décision :**
- Le titulaire **est un `User`**. Ses attributs sont ceux du compte (`first_name`, `last_name`, `job_title`, `phone`, `email`), non des colonnes dupliquées sur `consignataires`.
- La désignation se porte **du côté société** : `consignataires.titulaire_user_id`, nullable et **unique**. Nullable parce que le CGC crée la fiche société avant d'ouvrir le compte (WF1) ; unique parce qu'un compte ne peut être titulaire de deux sociétés.
- `onDelete: set null` — supprimer un compte ne doit jamais emporter la société facturée.
- Les deux relations multiples d'ADR-0014 deviennent des pivots : `armement_consignataire` (armements représentés) et `consignataire_port` (ports de rattachement), clé primaire composite, `cascade` explicite des deux côtés.
**Alternatives écartées :** *colonnes plates `titulaire_nom`, `titulaire_email`… sur `consignataires`* — écarté : le titulaire se connecte, il aurait fallu un `User` en double et deux sources de vérité pour la même personne. *FK portée par l'utilisateur (`users.titulaire_consignataire_id`)* — écarté : c'est la société qui désigne son représentant, pas l'inverse ; et le rattachement **des agents** à leur société (ADR-0013) viendra plus tard côté `users`, où il ne se confondra pas avec la désignation du titulaire.
**Conséquences :**
- Un agent consignataire aura, lui, un rattachement **côté `users`** ; le titulaire portera donc les deux liens (son compte appartient à la société, et la société le désigne). Distinction voulue : « appartenir à » et « représenter » ne sont pas la même chose.
- Le nom de la société est `name` (comme `armements.name`), pas `raison_sociale` : les deux fiches entreprise partagent la même colonne vertébrale d'identité (ADR-0014), autant qu'elles partagent le vocabulaire de colonnes.
- Les FK des nouvelles tables sont **indexées explicitement** : PostgreSQL, contrairement à MySQL, n'indexe pas une clé étrangère automatiquement. Les tables `armements`, `navires` et `ports`, créées avant que le point ne soit relevé, ne le sont pas — dette mineure, à corriger le jour où un plan de requête le justifie.

## ADR-0022 — Armements administrés depuis Référentiels ; colonne « Consignataires » différée — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28).
**Contexte :** l'onglet Armements affichait une colonne « Consignataires (N-N) » et une vue détail dépliant la relation — alimentées par des données factices. Or le modèle `Consignataire` n'existe pas : il arrive avec les comptes clients. Par ailleurs une note en pied de tableau annonçait que les armements se créaient « depuis le module Utilisateurs & habilitations », ce qui privait l'onglet de bouton d'ajout et rompait l'uniformité recherchée.
**Décision :**
- Les armements se **créent et se modifient dans Référentiels**, comme les quatre autres référentiels. La note renvoyant vers Utilisateurs est retirée.
- La colonne « Consignataires » et la **vue détail N-N sont supprimées** jusqu'à l'arrivée du modèle `Consignataire`. Le tableau affiche ce qui existe réellement en base : nom, pays d'origine, pays d'immatriculation, nombre de navires, statut.
- Les champs d'identité société (`sigle`, `gerant`, `rccm_nif`, `adresse`) sont **saisis dès maintenant** dans le tiroir, bien que leur usage aval ne soit pas encore arrêté.
**Alternatives écartées :** *garder la colonne avec un placeholder « — »* — écarté : une colonne morte se lit comme une donnée manquante, pas comme une fonction à venir. *Créer le modèle `Consignataire` maintenant* — écarté : élargit la tranche bien au-delà des référentiels, et la relation N-N dépend de décisions non prises sur les comptes clients.
**Conséquences :**
- Il faudra **rétablir la colonne et la vue détail** au moment des comptes clients — c'est une dette assumée, tracée ici.
- `prefixe_numerotation` (Port) est lui aussi saisissable alors que la règle de numérotation n'est pas figée : à confronter à ADR-0008 le jour où elle le sera.

## ADR-0021 — Référentiels : structure d'onglet unifiée (socle partagé, pagination client, bouton « Ajouter » unique) — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28). **Amende ADR-0017.**
**Contexte :** au câblage des cinq référentiels, `referentiels.tsx` atteignait 866 lignes et deux façons d'ajouter une ligne coexistaient : bouton primaire du bandeau pour Navires/Ports, ligne de saisie en **pied de tableau** pour Types/Pays. Il fallait descendre au bas de la liste pour créer un pays. Aucun tableau ne paginait, alors que le référentiel Pays approche les 200 lignes.
**Décision :**
- **Un seul geste d'ajout** : le bouton primaire de l'`AdminShell`, **en haut à droite**, sur les cinq onglets. Il ouvre le **tiroir latéral**, qui gère désormais création *et* modification. Les lignes de saisie en pied de tableau sont supprimées.
- **Pagination côté client**, 25 lignes par page, sur les cinq onglets. Le serveur continue d'envoyer la liste complète — la recherche filtre donc *tout* le référentiel, pas seulement la page affichée.
- **Socle de composants partagé** (`components/admin/referentiels/`) : `ReferentielCard` (barre de recherche, compteur, tableau, état vide, pagination), `Drawer` + primitives de champ, `ConfirmDialog`, `ui.tsx` (jetons de style, badges, actions de ligne) et le hook `useReferentiel` (recherche, pagination, tiroir, confirmation, mutations Inertia). Un onglet ne décrit plus que **ses colonnes et ses champs**.
- Le hook exploite le fait que les cinq référentiels exposent **les mêmes trois écritures** — d'où l'unique paramètre `ressource` qui suffit à construire les URL.
**Alternatives écartées :** *pagination serveur (`paginate()`)* — écarté : imposerait de basculer aussi la recherche côté serveur (sinon on ne cherche que dans la page visible) et un aller-retour Inertia à chaque frappe, pour des volumes qui tiennent en mémoire. *Paginer seulement Pays et Navires* — écarté : rompt l'uniformité, qui était l'objet même de la demande. *Une description abstraite de colonnes* — écarté : le rendu des cellules varie trop (badges, puces, icônes) ; chaque onglet garde son JSX de tableau, la coquille ne fournit que le cadre.
**Conséquences :**
- Le seuil de bascule vers la pagination serveur reste celui d'ADR-0017 : le premier écran à fort volume (le Manifeste).
- Un référentiel supplémentaire se câble désormais en un fichier d'onglet + un contrôleur calqué sur `PaysController`.
- Le compteur `signalCreation` relie le bouton (dans le shell) au tiroir (dans l'onglet) ; il est remis à 0 au changement d'onglet pour qu'un onglet fraîchement monté n'ouvre pas son tiroir.
- *(2026-07-28, suite)* Le socle a été **remonté de `referentiels/` vers `components/admin/`** pour servir aussi le module Utilisateurs : `ReferentielCard` → `TableCard`, `useReferentiel` → `useCrudTab`, et le paramètre `ressource` (segment) devient `base` (racine REST complète, ex. `/admin/referentiels/pays`). Ce qui est maritime — `ShipIcon`, `PortIcon`, `ModeBadge`, les formes de lignes — reste dans `referentiels/`.
- **Correctif au passage :** les contrôleurs appelaient `Inertia::flash('toast', …)` mais **rien ne lisait ce flash** — créer un pays n'affichait aucune confirmation. Le flash est désormais déclaré dans les props partagées (`types/global.d.ts`) et consommé par la page.

## ADR-0020 — Module Utilisateurs CGC : identité détaillée, désactivation (jamais suppression) et anti-auto-blocage — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28) — **implémente la Phase 2**, applique ADR-0012 (comptes créés par un admin), ADR-0015 (profils par défaut) et [[mode-exploitation-navire-escale]] hors sujet ici.
**Contexte :** premier module admin réellement câblé (les autres restent en `Route::inertia` factice). Il fallait un CRUD des comptes **internes CGC** avec affectation de rôles cumulables, sans réintroduire l'inscription publique. Le porteur a précisé les champs métier attendus et le mode de retrait d'un compte.
**Décision :**
- **Champs d'un utilisateur** : prénom, nom, e-mail (= identifiant de connexion), téléphone, poste occupé au CGC, + rôles cumulables, mot de passe, état actif. Colonnes en **snake_case anglais** (`first_name`, `last_name`, `phone`, `job_title`, `is_active`) conformément à `DATABASE.md` ; libellés en français à l'écran. Le champ `name` du starter kit est **conservé et composé « Prénom Nom »** par l'application (initiales, en-têtes) pour ne pas toucher à l'auth/au profil. Téléphone et poste **requis**.
- **Retrait = désactivation, jamais suppression** (ni physique, ni soft-delete `deleted_at`) : bascule `is_active`, réversible, traçabilité préservée. Un compte désactivé **ne peut plus se connecter** — appliqué via `Fortify::authenticateUsing` (identifiants valides **ET** `is_active`).
- **Garde-fous anti-auto-blocage (ADR-0012)** : (1) super-admin protégé — un admin ordinaire ne peut ni le modifier ni le désactiver (`UserPolicy`, sachant que le super-admin outrepasse via `Gate::before`) ; (2) le rôle `super-admin` n'est **jamais attribuable** depuis l'UI (règle de validation) ; (3) on ne peut **pas se désactiver soi-même** ; (4) on ne peut **pas se retirer à soi-même** la capacité `utilisateurs.gerer` (contrôle à la synchro des rôles). Le blocage du « dernier gestionnaire » est **couvert par (3)** — la seule route vers zéro gestionnaire passe par l'auto-désactivation, déjà interdite : pas de code spéculatif ajouté.
- **Structure** : controller fin + Form Requests + Policy (auto-discovery), mutations en transaction. Accès gardé par le middleware `can:utilisateurs.gerer` sur les routes.
- **Alignement au design (addendum 2026-07-28, après-midi)** : la maquette Claude Design *« Administration e-CDTS »* — reçue après le premier jet — couvre finalement tout l'espace admin. L'écran Utilisateurs a été aligné **pixel-près** : module à **trois onglets** (Internes CGC / Consignataires / Agents), barre de **filtres** (recherche + rôle + statut, côté client), tableau à colonnes *Utilisateur · Rôles cumulés · Statut (pastille) · Dernière connexion · Actions (icônes)*, badge « Vous », et **panneau latéral coulissant** pour créer/éditer (remplace la modale centrée). Ajout d'une colonne **`last_login_at`** (nullable, horodatée dans `Fortify::authenticateUsing` à la connexion réussie ; affiche « Jamais » sinon). Les champs métier restent **inchangés** (téléphone + poste conservés, mot de passe saisi par l'admin) : le design proposait une « Direction de rattachement » et une création sans mot de passe, **écartées** par arbitrage du porteur.
**Alternatives écartées :** *soft-delete Laravel* — écarté au profit d'un état métier `is_active` explicite et réversible ; *suppression physique* — écartée (casse la traçabilité des actions passées) ; *garder `name` seul* — écarté (identité d'un agent institutionnel = prénom/nom/poste structurés) ; *garde-fou « dernier gestionnaire » explicite* — non implémenté car redondant avec l'interdiction d'auto-désactivation ; *« Direction de rattachement » (enum) à la place de téléphone/poste* et *création sans mot de passe (lien d'activation)* proposées par le design — **écartées** par le porteur au profit du modèle existant.
**Conséquences :** les onglets **Consignataires** (liste + détail + affectation d'armements) et **Agents** sont montés en **front-only** (composants `components/admin/users/{consignataires,agents}-tab.tsx` + `fake-data.ts`, données factices clairement marquées « à câbler ») : la coquille visuelle existe, le **backend de ces deux écrans reste à faire à leur phase** (modèles consignataire/armement N-N, workflow de validation des agents — non figés). La composition des rôles listée est un point de départ éditable, jamais figé (ADR-0012/0015). Le blocage `is_active` à la connexion vaut pour **tous** les comptes (internes comme, à terme, consignataires).

## ADR-0019 — Retrait des passkeys et de la double authentification (2FA) : accès par identifiant + mot de passe — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28) — **met à jour le dernier point d'ADR-0018**.
**Contexte :** le starter kit Fortify active les **passkeys** (WebAuthn / biométrie) et la **2FA** (code TOTP + codes de secours). Le porteur a demandé de retirer « tout ce qui est authentification par clé » ; périmètre confirmé par question directe : **passkeys ET 2FA**. L'accès de la plateforme repose désormais sur **identifiant + mot de passe** (réinitialisation et vérification d'e-mail conservées).
**Décision :**
- `config/fortify.php` : `Features::twoFactorAuthentication()` et `Features::passkeys()` retirés (+ limiters `two-factor` / `passkeys` + bloc de config `passkeys`). Restent `resetPasswords()` et `emailVerification()`.
- `User` : traits `PasskeyAuthenticatable` / `TwoFactorAuthenticatable` et interface `PasskeyUser` retirés ; colonnes `two_factor_*` supprimées (migration Fortify retirée) ; table `passkeys` supprimée (migration retirée).
- Front : composants passkeys (`passkey-*`, `manage-passkeys`) et 2FA (`manage-two-factor`, `two-factor-*`, hook `use-two-factor-auth`), page `auth/two-factor-challenge` et bouton `PasskeyVerify` (connexion + confirmation de mot de passe) supprimés ; écran de réglages **Sécurité** réduit au **changement de mot de passe**.
- Provider / routes : `twoFactorChallengeView`, `registerView` (mort depuis ADR-0018) et route `.well-known/passkey-endpoints` retirés.
- Tests et `UserFactory` nettoyés en conséquence (les tests d'inscription restent, ils s'auto-ignorent tant que `registration` est fermée).
**Alternatives écartées :** *garder la 2FA (TOTP) comme sécurité optionnelle* — proposé (pertinent pour une plateforme institutionnelle) mais écarté sur demande explicite du porteur. *Masquer en UI sans retirer* — écarté : laisserait routes, tables et surface d'attaque ouvertes (incohérent avec ADR-0012 / 0018).
**Conséquences :**
- Authentification à **un seul facteur** (mot de passe). Un renforcement ultérieur = réintroduire la feature Fortify correspondante (réversible, sans dette).
- **Effet de bord corrigé au passage** : bug de cache spatie **préexistant** dans `RolesAndPermissionsSeeder` (les 12 permissions étaient créées mais introuvables au `syncPermissions`, car le `PermissionRegistrar` gardait en mémoire la collection d'avant création). Ajout d'un `forgetCachedPermissions()` entre création et affectation → `migrate:fresh --seed` repasse au vert.

## ADR-0018 — Écran de connexion unique sur mesure + inscription publique fermée — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28) — **applique ADR-0012** (comptes créés par un administrateur).
**Contexte :** le starter kit Laravel/Fortify livre une connexion générique et une **inscription publique** (`Features::registration()`). Or e-CDTS est une plateforme étatique à accès restreint : les comptes (agents CGC comme consignataires) sont créés par un administrateur, jamais en libre-service. Une maquette de connexion sur mesure (charte CGC, écran scindé institutionnel) a été fournie ; elle contenait des **boutons « accès de démonstration »** qui étaient un artefact de génération d'image, pas une fonctionnalité.
**Décision :**
- **Un seul écran de connexion**, reconstruit fidèlement à la maquette (`resources/js/pages/auth/login.tsx`) : panneau gauche navy (argumentaire + logo CGC + mention « République Gabonaise »), panneau droit sobre (formulaire). Il porte son **propre chrome plein écran** → `app.tsx` renvoie `null` comme layout pour `auth/login` (les autres pages d'auth gardent la carte centrée `AuthLayout`).
- **Pas de portes séparées** consignataire / agent CGC : la même fenêtre authentifie tout le monde ; la **redirection différenciée par type de compte se fera après login** (côté tableau de bord / `LoginResponse`), quand ces écrans existeront — pas inventée maintenant.
- **Boutons de démonstration supprimés** (artefact de maquette).
- **Inscription publique fermée** : `Features::registration()` retiré de `config/fortify.php` (route `register` supprimée, page `auth/register.tsx` supprimée, références front nettoyées). Le lien public « Voir la situation portuaire » (consultation sans connexion, ADR-0009/statuts) reste présent en **placeholder** tant que l'écran n'existe pas.
**Alternatives écartées :** *garder l'inscription Fortify et la masquer en UI* — écarté : la route resterait ouverte (surface d'attaque, incohérent avec ADR-0012). *Deux écrans de login distincts* — écarté : demande explicite du porteur, un seul point d'entrée.
**Conséquences :**
- La création de comptes passera **entièrement** par le futur module Utilisateurs (Phase 2) ; aucun autre chemin d'enrôlement.
- Reste à brancher, plus tard : la **redirection post-login selon le type de compte** et l'écran public **situation portuaire** (les deux liens/cibles sont aujourd'hui des placeholders assumés).
- Réinitialisation de mot de passe **inchangée** (feature Fortify conservée). *(Point mis à jour : passkeys et 2FA finalement retirés — voir **ADR-0019**.)*

## ADR-0017 — Stratégie tableaux : rendu natif pour le référentiel, TanStack Table + pagination serveur pour les écrans à fort volume — 2026-07-28
**Statut :** Acceptée (arbitrage du porteur, 2026-07-28). **Amendée par ADR-0021** sur un seul point : le référentiel reçoit une pagination *client*. Le reste — rendu natif, pas de librairie, TanStack Table réservé aux écrans à fort volume — tient toujours.
**Contexte :** l'app comporte beaucoup de tableaux, de tailles très inégales : référentiels de quelques lignes (Ports, Types) d'un côté, et des écrans potentiellement volumineux de l'autre (lignes de cargaison d'un manifeste ASYCUDA — centaines à milliers de lignes —, journal d'audit, dossiers d'escale). Question posée : faut-il une librairie de tableaux dès maintenant ?
**Précision de vocabulaire :** *TanStack **Start*** (méta-framework full-stack React) est **hors sujet et incompatible** — il occuperait la même case que Laravel + Inertia (routeur + pont serveur→React). La décision porte sur *TanStack **Table*** (ex-React Table), lib **headless** qui gère la logique d'un tableau (tri, filtre, pagination, sélection, virtualisation via TanStack Virtual) et laisse 100 % du rendu au développeur — donc **compatible avec les styles inline de la maquette**.
**Décision :**
- **Référentiels et petits tableaux** → **rendu natif** (`<table>` + état React local). Pas de librairie : ce serait de la sur-ingénierie (principe 5 du harnais).
- **Écrans à fort volume** (Manifeste en priorité, puis Journal d'audit, Dossiers) → **TanStack Table en mode « manual »**, adossé à une **pagination / tri / filtre côté serveur** (idiome Laravel/Inertia : on requête la DB, on renvoie *une* page ; la lib ne fait que le rendu + l'UI d'en-tête). **Virtualisation** ajoutée si les lignes se comptent en milliers.
- **Déclencheur :** on introduit TanStack Table **au moment où le premier écran volumineux est développé** (probablement le Manifeste), **pas par anticipation**.
**Alternatives écartées :** *TanStack Start* — incompatible avec la stack (voir ci-dessus). *Adopter TanStack Table partout tout de suite* — écarté (principe 5 : aucune abstraction pour un cas qui n'existe pas encore ; alourdit le référentiel sans bénéfice). *Tout gérer côté client sur les gros écrans* — écarté : ne passe pas à l'échelle sur un manifeste de milliers de lignes ; la pagination serveur reste la base.
**Conséquences :**
- ~~Le tableau natif du référentiel (`referentiels.tsx`) reste tel quel.~~ → **amendé par ADR-0021** : rendu toujours natif, mais avec pagination client et socle de composants partagé.
- Le jour du Manifeste : trancher d'abord **client vs serveur** (réponse par défaut : **serveur**), puis brancher TanStack Table en mode manual par-dessus.
- Continuité de stack : le **Data Table de shadcn/ui est bâti sur TanStack Table** — l'adoption se fera dans la ligne de l'existant, pas comme une pièce exotique.

## ADR-0016 — Intégration de la maquette Claude Design : pages Inertia fidèles, données factices — 2026-07-27
**Statut :** Acceptée (arbitrage du porteur, 2026-07-27).
**Contexte :** la maquette du produit est conçue dans Claude Design (7 écrans, format `.dc.html` avec un runtime `support.js` propriétaire). Elle porte le **visuel de référence** attendu, mais sa logique et ses données peuvent être **fausses ou incomplètes**. Il fallait décider comment la faire entrer dans l'app Laravel/Inertia sans importer un format inexploitable ni bloquer sur du back-end pas encore spécifié.
**Décision :**
- **Reconstruire chaque écran en vraies pages React/TSX Inertia**, pas d'import du `.dc.html` ni de son runtime. Le visuel est la référence ; on le reproduit fidèlement (styles inline de la maquette conservés, `:hover` porté par des classes CSS scopées `.ea-*` faute d'inline-hover en React).
- **Architecture admin = coquille partagée + une route par module** : `AdminShell` (bandeau institutionnel + rail 4 modules + en-tête + onglets) dans `resources/js/components/admin/`, et `/admin/{referentiels,utilisateurs,bareme,audit}` (préfixe `admin.`, middleware `auth`+`verified`). Les écrans admin portent leur **propre chrome plein écran** → `app.tsx` renvoie `null` comme layout pour `admin/*` (comme `welcome`).
- **Données factices assumées** pour l'instant (les jeux de données de la maquette n'étant pas fiables) : les référentiels tournent sur un état React local cohérent avec les docs (armements, ports GAOWE/GAPOG, types, ligne régulière/tramping). **Le câblage back-end (routes de données, requêtes Inertia, validation, policies) viendra ensuite, écran par écran.**
- **Pilote livré :** module **Référentiels** complet (Navires, Armements + détail N-N, Ports, Types) avec recherche, tiroir de saisie, modale de confirmation et toast. Les 3 autres modules sont des **placeholders « Prochaine livraison »**.
**Alternatives écartées :** *importer le `.dc.html` + `support.js`* — écarté : format propriétaire, non intégrable à Vite/Inertia, dette immédiate. *Une seule page admin à onglets géants* — écarté au profit d'une route par module (URL partageable, code découpé, cohérent RBAC). *Câbler le back-end tout de suite* — écarté : la spec data de plusieurs modules n'est pas figée ; on avance par le visuel d'abord (demande explicite du porteur).
**Conséquences :**
- Dette assumée et **temporaire** : chaque écran admin devra recevoir sa couche de données réelle (le composant est prêt à recevoir des `props` Inertia à la place de l'état local).
- Police **Public Sans** ajoutée (Google Fonts) pour fidélité à la maquette ; CSS scopé `.ecdts-admin` sans impact sur le thème shadcn du reste de l'app.
- Le même moule (`AdminShell` / cartes / tables) sert à décliner les **6 autres écrans** de la maquette (consignataire, situation portuaire, dossiers d'escale, manifeste, devis & facturation).
- Rappel garde-fou (ADR-0010) : ces écrans admin restent de la **donnée** ; les règles de calcul/classification demeurent dans le code.

## ADR-0015 — Catalogue par défaut des 5 profils internes CGC — 2026-07-27
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-27) — **précise ADR-0012** (referme le point « catalogue de rôles par défaut à cadrer ») et **s'appuie sur ADR-0013** (validation des comptes clients).
**Contexte :** ADR-0012 a rendu la composition des rôles éditable depuis l'admin, mais a laissé ouvert le **catalogue de rôles par défaut**. Avant de figer le référentiel (`ENTITES.md`) et de concevoir le module 1, le porteur arrête les **5 profils internes CGC** et leur composition d'attributions de départ.
**Décision :** cinq profils, composés d'**attributions ajustables et cumulables** (cohérent ADR-0012) :
- **Conférencier** — renseigne la situation portuaire.
- **Agent dépouilleur** — dépouillement / réconciliation avec le consignataire + **téléverse la facture**.
- **Superviseur** — **chef hiérarchique** du conférencier et du dépouilleur ; **cumule** leurs droits ; **valide** leurs travaux (situation portuaire + PV) ; **clôture un dossier** ; **modifie le mode d'exploitation** d'une escale ; gère les **référentiels** ; gère les **utilisateurs de son équipe** ; accède aux **statistiques**.
- **Administrateur** — profil **fonctionnel (non nominatif)**, porté par le Directeur d'Exploitation **ou** un agent informatique ; **peut tout faire** côté CGC ; **crée/valide les comptes clients** ; **seul à modifier le barème** ; **clôture un dossier** ; mode d'exploitation escale.
- **Consultant** — **consultation seule** des statistiques (DAC et autres directions).

Attributions sensibles : **clôturer un dossier** et **modifier le mode d'exploitation d'une escale** = Superviseur **ou** Administrateur ; **barème** = Administrateur seul ; **validation des comptes clients** = Administrateur (ADR-0013). **Séparation des tâches : régime souple** — un même profil peut *traiter* **et** *valider* (continuité en cas d'absence) — **avec traçabilité complète** (journal d'audit).
**Alternatives écartées :** *séparation des tâches stricte d'emblée* (interdire à une personne de valider son propre travail) — écartée pour l'instant (effectifs réduits, besoin de continuité), **réouvrable par la DEX**. *Administrateur comme rôle isolé/nominatif* — écarté : profil fonctionnel cumulable (cohérent ADR-0010/0012). *Figer ces profils* — écarté : ce sont des **valeurs de départ éditables**, pas un gel (ADR-0012).
**Conséquences :**
- Le **seed** pose ces 5 profils comme valeurs par défaut, recomposables depuis l'admin (ADR-0012).
- Deux attributions à inscrire au **catalogue de permissions** (code) : « clôturer un dossier » et « modifier le mode d'exploitation d'une escale ».
- Le **validateur** du PV définitif et de la situation portuaire (ADR-0013) se rattache naturellement au **Superviseur / Administrateur**.
- **Point ouvert :** le **contenu des statistiques** (indicateurs — ex. nombre de véhicules, volumes de riz) reste à cadrer.
- Doc de référence : `ENTITES.md` §3 (matrice d'attributions) ; module 1 de `ADMIN.md`.

## ADR-0014 — Référentiel des entités métier : armement = armateur (identité société complète), pièces justificatives différées — 2026-07-27
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-27)
**Contexte :** avant de concevoir les écrans de saisie et le modèle de données, il fallait **geler les entités de référence** (armement, navire, consignataire, agent consignataire) et lever une **ambiguïté métier** : armement vs armateur. Le glossaire disait initialement « on manipule des armements, pas des armateurs individuels » — à confirmer ou faire évoluer.
**Décision :**
- **Armement et armateur ne font qu'un.** e-CDTS ne manipule **pas** d'armateur distinct ; la fiche **armement** porte l'**identité société complète** : nom, sigle, pays d'origine, **pays d'immatriculation, gérant, RCCM/NIF (ou équivalent), adresse**.
- **Navire** : nom, **numéro OMI**, **pavillon** (pays d'immatriculation), type (porte-conteneurs, vraquier, RoRo, conventionnel, pétrolier…), **armement de rattachement**, **mode d'exploitation par défaut** (modèle à deux niveaux : défaut navire → valeur effective par escale, cf. `ENTITES.md` §2 et `BAREME-CDTS.md`).
- **Consignataire** — *société* : raison sociale, sigle, **numéro d'identification (RCCM/NIF)**, pays d'immatriculation, adresse, tél/email, **port(s) de rattachement** (Owendo, Port-Gentil ou les deux), armements représentés ; *titulaire* : nom, prénom, fonction, email pro, tél.
- **Agent consignataire** : nom, prénom, fonction, email pro, tél, société de rattachement ; opère uniquement sur ses armements affectés ; compte **validé par le CGC avant activation** (ADR-0013).
- **Emboîtement & facturation** : un armement possède des navires ; il est représenté au port par un consignataire (société) ; les déclarations sont déposées par le consignataire **ou** ses agents, mais **toujours facturées à la société consignataire**.
- **Situation portuaire** : 6 statuts fermés — `en attente` → `en rade` → `à quai` → `hors zone` → `en zone d'exploitation` → `sorti` ; **consultable en lecture seule sans connexion** (lien depuis l'accueil / la page de connexion).
- **Pièces justificatives d'identité : différées.** Non construites maintenant, mais la structure des fiches entreprise (consignataire **et** armement) doit être pensée pour les accueillir plus tard via un **mécanisme mutualisé** entre entités, sans refonte.
**Alternatives écartées :** *armateur comme entité séparée réutilisable* (1 armateur → N armements) — écarté : le porteur ne distingue pas les deux à l'exploitation (simplicité). *Armement allégé* (nom/sigle/pays d'origine seulement) — écarté **explicitement** par le porteur : il veut l'identité société complète aussi sur l'armement. *Champs de pièces jointes figés fiche par fiche* — écarté au profit d'un mécanisme mutualisé, mais **non implémenté** (pas de besoin immédiat — anti-spéculatif).
**Conséquences :**
- **Armement et consignataire partagent une colonne vertébrale « identité société »** (RCCM/NIF, pays, adresse) — factorisable dans le modèle.
- Doc de référence : `docs/ENTITES.md` ; `GLOSSARY.md` (lignes *Armement*/*Armateur* et *Situation portuaire*) et `ADMIN.md` (module 2) synchronisés.
- Prévoir dès la conception un **point d'ancrage pour des pièces jointes polymorphes** (sans le développer).
- Les 6 statuts de situation portuaire doivent correspondre à un **enum** (cf. `ARCHITECTURE.md`/`GLOSSARY.md`).

## ADR-0013 — Circuits de validation : compte agents délégué au consignataire, validation hiérarchique du PV et de la situation portuaire — 2026-07-12
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-12) — **complète ADR-0007 et ADR-0009 ; confirme la réponse Q16**
**Contexte :** en recensant les circuits de validation d'e-CDTS, le porteur a tranché trois ajustements métier et posé une exigence de traçabilité côté dossier. Rappel du paysage : une seule vraie navette contradictoire (WF5/PV), des validations simples ailleurs, et un verrou calculé (ADR-0009).
**Décision :**
1. **Comptes agents consignataires — validation CGC maintenue (non-répudiation).** Le consignataire (compte maître) **crée** ses agents dans l'application, mais **le CGC valide** chaque compte avant activation. Motif décisif : le CGC n'exerce **pas de supervision continue** ; faire passer chaque compte par un **circuit de validation laisse une trace formelle opposable** — en cas de litige, le consignataire ne peut pas prétendre qu'un compte « est apparu seul ». La simplicité (délégation totale) est écartée au profit de la traçabilité, prioritaire pour une plateforme d'État. **Confirme la réponse Q16.**
2. **PV définitif — un palier de validation hiérarchique unique.** Après accord dans la navette **consignataire ⇄ agent traitant CGC**, le PV n'est **pas** encore définitif : une validation de **niveau supérieur** le scelle → PV de réconciliation définitif. C'est **un seul palier** (pas de cascade Chef → Directeur). Ce palier est matérialisé par une **permission dédiée** (nom à caler avec le catalogue de rôles, ADR-0012), **détenue par un ou plusieurs profils** au choix du CGC (chef de service, directeur, ou administrateur — qui cumule tout). Le « qui » reste ouvert ; le « un palier » est acté.
3. **Situation portuaire — validation avant publication.** L'agent (DEX) **saisit** la situation portuaire ; un **supérieur la vérifie et la valide** avant publication, pour éviter tout malentendu. Cette validation conditionne **à la fois** la publication/diffusion externe (OPRAG, etc.) **et le verrou de transmission** (ADR-0009) : le verrou s'ouvre désormais sur une situation portuaire **validée**, plus seulement saisie. Comme pour le PV, le validateur est défini par une **permission** (profil à caler).
4. **Fil d'Ariane du dossier (exigence de traçabilité).** En plus du journal d'audit transversal (module 4 admin), **chaque dossier expose son parcours** (ouverture → manifeste → dépouillement → PV → validation → devis → clôture) traçant **qui a fait quoi et quand**, y compris les interventions de l'**administrateur** sur le dossier (déblocage, correction). Vue centrée sur le dossier, distincte de l'audit global.
**Alternatives écartées :** *déléguer entièrement la création des comptes agents au consignataire, sans validation CGC* — écartée : sans supervision continue, l'absence de circuit de validation ouvre un angle de **répudiation** en cas de litige (le consignataire pourrait nier avoir créé un compte) ; la validation CGC fournit la trace opposable. *Cascade de validation Chef puis Directeur du PV* — rejetée : un seul palier suffit, la pluralité se gère par la permission (plusieurs profils peuvent la porter). *Verrou de transmission sur situation seulement saisie* (ADR-0009 initial) — durci : la validation du supérieur devient un préalable. *Nommer en dur le rôle validateur* — rejeté (cohérent ADR-0012) : c'est une permission, attribuable à des rôles encore à définir.
**Conséquences :**
- Le PV porte deux états distincts : **« accord de navette »** (consignataire et agent d'accord) puis **« définitif »** (scellé par la validation hiérarchique). Le devis automatique (ADR-0006) se rattache à l'état **définitif**.
- La situation portuaire porte un **état de validation** (« saisie/brouillon » → « validée/publiée ») ; le calcul du verrou (ADR-0009) lit cet état validé, pas la simple saisie.
- **Deux permissions de validation** à prévoir au catalogue (PV définitif ; situation portuaire), attribuables à des rôles non encore nommés (ADR-0012).
- **WF1** conserve son étape de validation CGC des comptes agents (trace opposable) ; **WF2/WF3** gagnent une étape de validation avant publication ; **WF5** gagne un palier de validation final.
- Le dossier expose un composant **« fil d'Ariane / parcours »** alimenté par la même traçabilité que l'audit, mais présenté sur le dossier.

## ADR-0012 — Autorisation : permissions fixées par le code, rôles recomposables depuis l'admin — 2026-07-12
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-12) — **remplace ADR-0011**
**Contexte :** l'ADR-0011 figeait les rôles au seed (admin en lecture seule) pour se prémunir d'une mauvaise manip. Retour de terrain du porteur : les administrations arrivent avec une vision figée de leurs rôles, puis **découvrent en exploitation** que tel rôle doit gagner (ou perdre) des attributions non prévues au départ. Un modèle verrouillé transforme chaque ajustement organisationnel en demande de déploiement — friction inacceptable sur la durée. Clé de résolution : distinguer **deux leviers** que l'ADR-0011 avait bloqués ensemble à tort — le **catalogue de permissions** (vocabulaire d'actions) et la **composition des rôles** (regroupement de permissions).
**Décision :**
- **Le catalogue de permissions reste défini par le code** (inchangé vs ADR-0010/0011). Une permission n'existe que si un crochet d'autorisation la contrôle, testé et versionné. On ne crée pas de permission depuis l'UI — elle ne garderait rien.
- **La composition des rôles devient éditable depuis l'admin.** L'admin CGC peut, **en pleine exploitation** et sans déploiement : ajouter/retirer une permission à un rôle, **créer** un nouveau rôle, le garnir de permissions **existantes**. L'écran « Rôles & permissions » (module 1) passe de lecture seule à **matrice cochable**.
- **Les rôles seedés deviennent des valeurs par défaut** (point de départ raisonnable), non un gel définitif.
- **Sécurité préservée :** même avec cette liberté, l'admin ne peut jamais accorder une capacité que le code ne contrôle pas — il **recombine un vocabulaire déjà entièrement testé**. Le risque « liquidation fausse » qui justifiait le verrouillage ADR-0011 ne s'applique pas à la simple recomposition.
- **Garde-fous contre l'auto-blocage :** un **rôle super-admin protégé** (non modifiable, non supprimable) ; interdiction pour un admin de **retirer sa propre** capacité d'administration ; **tout changement de rôle/permission tracé au journal d'audit** (module 4).
- **Permissions effectives d'un compte = union des permissions de ses rôles**, calculée automatiquement (inchangé). On assigne des rôles à un compte, jamais des permissions à la pièce.
- **Portée agent ↔ armements (ADR-0009) : toujours orthogonale** — filtre de données au niveau ligne, jamais une permission.
- **Catalogue de rôles par défaut encore à cadrer** : la liste initiale (Agent DEX, Chef Régulation, Contrôleur, Recouvrement, lecture seule…) et sa composition restent un **chantier dédié** ; rien n'est inventé d'ici là. Nuance vs ADR-0011 : ce catalogue n'est plus qu'un point de départ éditable, plus une contrainte figée.
**Alternatives écartées :** *rôles figés au seed (ADR-0011)* — remplacé : trop rigide, transforme tout ajustement organisationnel en déploiement, à rebours du besoin réel constaté sur le terrain. *RBAC totalement dynamique incluant la création de permissions depuis l'UI* — rejeté : une permission sans crochet de code ne contrôle rien (fausse sécurité) ; le vocabulaire d'actions reste la responsabilité du code. *Attribution de permissions directement au compte* — rejeté (inchangé vs ADR-0011) : perd la lisibilité « une fonction = un rôle » et l'auditabilité.
**Conséquences :** `spatie/laravel-permission` convient tel quel (il porte `users ↔ roles ↔ permissions` avec rôles et permissions en base, recomposables). Le seed pose des rôles par défaut mais ne les gèle plus. L'écran « Rôles & permissions » est une **matrice éditable** (création de rôle + cases à cocher), avec le rôle super-admin verrouillé et le garde-fou anti-auto-blocage. Ajouter une **nouvelle capacité** (permission jamais branchée) reste un travail de code — limite assumée, inhérente à toute sécurité réelle ; en revanche **recomposer** les rôles est libre. Le module 4 (audit) doit couvrir les mutations de rôles/permissions.

## ADR-0011 — Autorisation : RBAC cadré, rôles figés au seed (l'admin assigne, ne compose pas) — 2026-07-12
**Statut :** **Remplacée par ADR-0012** (2026-07-12)
**Contexte :** ADR-0002 et ADR-0010 posent un modèle de permissions **many-to-many** (rôles cumulables sur un même compte), mais laissaient ouvert *qui* définit le contenu des rôles. Deux mécanismes se cachaient derrière « rôles cumulables » : les **permissions** (le vocabulaire d'actions du système, chacune branchée à un garde dans le code) et les **rôles** (des paquets nommés de permissions). Restait à trancher la **liberté de l'admin CGC** : peut-il créer/recomposer des rôles depuis l'UI, ou seulement assigner des rôles pré-définis ?
**Décision :**
- **Les permissions sont un catalogue défini par le code.** Une permission n'existe que si un développeur a posé le crochet d'autorisation correspondant. Elle n'est ni créée ni inventée depuis l'admin.
- **Les rôles sont figés au seed** (définis dans le code, garnis de leurs permissions au démarrage). L'admin CGC **assigne** un ou plusieurs rôles à un compte — il **ne crée pas**, ne renomme pas, ne recompose pas les permissions d'un rôle depuis l'UI.
- **Permissions effectives d'un compte = union des permissions de ses rôles**, calculée automatiquement. On n'attribue jamais une permission directement au niveau du compte : on assigne des rôles.
- **Écran « Rôles & permissions » (module 1) = lecture seule** : il *montre* quel rôle porte quelles permissions ; ce n'est pas une matrice éditable.
- **Le catalogue de rôles reste à cadrer.** Les rôles esquissés dans la doc (Agent DEX, Chef Régulation, Contrôleur, Recouvrement, Administrateur, lecture seule…) sont encore **flous** — leur liste définitive et leur composition en permissions feront l'objet d'un cadrage dédié. Rien n'est inventé d'ici là.
**Alternatives écartées :** *RBAC dynamique (rôles créés/recomposés depuis l'admin, matrice cochable)* — rejeté pour une plateforme d'État : fonctions organisationnelles stables, et une mauvaise manip de permissions par un admin (se verrouiller, ouvrir un accès à tort) serait grave et difficile à auditer. Réouvrable plus tard si un besoin réel émerge. *Attribution de permissions directement au compte (sans passer par des rôles)* — rejeté : perd la lisibilité « une fonction = un rôle » et complique l'audit.
**Conséquences :** le seed porte le catalogue de rôles et leurs permissions (source de vérité versionnée par le code) ; l'admin ne dispose que d'une action « assigner/retirer un rôle » sur un compte. L'ajout ou la modification d'un rôle passe par un changement de code + migration/seed, pas par l'UI. `spatie/laravel-permission` convient (il porte `users ↔ roles ↔ permissions`) ; on gèle la création de rôles côté UI. La **portée** agent ↔ armements (ADR-0009, affectation N-N) reste **orthogonale** aux rôles : c'est un filtre de données au niveau ligne, jamais une permission. Le cadrage du catalogue de rôles est un chantier ouvert, préalable à la conception fine du module 1.

## ADR-0010 — Périmètre de l'espace d'administration : données de référence, comptes et audit — jamais les règles métier — 2026-07-10
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-10)
**Contexte :** en cadrant l'espace administrateur d'e-CDTS, une confusion menaçait : traiter le barème, la classification et les règles de calcul comme des objets « configurables » dans un panneau admin. Il fallait tracer nettement la frontière entre ce que l'administrateur **saisit** (des données) et ce que le **code** exécute (des règles).
**Décision :**
- **Les règles métier vivent dans le code, jamais dans l'admin.** Moteur de liquidation (unité payante à l'avantage du CGC, sec/frigo, ligne régulière/tramping), règles de classification, règles de catégorisation manifeste → nomenclature : tout cela est implémenté en **service / action Laravel**, testé et versionné par le code — pas exposé comme réglage d'un panneau.
- **Le barème est une donnée, pas une règle.** L'admin édite la **grille** `nomenclature CGC ↔ prix ↔ unité` (les valeurs, versionnées cf. ADR-0006). Le moteur codé **lit** cette grille ; il ne se configure pas depuis l'admin.
- **Le panneau d'administration se limite à 4 modules :** (1) **Utilisateurs & habilitations** — création des comptes internes CGC, création des consignataires (comptes maîtres) et validation de leurs agents, gestion des **rôles et permissions** ; (2) **Référentiels** (master data, CGC seul en écriture) — navires (avec type + attribut ligne régulière/tramping), armements, ports, types de navire ; (3) **Barème** — saisie de la grille tarifaire par nomenclature ; (4) **Journal d'audit** — connexions (qui, quand) et trace des actions majeures (ouverture / suppression / validation de dossier, assimilés).
- **L'administrateur n'est pas un rôle isolé.** « Administration » est un **jeu de permissions cumulable** avec l'exploitation : un agent CGC porteur du back-office **opère aussi** les workflows métier (situation portuaire, dépouillement, etc.). D'où un modèle de permissions **many-to-many**, jamais un enum de rôle unique (cohérent avec ADR-0002).
**Alternatives écartées :** *rendre les règles de calcul/classification paramétrables en admin* — rejeté : ce sont des règles réglementaires complexes, testables, qui appartiennent au code ; les exposer comme réglages ouvrirait la porte à des liquidations fausses et non testées. *Panneau admin englobant la supervision transactionnelle (dossiers, manifestes, devis)* — rejeté : le transactionnel est piloté par les workflows, pas « administré » ; l'admin n'y intervient que pour l'audit/déblocage, via ses permissions d'exploitation. *Rôle « admin » unique et exclusif* — rejeté : les rôles CGC sont cumulables.
**Conséquences :** le modèle d'autorisation est un jeu de permissions attribuables (many-to-many), pas un champ `role` scalaire. Le barème est une entité éditable versionnée ; le moteur de calcul qui la consomme est du code testé (cas de référence). L'espace admin se conçoit autour de 4 modules seulement — voir `docs/ADMIN.md`. Toute nouvelle règle métier passe par le code, jamais par un écran de configuration.

## ADR-0009 — Liaison dossier d'escale ↔ situation portuaire : référence sur clé `navire + voyage`, verrou calculé — 2026-07-10
**Statut :** Acceptée (grilling avec le développeur porteur, 2026-07-10) — **complétée par ADR-0013** : le verrou s'ouvre sur une situation portuaire **validée** par un supérieur, pas seulement saisie.
**Contexte :** le verrou de transmission d'un dossier d'escale dépend de la situation portuaire (import → navire « à quai » + date d'accostage ; export → navire « sorti » + date de départ, cf. WF2/WF3). Restait à définir **techniquement** comment un dossier retrouve « son » navire pour lire ces dates. Contraintes réelles du CGC : le **navire** est un référentiel partagé ; le **n° de voyage** n'est **connu que du consignataire** (le CGC l'apprend, ne l'a pas en base au préalable) ; un dossier peut s'ouvrir **avant** que le navire n'apparaisse à la situation portuaire (cas B, le plus englobant).
**Décision :**
- **Clé de liaison = `navire + voyage`.** Un voyage = un seul port (pas de port dans la clé). Navire sélectionné dans le référentiel (identique par construction des deux côtés) ; voyage détenu par le consignataire.
- **La date vit à un seul endroit** (la ligne de situation portuaire) ; le dossier la **lit par référence**, ne la copie jamais → source de vérité unique, auditable.
- **Verrou calculé, jamais stocké** : `import ⇒ statut « à quai » ET date d'accostage renseignée` ; `export ⇒ statut « sorti » ET date de départ renseignée`. La mise à jour de la situation portuaire par le DEX ouvre le verrou automatiquement, sans action côté dossier.
- **Principe « saisi une fois, sélectionné ensuite »** : le voyage n'est saisi qu'une fois par celui qui enregistre en premier ; le second le **sélectionne** via le navire (aimant), ne le retape jamais.
- **Rapprochement automatique** sur clé **normalisée = MAJUSCULES + suppression des espaces** (tirets et caractères spéciaux **conservés**, potentiellement significatifs — on préfère un rapprochement manuel à une fusion abusive).
- **Filet manuel** : si les chaînes normalisées diffèrent, rapprochement en 1 clic depuis l'écran « en attente de rapprochement », **par le consignataire uniquement** (c'est lui qui ouvre le dossier et détient le voyage).
**Cas limites tranchés :**
- *Navire qui ne vient jamais / re-routé* → dossier orphelin. Seuil en **OU** : tant qu'**aucun** manifeste injecté **et** jamais soumis au CGC → **suppression pure** par le consignataire/ses agents ; dès qu'**une** condition est franchie (manifeste injecté **ou** soumis) → plus de suppression, seulement **« Annulé »** (motif + date, identifiant interne conservé, cf. ADR-0008).
- *Voyage corrigé après coup* → librement éditable au stade brouillon, **figé au rapprochement** ; toute erreur post-rapprochement se règle en **refaisant un dossier**, jamais en éditant la clé.
- *Course (saisies quasi-simultanées)* → la normalisation absorbe les écarts de forme ; le résidu tombe dans le filet manuel.
**Alternatives écartées :** *copier la date dans le dossier* — rejeté : deux vérités à réconcilier, incohérences et rupture d'audit. *Double saisie libre du voyage des deux côtés* — rejeté : source de dossiers orphelins silencieux ; remplacé par « saisi une fois, sélectionné ensuite ». *Édition à chaud de la clé après rapprochement* — rejeté : sur-ingénierie et porte ouverte aux incohérences. *Expiration/relance automatique des orphelins* — hors périmètre phase 1 (pas de besoin prouvé).
**Conséquences :** le dossier porte une **référence** vers la ligne de situation portuaire (posée à l'ouverture si le navire existe déjà, sinon rapprochée ensuite) et un état `en attente de rapprochement`. Le verrou de transmission est un **calcul** dérivé de la ligne liée, pas un champ. Un écran **« dossiers en attente de rapprochement »** est nécessaire (filet de sécurité côté consignataire). La normalisation du voyage doit être centralisée (une seule fonction) pour être cohérente à l'écriture et à la comparaison. Import + export d'un même passage = **2 dossiers pointant vers la même ligne** de situation portuaire, chacun lisant sa propre date.

## ADR-0008 — Numérotation du dossier d'escale : libellé provisoire → n° de manifeste, sur identifiant interne stable — 2026-07-09
**Statut :** Acceptée (arbitrage du développeur porteur, 2026-07-09)
**Contexte :** un dossier d'escale s'ouvre **souvent avant l'arrivée du navire**, donc avant que le manifeste n'existe. Il faut pourtant un numéro dès l'ouverture. Par ailleurs les utilisateurs raisonnent naturellement en **numéro de manifeste** (c'est ce qu'ils manipulent au quotidien), pas en référence de dossier arbitraire.
**Décision :** le dossier porte **deux notions distinctes** :
- un **identifiant interne stable** (technique, non réutilisé, jamais modifié après création) : c'est lui que le système écrit partout (URL, PV, devis, journal d'audit, liens inter-dossiers). Il **assure la traçabilité** et n'est pas mis en avant dans l'UI de travail (consultable en « référence interne » dans l'historique/le pied du dossier si besoin d'audit).
- un **libellé métier affiché** (le « numéro de dossier » visible) : **provisoire** à l'ouverture, il devient le **n° de manifeste** une fois le manifeste rattaché. Source du n° : **extrait du XML AWMDS** à l'import ; **saisi par le consignataire** en mode manuel (recopié de son manifeste papier). Le libellé se **fige au premier import/rattachement validé** et ne bouge plus (les manifestes additifs/rectificatifs portent le même numéro — cf. WF4).
**Alternatives écartées :** *renommage réel du dossier* (le n° de dossier **est** l'identifiant qui change à l'import) — rejeté : tout ce qui référençait l'ancien numéro (PV, devis, journal) tomberait dans le vide, rupture de traçabilité inacceptable pour une plateforme d'État auditée. *Numéro de manifeste comme clé dès l'ouverture* — impossible : le manifeste n'existe pas encore à l'ouverture anticipée.
**Conséquences :** le modèle porte un identifiant technique immuable **et** un champ libellé mutable (provisoire → définitif) avec sa date de figeage. L'UI d'ouverture affiche un libellé provisoire ; l'écran d'import du manifeste **substitue** le libellé sans toucher à l'identifiant. La saisie manuelle **exige** un champ n° de manifeste. Aucun lien inter-objets ne s'appuie sur le libellé affiché.

## ADR-0007 — Dépouillement déclaratif avec navette de validation — 2026-07-03
**Statut :** Acceptée (réponse CGC, questionnaire du 2026-07-03) — **complétée par ADR-0013** : la validation finale du PV définitif passe par un palier hiérarchique unique (permission dédiée), au-dessus de l'agent traitant.
**Contexte :** il fallait savoir qui classifie les marchandises et ce que « réconcilie » le PV (Q8). Le CGC a tranché : c'est le consignataire qui connaît le mieux sa cargaison.
**Décision :** le **consignataire classifie lui-même** ses marchandises ; sa déclaration fait office de dépouillement (**PV provisoire**). Le CGC **valide ou réfute**, et une **navette** s'opère dans les deux sens jusqu'à la **validation finale** (PV de réconciliation définitif). Les règles de catégorisation seront affinées par les **simulations DOSI/DEX attendues pour le 30/07/2026**.
**Alternatives écartées :** dépouillement fait par le CGC seul puis contresigné — ce n'est pas le fonctionnement voulu.
**Conséquences :** nuance l'ADR-0004 : la pré-classification assistée (historique + IA) sert d'abord au **consignataire** pendant sa déclaration, et au CGC comme **outil de contrôle** (signaler les classifications atypiques). Le modèle de données doit porter les **versions du PV** et l'historique de la navette (qui a contesté quoi, quand). L'objection « conflit d'intérêt » est couverte par la validation CGC obligatoire.

## ADR-0006 — Le calcul CDTS vit dans e-CDTS : devis dans l'app, facture à la DAF — 2026-07-03
**Statut :** Acceptée (réponse CGC, questionnaire du 2026-07-03 — Q4, Option A)
**Contexte :** le CDC plaçait la facturation hors périmètre (DAF), laissant ouverte la question de savoir si l'app calcule le montant.
**Décision :** e-CDTS **applique le barème** (`BAREME-CDTS.md`) aux quantités/catégories du PV validé et **produit le devis** (montant liquidé). La DAF établit la facture officielle dans son propre système, puis elle est **téléversée dans e-CDTS**. Règles de calcul confirmées : **unité payante à l'avantage du CGC** (tonne vs m³ → le plus élevé), **aucune exonération, aucun minimum, aucun arrondi** ; l'attribut **ligne régulière/tramping est porté par le navire** à son enregistrement.
**Alternatives écartées :** Option B (l'app s'arrête au PV, la DAF calcule) — rejetée par le CGC.
**Conséquences :** le barème est une donnée de référence **versionnée dans l'app** (les tarifs peuvent évoluer par texte réglementaire) ; le moteur de calcul doit être testé contre des cas de référence ; le devis devient un objet de première classe du modèle.

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
**Statut :** Acceptée (principe) — **nuancée par ADR-0007** (c'est le consignataire qui déclare la classification ; l'assistance sert au déclarant et au contrôle CGC) — architecture technique à étudier au moment du plan
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
