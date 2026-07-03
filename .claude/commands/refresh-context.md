---
description: Met à jour les docs de contexte vivant après une tâche significative.
---

Tu maintiens la **mémoire longue** du projet à jour, pour que la prochaine session démarre informée. Contexte : $ARGUMENTS

## Ce que tu passes en revue
À partir du travail qui vient d'être fait :

1. **`docs/DECISIONS.md`** — une décision structurante a-t-elle été prise (archi, convention, techno, compromis, dénormalisation) ? Si oui, ajoute une entrée ADR datée (format en tête du fichier), la plus récente en haut. Ne réécris jamais une décision passée : marque-la `Remplacée par ADR-XXX`.

2. **`docs/GLOSSARY.md`** — un nouveau terme métier, statut ou acronyme est-il apparu ? Ajoute-le avec sa définition et son nom technique. Si un terme a été deviné faute d'info, **demande confirmation** à l'humain avant de l'inscrire.

3. **`docs/ARCHITECTURE.md` / `DATABASE.md` / `FRONTEND.md`** — une **convention** a-t-elle changé ou été créée ? Mets à jour la section concernée (pas le récit de la tâche, seulement la règle pérenne).

## Règles
- On consigne des **règles et décisions pérennes**, pas le journal détaillé de la session.
- Concis : chaque ajout doit aider une future session, pas la noyer.
- Si rien de pérenne n'a émergé, dis-le simplement — ne remplis pas pour remplir.
