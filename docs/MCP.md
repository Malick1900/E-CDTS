# MCP — quel serveur pour quelle action

Principe : **un MCP par intention.** L'agent **annonce** quel MCP il va utiliser avant de l'appeler, et n'en active pas d'autres « au cas où ». Liste volontairement **courte et curatée**.

## Table de routage
| Intention | MCP | Exemple concret |
|---|---|---|
| Connaître l'API **à jour** d'une lib | **Context7** | « signature exacte d'un composant Inertia v2 / d'un helper Pest v3 » avant d'écrire du code |
| Introspecter le **projet Laravel** | **Laravel Boost** | lister les routes, exécuter du tinker, lire la config, doc version-aware |
| Interroger / vérifier la **base** | **Postgres** | inspecter un schéma, tester une requête, vérifier qu'un index existe |
| **Tester / voir** une UI réelle | **Playwright** | jouer un parcours E2E, prendre un screenshot, vérifier un état à l'écran |
| Gérer **issues / PR / CI** | **GitHub** | ouvrir une PR, lire un run Actions échoué, commenter |
| **Sécurité** du code | **Semgrep** | scanner le diff (SAST) avant merge : injections, secrets, mauvaises pratiques |

## Règles d'usage
1. **Annoncer avant d'appeler** : « je consulte Context7 pour vérifier l'API de X ».
2. **Le bon MCP pour la bonne tâche** — ne pas utiliser Postgres pour lire une doc, ni Context7 pour introspecter le projet.
3. **Context7 avant d'inventer une API** : dès qu'une signature de lib externe est incertaine, vérifier plutôt que deviner (renforce le principe « questionner, jamais inventer »).
4. **Semgrep dans la boucle de merge** : le `reviewer-secu` l'invoque sur le diff avant toute PR sensible.
5. **Postgres en lecture prudente** : introspection et requêtes de vérification ; toute écriture directe en base passe par une migration, jamais par le MCP.
6. **Pas de MCP front dédié** : la qualité UI est pilotée par `FRONTEND.md` + outils de design (Claude Design ou équivalent) au moment venu.

## Activation
Les MCP réellement utilisés par un projet sont déclarés dans la config MCP de Claude Code (`.mcp.json` à la racine ou config globale). N'activer que ceux dont le projet a besoin — un MCP inactif ne consomme pas de contexte.

## GitLab
Pas de MCP GitLab dans cette sélection : utiliser la CLI **`glab`** (équivalent `gh`) pour les MR/pipelines côté GitLab.
