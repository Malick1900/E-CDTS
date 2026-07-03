# Workflow Git & CI/CD

But : un historique **lisible**, des changements **traçables**, une CI qui **empêche** de merger du code cassé. Compatible **GitHub** et **GitLab**.

## Branches
- `main` — toujours déployable. Protégée : pas de push direct.
- `develop` — (optionnel, si flux en deux temps) intégration.
- `feature/<sujet>` — une fonctionnalité.
- `fix/<sujet>` — une correction.
- `chore/<sujet>` — maintenance, outillage, deps.
- Branches **courtes** : petite portée, PR/MR rapide à relire.

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

## PR / MR
- Titre en Conventional Commit ; description = **quoi + pourquoi + comment tester**.
- **Petite** et focalisée ; si elle grossit, la découper.
- Checklist avant ouverture (assurée par `/ship`) :
  1. `vendor/bin/pint --dirty` passe.
  2. `php artisan test` vert.
  3. `npm run test` + `npm run test:e2e` verts (si front touché).
  4. Docs à jour (`DECISIONS.md`/`GLOSSARY.md` si besoin).
- Revue obligatoire avant merge. Merge **squash** pour un historique propre.

## CI — pipeline cible (fichier à ajouter quand tu le décides)
> Les fichiers CI ne sont **pas encore inclus** dans le harnais. Voici le pipeline visé, à créer le moment venu (`/plan` pour le générer). Rôle de la CI : à chaque push/PR, une machine neutre rejoue la checklist qualité et **bloque le merge** si une étape échoue.

Étapes du pipeline (identiques pour GitHub Actions et GitLab CI) :
1. **Lint** — Pint (`--test`).
2. **Tests back** — Pest sur PostgreSQL (service container).
3. **Build front** — `npm ci` + `npm run build`.
4. **Tests front** — Vitest.
5. **E2E** — Playwright (navigateurs installés, app démarrée).
6. **Sécu** (optionnel) — Semgrep sur le diff.

- **GitHub** → `.github/workflows/ci.yml`.
- **GitLab** → `.gitlab-ci.yml` (`stages: [lint, test, build, e2e]`, service `postgres`, artefacts Playwright).
- Caching composer + npm pour la vitesse.

## Règles d'or
- **Jamais** `git push --force` sur une branche partagée.
- **Jamais** committer `.env`, secrets, `/vendor`, `/node_modules`.
- Ne pas merger avec la CI rouge, même « juste pour tester ».
- Un `fix` commence idéalement par un test qui reproduit le bug (cf. `TESTING.md`).

## Signaux « demander avant d'agir »
- Réécriture d'historique (`rebase`, `--force`) sur une branche partagée → demander.
- Changement de stratégie de branches ou de release → plan + validation, puis `DECISIONS.md`.
