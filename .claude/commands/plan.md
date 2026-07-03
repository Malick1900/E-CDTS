---
description: Produit un plan d'action phasé SANS rien exécuter, pour validation par l'humain.
---

Tu vas **planifier, pas exécuter**. Objectif : présenter à l'humain un plan clair qu'il valide avant toute action.

Tâche à planifier : $ARGUMENTS

## Méthode
1. **Comprendre** : si la tâche touche des fichiers inconnus, délègue une exploration au sous-agent `explorateur` (préserve la zone de génie). Ne charge pas tout le code toi-même.
2. **Lever les ambiguïtés** : liste les points flous (règles métier, termes absents de `GLOSSARY.md`, choix non tranchés) et **pose les questions** à l'humain avant de finaliser le plan.
3. **Rédiger le plan** :
   - Objectif en une phrase.
   - Étapes numérotées, chacune courte et vérifiable.
   - Fichiers impactés.
   - Tests prévus (Pest / Vitest / Playwright).
   - Risques et décisions à consigner dans `DECISIONS.md`.
   - Ce qui pourrait être délégué à un sous-agent codeur (spec précise) vs gardé par l'agent principal.
4. **S'arrêter** et demander le feu vert. **N'écris aucun code.**

Respecte le principe : plan avant exécution ; questionner, jamais inventer.
