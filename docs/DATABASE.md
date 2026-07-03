# Conception de base de données (PostgreSQL)

But : un schéma **intègre par construction** — la base garantit elle-même la cohérence, on ne compte pas sur le code applicatif pour ça.

## Conventions de nommage
- Tables : **pluriel, snake_case** (`invoices`, `order_items`).
- Colonnes : snake_case ; clé primaire `id`.
- Clés étrangères : `<singulier>_id` (`user_id`, `invoice_id`).
- Table pivot : les deux noms au singulier, ordre alphabétique (`role_user`).
- Booléens : préfixe verbe (`is_active`, `has_paid`), jamais ambigu.
- Dates/heures : `*_at` (`created_at`, `paid_at`, `deleted_at`).

## Intégrité — non négociable
- **Toute clé étrangère est contrainte** en base (`foreignId()->constrained()`), jamais un simple entier libre.
- **`onDelete` explicite** à chaque FK : `cascade`, `restrict` ou `set null` — choix conscient, jamais par défaut implicite.
- **Contraintes `NOT NULL`** par défaut ; une colonne nullable doit avoir une raison métier.
- **`unique`** en base pour toute unicité métier (email, référence, slug) — pas seulement une validation applicative.
- **`check` constraints** PostgreSQL pour les invariants (`total >= 0`, `quantity > 0`).

## Types PostgreSQL — les bons choix
| Donnée | Type | Ne jamais utiliser |
|---|---|---|
| Argent / montant | `numeric(12,2)` (`decimal`) | ❌ `float` / `double` (erreurs d'arrondi) |
| Identifiant public | `uuid` (ou ULID) | exposer un `id` auto-incrémenté séquentiel |
| Horodatage | `timestamptz` (`timestampTz`) | `timestamp` sans fuseau |
| Données semi-structurées | `jsonb` (indexable) | `json` simple, ou une colonne texte |
| Statut / type fermé | colonne + **enum PHP** casté | string libre non contrainte |
| Texte court contraint | `varchar(n)` avec longueur justifiée | `text` pour tout par défaut |

## Modélisation
- **Normalisation 3NF par défaut.** Pas de données dupliquées ni de colonnes calculables.
- **Dénormalisation autorisée mais justifiée** : uniquement pour la performance, documentée dans `DECISIONS.md`, avec la stratégie de cohérence.
- Relations explicites ; pas de « faux » polymorphisme non contraint sans raison forte.
- `jsonb` pour l'attribut réellement variable (métadonnées), **pas** pour éviter de créer des colonnes.

## Index — la règle
- **Index sur toute clé étrangère** (Laravel ne le crée pas automatiquement sur toutes les versions).
- Index sur les colonnes de **recherche, tri, filtrage fréquents**.
- Index **composite** dans l'ordre des requêtes réelles (colonne la plus sélective d'abord).
- Index **unique** pour l'unicité, index **partiel** PostgreSQL quand pertinent (`WHERE deleted_at IS NULL`).
- Ne pas sur-indexer : chaque index ralentit les écritures. Justifier par une requête réelle.

## Migrations — discipline
- **Une intention par migration**, nom explicite (`create_invoices_table`, `add_paid_at_to_invoices`).
- **Toujours réversibles** : `down()` correct et testé.
- **Ne jamais modifier une migration déjà mergée/déployée** → nouvelle migration.
- Changements lourds (gros volumes) : penser au verrouillage, index créés `CONCURRENTLY` si besoin en prod.
- Données de référence : **seeders** idempotents, pas dans les migrations.
- Vérifier chaque migration avec `php artisan migrate --pretend` avant application.

## Argent & précision
Tout montant est `numeric` (ou stocké en centimes entiers selon la convention du projet — à fixer dans `DECISIONS.md`). **Jamais de flottant.** Les calculs monétaires passent par une lib dédiée (`brick/money`) ou des entiers.

## Signaux « demander avant d'agir »
- Ajout d'une colonne dont le nom métier n'est pas dans `GLOSSARY.md` → demander le terme exact.
- Choix cascade vs restrict sur une FK sensible → confirmer l'intention métier.
- Dénormalisation ou changement de schéma structurant → plan + validation, puis `DECISIONS.md`.
