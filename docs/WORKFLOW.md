# Workflow Git & CI/CD

But : un historique **lisible**, des changements **traçables**, une CI qui **empêche** de merger du code cassé. Compatible **GitHub** et **GitLab**.

## Branches — **branche unique sur `main`** (ADR-0029)

Le projet a **un seul développeur**. On travaille donc **directement sur `main`**, sans branche de fonctionnalité et sans pull request. `main` n'est pas protégée : le push direct est la voie normale.

- `main` — la seule ligne de développement. Toujours déployable.
- Commits **petits et fréquents**, un par tranche livrée.
- **Pas de branche** créée sans raison explicite.

**Contrepartie, à ne pas perdre de vue :** sans merge, la CI ne peut plus rien *empêcher* — elle constate après coup. Le filet devient la **discipline locale**, ci-dessous. Un commit qui passe mal se répare par `git revert`, jamais par réécriture d'historique sur `main`.

> Le modèle par branches courtes (`feature/<sujet>`, `fix/<sujet>`, `chore/<sujet>`, PR relue puis mergée en squash) reste la cible **le jour où un second développeur rejoint le projet**. Il est décrit dans ADR-0029 pour ne pas être réinventé.

## Avant chaque push — la checklist qui remplace la revue
1. `vendor/bin/pint --test` passe.
2. `php artisan test` vert.
3. `composer types:check` (PHPStan niveau 7) — **exécuté par la CI**, donc à lancer avant, pas après.
4. Front touché → `npx tsc --noEmit`, `npx eslint resources/js`, `npm run build`.
5. Docs à jour (`DECISIONS.md` / `GLOSSARY.md` si besoin).

## Commits — Conventional Commits (obligatoire)
Format : `type(scope): sujet à l'impératif présent`

Types : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `ci`.
```
feat(billing): ajoute l'annulation d'une facture
fix(auth): corrige la redirection après expiration de session
test(billing): couvre le refus de paiement d'une facture payée
refactor(invoice): extrait CreateInvoice dans une action
```
Règles :
- Un commit = **un changement cohérent** (pas de fourre-tout).
- Sujet ≤ 72 caractères, à l'impératif, sans point final.
- Corps si nécessaire : le **pourquoi**, pas le comment.
- Référencer l'issue : `Refs #123` / `Closes #123`.

## PR / MR — sans objet pour l'instant
Il n'y a pas de revue à organiser tant que le projet n'a qu'un développeur. Le jour où une PR redevient utile : titre en Conventional Commit, description = **quoi + pourquoi + comment tester**, petite et focalisée, revue avant merge. Le **squash** n'est indiqué que si la branche contient des commits de travail intermédiaires ; des commits déjà propres se mergent en *rebase*, qui préserve leur granularité.

## CI — en place
Deux workflows existent réellement, déclenchés sur **push** *et* pull request vers `main` :

| Fichier | Job | Contenu |
|---|---|---|
| `.github/workflows/lint.yml` | `quality` | Pint (`--test`), PHP 8.4 |
| `.github/workflows/tests.yml` | `ci` | matrice PHP **8.4 / 8.5** : `composer install`, build des assets, **`composer types:check` (PHPStan niveau 7)**, Pest |

Deux pièges à connaître :
- **PHPStan est dans la CI**, appelé par `composer types:check` — un `grep phpstan` sur les workflows ne le trouve pas. Il faut le lancer en local avant de pousser.
- PHP **8.3 a été retiré** de la matrice : Symfony 8, embarqué par Laravel 13, exige `>= 8.4.1`. `composer.json` déclare pourtant encore `"php": "^8.3"` — dette connue, non corrigée parce que la régénération du lock est bloquée par des avis de sécurité sur Guzzle.

Étapes encore absentes : Vitest, Playwright, analyse de sécurité (Semgrep sur le diff).

## Règles d'or
- **Jamais** `git push --force` sur `main`. Un commit qui passe mal se répare par `git revert`.
- **Jamais** committer `.env`, secrets, `/vendor`, `/node_modules`.
- Ne pas pousser avec la checklist rouge. Sans merge à bloquer, c'est la seule barrière qui reste.
- Un `fix` commence idéalement par un test qui reproduit le bug (cf. `TESTING.md`).

## Signaux « demander avant d'agir »
- Toute réécriture d'historique sur `main` (`rebase`, `--force`) → demander.
- Création d'une branche, ouverture d'une PR → demander : le modèle par défaut est la branche unique.
- Changement de stratégie de branches ou de release → plan + validation, puis `DECISIONS.md`.
