# Harnais — Règles de l'agent

> Ce fichier est lu à chaque session. Il est court **volontairement**. Le détail vit dans `docs/`.

## Les 4 principes (non négociables)

### 1. Rester dans la zone de génie (0–80k tokens)
La fenêtre de référence est **200 000 tokens**. La qualité du raisonnement est optimale entre **0 et 40 %**, soit **0 à 80 000 tokens** occupés. Au-delà, la performance chute.
- Ne charge **jamais** tout le code. Ouvre le strict nécessaire.
- Toute recherche qui demande d'ouvrir **plus de 3–4 fichiers** → délègue au sous-agent **`explorateur`** (contexte séparé, jetable). Il rend une **conclusion**, pas des dumps de fichiers.
- Résume dans `docs/*.md` plutôt que de tout garder en mémoire vive.

### 2. Plan avant exécution
- Tâche **non triviale** (plusieurs fichiers, choix d'archi, migration, refonte) → propose un **plan numéroté** et **attends le feu vert**.
- Tâche **simple** (1 fichier, correction évidente, renommage) → agis directement.
- La commande `/plan` produit un plan sans rien exécuter.

### 3. Questionner, jamais inventer
Face à une ambiguïté (nom métier, règle de gestion, choix technique non tranché) → **pose la question**. Ne choisis pas à la place de l'humain. Une hypothèse silencieuse est un bug en puissance.

### 4. Contexte vivant
Après toute tâche significative, mets à jour les docs concernés via `/refresh-context` :
- `DECISIONS.md` — le **pourquoi** d'un choix (ADR).
- `GLOSSARY.md` — les **vrais termes métier**.
- `ARCHITECTURE.md` / `DATABASE.md` — si une convention ou un schéma change.

### 5. Simplicité & changements chirurgicaux (garde-fou anti sur-ingénierie)
Les standards d'`ARCHITECTURE.md` disent *comment* bien structurer ; ce principe dit *jusqu'où*.
- **Proportionnalité** : la lourdeur de la structure croît avec la complexité du problème. Pour le trivial, le minimum lisible l'emporte. Ne crée pas Action + Service + DTO + Resource pour ce qui tient en 20 lignes claires. *Si 200 lignes peuvent en faire 50, réécris.*
- **Chirurgical** : touche **uniquement** ce que la demande exige. Ne refactore pas l'adjacent qui n'est pas cassé, ne « profite pas d'être là ». Chaque ligne modifiée doit tracer directement vers la demande.
- **Pas de spéculatif** : aucune abstraction, option ou gestion d'erreur pour un cas qui n'existe pas encore.
- **Pousser en retour** : si une approche plus simple existe, propose-la avant de coder.

## Carte des docs (où lire quoi)

| Fichier | Contenu |
|---|---|
| `docs/ARCHITECTURE.md` | Conventions de code Laravel, « où mettre quoi » |
| `docs/DATABASE.md` | Conception BDD (PostgreSQL), migrations, index |
| `docs/FRONTEND.md` | UI/UX, TypeScript, topologie (Inertia vs API+SPA) |
| `docs/TESTING.md` | Pest + Vitest + Playwright, quand écrire quoi |
| `docs/DECISIONS.md` | Journal des décisions (historique) |
| `docs/GLOSSARY.md` | Langage métier du projet |
| `docs/WORKFLOW.md` | Git/GitLab, commits, GitHub Actions |
| `docs/MCP.md` | Quel MCP pour quelle action |

## Commandes clés
- `/grill` — interrogatoire structuré pour verrouiller la spec **avant** de coder (anti-désalignement)
- `/plan` — plan phasé sans exécution
- `/ship` — Pint → tests → commit conventionnel → PR
- `/refresh-context` — mise à jour des docs après une tâche
- `/init-harness` — installe/adapte ce harnais dans un projet

## Stack de ce projet
- **Laravel** : `13.18` (starter kit React officiel)
- **Topologie front** : `[x] Inertia+React (React 19, Vite 8, Tailwind 4, TypeScript)`
- **Base de données** : PostgreSQL 16 (base locale `e_cdts`)
- **CI** : `[x] GitHub Actions` (`.github/workflows/lint.yml`, `tests.yml`)
- **Tests** : Pest (PHP)
- **Auth** : starter kit (passkeys + 2FA inclus)
