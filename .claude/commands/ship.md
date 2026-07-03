---
description: Prépare la livraison — lint, tests, commit conventionnel, puis PR/MR.
---

Tu prépares proprement la livraison du travail en cours. Contexte optionnel : $ARGUMENTS

## Séquence (s'arrêter au premier échec)
1. **Lint** : `vendor/bin/pint --dirty`. Corriger si nécessaire.
2. **Tests back** : `php artisan test --compact`. Tout doit être vert.
3. **Tests front** (si le front a été touché) : `npm run test` puis `npm run test:e2e`.
4. **Revue** : si le diff est sensible (auth, paiement, données), lance le sous-agent `reviewer-secu` sur le diff et traite les findings BLOQUANTS.
5. **Docs vivantes** : mets à jour `DECISIONS.md` / `GLOSSARY.md` si une décision ou un terme a émergé.
6. **Commit** : messages **Conventional Commits** (cf. `docs/WORKFLOW.md`), un commit = un changement cohérent.
7. **PR / MR** :
   - GitHub : `gh pr create` avec titre conventionnel + description (quoi / pourquoi / comment tester).
   - GitLab : `glab mr create` équivalent.

## Règles
- **Ne merge jamais avec une étape rouge.** Si un test casse, arrête-toi et signale-le clairement.
- Ne committe pas `.env`, secrets, `vendor/`, `node_modules/`.
- Confirme avant de pousser si la branche est partagée.
