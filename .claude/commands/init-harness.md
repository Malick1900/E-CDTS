---
description: Installe et adapte ce harnais dans le projet Laravel courant (détection de la stack).
---

Tu installes le harnais dans le projet courant à partir du template de référence `C:\Users\ThinkPad P16s\Documents\laravel-harness-template\`. Argument optionnel : $ARGUMENTS

## Étapes
1. **Vérifier le contexte** : confirme qu'on est bien à la racine d'un projet Laravel (présence de `artisan`, `composer.json`). Sinon, arrête-toi et demande.
2. **Copier le scaffold** (sans écraser sans prévenir) :
   - `CLAUDE.md`, le dossier `docs/`, et `.claude/` (agents, commands, settings).
   - **CI** : le harnais ne fournit pas encore de fichier CI. Si l'humain le souhaite, proposer de générer `.github/workflows/ci.yml` ou `.gitlab-ci.yml` selon la plateforme (cf. section CI de `docs/WORKFLOW.md`) — sinon passer.
   - Si un fichier existe déjà (ex. `CLAUDE.md`), **ne l'écrase pas** : montre la différence et demande quoi faire.
3. **Détecter la stack** et renseigner l'en-tête « Stack de ce projet » de `CLAUDE.md` + la topologie de `docs/FRONTEND.md` :
   - Version Laravel via `composer.json`.
   - Front : présence de `@inertiajs/*` (+ `react` ou `vue`) → Inertia ; sinon présence d'un dossier SPA / `resources/js` consommant l'API → API+SPA. En cas de doute, **demande**.
   - CI : présence de `.github/` → GitHub Actions ; `.gitlab-ci.yml`/remote GitLab → GitLab. En cas de doute, **demande**.
4. **Nettoyer** : retirer les exemples marqués `_(exemple)_` dans `GLOSSARY.md` une fois les vrais termes connus (ou les laisser en attendant, mais le signaler).
5. **Rendre compte** : liste ce qui a été copié, la stack détectée, et ce qui reste à compléter manuellement (termes métier, ADR initiales).

## Règle
Ne devine pas la stack si les indices sont contradictoires : **pose la question**.
