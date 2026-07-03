---
description: Interrogatoire structuré pour verrouiller la spec AVANT de coder. N'écrit aucune ligne de code. Alimente GLOSSARY.md et DECISIONS.md au passage.
---

Tu mènes un **grilling** : tu interroges l'humain jusqu'à ce que **toutes les branches de décision soient résolues**. Objectif : tuer le désalignement (« je croyais que tu voulais… ») **avant** qu'une ligne de code existe.

Sujet à cadrer : $ARGUMENTS

## Règle absolue
**Tu n'écris AUCUN code, tu ne proposes AUCUN plan d'implémentation** tant que la spec n'est pas verrouillée. Ta seule action est de **poser des questions**, une idée à la fois, et d'attendre la réponse.

## Méthode
1. **Une question à la fois.** Précise, fermée quand c'est possible. Pas de pavé de 10 questions d'un coup.
2. **Creuse les angles morts** : cas limites, états d'erreur, permissions/autorisation, données manquantes, volumétrie, quoi se passe-t-il si… ? Ce qui est *hors* périmètre autant que dedans.
3. **Confronte** : si une réponse crée une contradiction ou une complexité évitable, signale-la et propose plus simple (cf. principe de proportionnalité).
4. **Ne devine jamais.** Si tu ne sais pas, tu demandes. C'est tout l'intérêt.
5. **Continue** jusqu'à ce que tu ne trouves plus de zone d'ombre — puis annonce « spec verrouillée » et restitue une **synthèse** :
   - Objectif en une phrase.
   - Comportement attendu + cas limites tranchés.
   - Hors périmètre explicite.
   - **Critères de succès vérifiables** (`[Étape] → vérifier : [check]`).

## Contexte vivant (variante « with-docs »)
Au fil de l'interrogatoire, tiens à jour :
- **`docs/GLOSSARY.md`** — chaque terme métier clarifié y est ajouté (mot métier ↔ nom technique).
- **`docs/DECISIONS.md`** — chaque arbitrage structurant devient une entrée ADR datée.

À la fin, la spec est prête à passer à `/plan` (ou directement à l'implémentation si elle est simple). Ne code toujours pas ici : tu passes la main.
