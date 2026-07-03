# Stratégie de test

Principe : **on teste le comportement, pas l'implémentation.** Un test qui casse doit signaler une régression réelle, pas un refactor cosmétique.

## La pyramide
```
        ▲  Playwright (E2E)      → peu, parcours critiques bout-en-bout
       ───
      ────  Vitest (front)       → composants + logique UI
     ──────
    ────────  Pest (back)        → la majorité : règles métier, endpoints, actions/services
```
Beaucoup de tests back rapides, moins de tests E2E lents mais décisifs.

## Pest (backend) — le socle
- **Feature tests** en priorité : ils exercent le vrai parcours (route → controller → action/service → DB).
- **Unit tests** pour la logique pure (calculs, DTO, value objects) et pour une action/service isolé.
- `RefreshDatabase` + **factories** pour des données réalistes.
- **Datasets** pour couvrir les variantes d'un même cas.
- Tester **le résultat ET les exceptions métier** : un cas qui doit lever `PaymentDeclinedException` a son test dédié (cf. règle exceptions de `ARCHITECTURE.md`).
- Nommer par comportement : `it('refuse de payer une facture déjà réglée')`.

```
it('crée une facture et retourne un résultat', function () {
    $data = InvoiceData::from([...]);
    $invoice = (new CreateInvoice)->handle($data);
    expect($invoice)->toBeInstanceOf(Invoice::class)
        ->and($invoice->status)->toBe(InvoiceStatus::Draft);
});

it('lève une exception claire si la facture est déjà payée', function () {
    $invoice = Invoice::factory()->paid()->create();
    expect(fn () => (new MarkAsPaid)->handle($invoice))
        ->toThrow(InvoiceAlreadyPaidException::class);
});
```

Quoi tester en priorité : **chaque règle de gestion** (portée par une action ou un service), chaque autorisation (Policy), chaque cas d'erreur métier, les endpoints (statuts, validation, forme de la réponse).

## Vitest (front) — composants & logique
- Logique des hooks/composables (calculs, transformations, états).
- Rendu des composants : les **4 états** d'une vue de données (loading/empty/error/success) et le feedback des formulaires.
- Validation Zod / typage runtime.
- Mock de la couche API centralisée, pas de vrai réseau.

## Playwright (E2E) — parcours critiques
- **Un test = un scénario utilisateur réel** de bout en bout (login → créer une facture → la payer → la voir payée).
- Se limiter aux **parcours qui coûtent cher s'ils cassent** (auth, paiement, checkout, création de compte). Pas de test E2E pour ce qu'un test Pest couvre déjà.
- **Fixtures d'authentification** réutilisables (état de session partagé), pas de re-login à chaque test.
- Sélecteurs par rôle/texte accessible (`getByRole`, `getByLabel`), pas par classe CSS fragile.
- Vérifier l'état réel après action (données en base / UI mise à jour), pas juste l'absence d'erreur.

## Quand écrire quel test (décision rapide)
| Ce que tu changes | Test à écrire |
|---|---|
| Une règle métier / action / service / endpoint | **Pest** (feature ou unit) |
| Un composant, un état d'UI, un hook | **Vitest** |
| Un parcours utilisateur complet critique | **Playwright** |
| Un calcul pur | **Pest / Vitest** unit |

## Commandes
```
# Back
php artisan test --compact                 # tout
php artisan test --filter=InvoiceTest       # ciblé
vendor/bin/pint --dirty                     # lint avant commit

# Front
npm run test           # Vitest
npm run test:e2e       # Playwright
```

## Règles
- **Rouge → vert → refactor.** Un correctif de bug commence par un test qui reproduit le bug.
- Test **déterministe** : pas de dépendance à l'heure réelle (`Carbon::setTestNow`), à l'ordre, ou au réseau.
- Pas de test « qui teste le framework ». On teste **notre** logique.
- CI bloquante : aucun merge si Pint, Pest, Vitest ou Playwright échoue (cf. `WORKFLOW.md`).

## Signaux « demander avant d'agir »
- Une règle métier à tester n'est pas documentée → demander le comportement attendu avant d'écrire le test.
- Un parcours E2E long et coûteux → confirmer qu'il vaut le coût avant de l'ajouter.
