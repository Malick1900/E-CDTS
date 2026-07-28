# Frontend — interfaces intuitives & fonctionnelles

But : des UI que l'utilisateur **comprend sans réfléchir** et qui ne mentent jamais sur leur état.

## Topologie du projet (à cocher par `/init-harness`)
```
[x] Inertia + React      → monolithe, pas d'API publique, props typées serveur→client
[ ] Inertia + Vue 3      → monolithe, Composition API
[ ] API Laravel + SPA    → front découplé (React/Vue), consomme l'API REST/JSON
```
Les conventions communes s'appliquent partout ; les blocs marqués **[Inertia]** ou **[API+SPA]** ne valent que pour la topologie concernée.

## TypeScript — strict partout
- `"strict": true` dans `tsconfig`. **`any` interdit** (utiliser `unknown` + narrowing).
- **Types partagés source unique** :
  - **[Inertia]** props de page typées, générées depuis le back si possible.
  - **[API+SPA]** types générés depuis l'API (OpenAPI/Zod) — le front ne redéclare pas à la main les formes du back.
- Valider les données entrantes runtime avec **Zod** (surtout [API+SPA]) : ne jamais faire confiance à la forme reçue.
- Props de composants typées, pas de props implicites.

## Gérer tous les états — selon le type de vue

**Cas 1 — une vue qui charge/affiche des données** (liste, détail, tableau de bord).
Elle **doit** gérer explicitement les 4 états :
1. **Loading** — squelette / spinner, jamais un écran blanc figé.
2. **Empty** — état vide clair avec action suggérée (« Aucune facture. Créer la première »).
3. **Error** — message compréhensible + moyen de réessayer. Jamais une page cassée.
4. **Success** — la donnée affichée.

**Cas 2 — une action / soumission de formulaire.**
Le succès n'a **pas besoin d'exposer une donnée en sortie** : une **confirmation claire** suffit (« Formulaire enregistré avec succès », toast + reset ou redirection). Ce qui compte ici :
- État **loading** pendant l'envoi (bouton désactivé, anti double-soumission).
- **Erreurs** de validation affichées au bon endroit.
- **Confirmation** explicite du succès.

> La règle de fond : **une vue ne doit jamais laisser l'utilisateur dans le doute sur ce qui se passe.** Une vue de données qui n'implémente que le cas plein (sans loading/empty/error) est incomplète. Un formulaire, lui, a juste besoin d'un feedback de succès clair.

## Feedback & interactions
- **Toute action a un retour immédiat** : bouton en `loading`, toast de succès/erreur, désactivation anti double-soumission.
- Les erreurs de validation serveur s'affichent **au champ concerné**, pas juste en haut.
- Actions destructrices → **confirmation** explicite.
- Optimistic UI seulement si le rollback est géré.

## Accessibilité (a11y) — minimum non négociable
- Tout `input` a un `<label>` associé.
- Navigation **clavier** complète ; focus visible ; ordre de tabulation logique.
- Contraste suffisant (WCAG AA).
- Rôles/aria sur les composants custom (modales, menus, onglets).
- Images : `alt` pertinent.

## Structure des composants
- **Petits, une responsabilité.** Un composant qui fait défiler + filtre + pagine + édite → à découper.
- **Séparer logique et présentation** : hooks/composables pour la logique, composant « bête » pour l'affichage.
- Nommage explicite, dossier par feature plutôt que par type technique.
- Pas de logique métier dans le front : elle vit côté Laravel. Le front **présente** et **valide l'ergonomie**, il ne décide pas des règles de gestion.

### Motif « module d'administration » (référence : Référentiels)
Quand plusieurs écrans d'un module sont **structurellement le même écran** (ici : recherche → tableau → tiroir → confirmation, cinq fois), on extrait le squelette **une seule fois** et chaque écran ne décrit plus que ce qui lui est propre. Voir `components/admin/referentiels/` (ADR-0021) :
- **Page hôte mince** (`pages/admin/*.tsx`) : choisit l'onglet, prépare les listes déroulantes partagées, route le bouton primaire du bandeau. Pas de tableau, pas de formulaire.
- **Une coquille de tableau** qui possède barre de recherche, compteur, état vide et pagination. Elle reçoit le `<tr>` d'en-tête et les `<tr>` du corps — **pas une description abstraite de colonnes** : le rendu des cellules varie trop pour être décrit en données.
- **Un hook** pour la mécanique (recherche, pagination, état du tiroir, mutations Inertia), **des composants** pour le rendu.
- Les fonctions passées au hook (`filtre`, `depuis`, `valide`…) se déclarent **au niveau module**, pas dans le composant : leurs références restent stables et les dépendances de hooks ne s'invalident pas à chaque rendu.
- **Pagination** : côté client tant que le serveur peut envoyer la liste entière — la recherche filtre alors tout le jeu, pas la page visible. Bascule serveur au premier écran à fort volume (ADR-0017).
- **Réagir à une prop qui change** (ex. un bouton hors du composant qui doit ouvrir un tiroir) : ajuster l'état **pendant le rendu**, pas dans un `useEffect` — un effet provoque un rendu en cascade et fait clignoter l'UI.

## Style
- **Tailwind** utilitaire ; extraire en composant quand une classe se répète, pas de `@apply` dilué partout.
- Design system : espacements, couleurs, typographies **tokenisés** (pas de valeurs magiques dispersées).
- Responsive mobile-first ; tester les points de rupture réels.

## Data fetching
- **[Inertia]** privilégier les props de page et les visites Inertia ; pas de fetch manuel redondant.
- **[API+SPA]** couche client API centralisée (un seul endroit qui connaît les URLs/headers/erreurs) ; gestion cache/revalidation via TanStack Query (ou équivalent) ; jamais de `fetch` brut dispersé dans les composants.

## Signaux « demander avant d'agir »
- Un libellé, un parcours ou un wording métier ambigu → demander (et consigner dans `GLOSSARY.md`).
- Un nouveau pattern d'UI non présent dans le design system → proposer, valider, documenter.
