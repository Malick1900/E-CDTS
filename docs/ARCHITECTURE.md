# Architecture & conventions de code Laravel

But : un code lisible, testable, où chaque chose a **une seule place évidente**.

> ⚠️ **À lire avant la table ci-dessous.** Ce document dit *comment* structurer. Il ne t'oblige pas à tout structurer. La règle qui prime est la **proportionnalité** (ci-dessous) : n'applique la lourdeur qu'à hauteur de la complexité réelle.

## Proportionnalité — structurer juste assez
- La structure croît avec la **complexité du problème**, pas par réflexe.
- **Cas trivial** (afficher une liste, un champ, une redirection) → le minimum lisible. Pas de Service ni de DTO pour 20 lignes claires.
- **Cas métier réel** (règles, effets de bord, cas d'erreur) → là, applique pleinement Action/Service/Policy/Resource.
- *Si 200 lignes peuvent en faire 50, réécris.* Aucune abstraction pour du code à usage unique. Rien de spéculatif « au cas où ».
- En doute sur le niveau de structure adéquat → propose l'option simple **et** l'option structurée, laisse l'humain trancher.

## Changements chirurgicaux
- Touche **uniquement** ce que la demande exige. Ne refactore pas l'adjacent qui fonctionne.
- Respecte le style existant du fichier plutôt que d'imposer le tien.
- Ne supprime que les imports/variables que **tes** changements rendent inutiles.
- Chaque ligne modifiée doit tracer directement vers la demande. Une « amélioration » non demandée est un changement de trop.

## Où mettre quoi (table de décision)

| Besoin | Emplacement | Règle |
|---|---|---|
| Recevoir une requête HTTP | `app/Http/Controllers` | Controller **fin** : il valide, délègue, répond. Aucune logique métier. |
| Valider l'entrée | `app/Http/Requests` (Form Request) | Toute validation non triviale ici. Jamais dans le controller. |
| Logique métier unitaire | `app/Actions` | Une action = **une intention**. Voir ci-dessous. |
| Orchestration multi-étapes | `app/Services` | Coordonne plusieurs actions. Voir ci-dessous. |
| Autorisation | `app/Policies` | `authorize()` / `can()`. Jamais de `if ($user->role...)` dispersés. |
| Sérialisation de sortie | `app/Http/Resources` (API Resource) | Le modèle ne définit jamais sa forme JSON directement. |
| Transport de données entre couches | `app/DataTransferObjects` (DTO) | Objet typé et immuable aux frontières. |
| Traitement asynchrone | `app/Jobs` | Tout ce qui est lent, faillible ou externe (mail, API, export). |
| Découplage / effets de bord | `app/Events` + `app/Listeners` | « Quand X arrive, alors Y » sans coupler X à Y. |
| Valeur fermée (statuts, types) | `app/Enums` (enum PHP 8.1) | Jamais de constantes string éparpillées. |

---

## Action vs Service — le critère de décision

C'est la question qui revient le plus. Règle simple : **commence toujours par une Action. Ne crée un Service que quand tu dois coordonner plusieurs actions ou détenir un état/contexte configuré.**

### Utilise une **Action** quand…
- Il y a **une seule intention métier**, exprimable par un verbe : `CreateInvoice`, `CancelSubscription`, `MarkPaymentAsPaid`, `SendPasswordReset`.
- Elle est **autonome et stateless** : mêmes entrées → même comportement.
- Elle doit être **réutilisable** depuis un controller, une command, un job ou une autre action.
- Elle **retourne un résultat explicite** (un modèle, un DTO, une valeur).

```
// app/Actions/Billing/CreateInvoice.php
final class CreateInvoice
{
    public function handle(CreateInvoiceData $data): Invoice
    {
        // une intention, un résultat garanti (ou une exception métier claire)
    }
}
```

### Utilise un **Service** quand…
- Tu dois **orchestrer plusieurs actions/étapes** autour d'un même domaine : `CheckoutService` enchaîne `ReserveStock` → `CreateInvoice` → `ChargePayment` → `NotifyCustomer`.
- Tu détiens un **état ou une dépendance configurée** réutilisée sur plusieurs appels : un `PaymentGatewayService` qui wrappe une API externe (clé, client HTTP, retries).
- Le domaine a **plusieurs points d'entrée cohérents** qu'on veut regrouper derrière une façade métier.

```
// app/Services/CheckoutService.php — orchestre, ne réimplémente pas la logique des actions
final class CheckoutService
{
    public function __construct(
        private ReserveStock $reserveStock,
        private CreateInvoice $createInvoice,
        private ChargePayment $chargePayment,
    ) {}

    public function checkout(Cart $cart): Order { /* enchaîne les actions */ }
}
```

### En une phrase
> **Action = un verbe, un résultat.** **Service = un chef d'orchestre** qui appelle des actions. Un Service qui ne fait qu'une chose devrait être une Action. Une Action qui en appelle trois autres devrait être un Service.

---

## Gestion des exceptions — STRICT

Principe fondateur : **toute action mène à un résultat déterminé.** Soit elle réussit et retourne sa valeur, soit elle échoue en levant une **exception métier nommée porteuse d'un message clair**. Jamais de retour ambigu (`null` silencieux, `false` sans contexte), jamais d'erreur brute laissée fuiter.

### Règles
1. **Une action réussit ou lève une exception nommée.** Pas d'entre-deux.
2. **Exceptions métier dédiées** dans `app/Exceptions`, une par cas réel : `InvoiceAlreadyPaidException`, `InsufficientStockException`, `PaymentDeclinedException`.
3. **Message clair et humain obligatoire.** L'exception porte un message qui explique *ce qui s'est passé* et *pourquoi*, pas un code technique.
4. **Jamais de code HTTP brut renvoyé nu.** Un `500`, `419`, `409` sans message est interdit. Chaque exception est mappée dans le Handler vers une réponse explicite : message utilisateur + code HTTP *approprié au sens métier*.
5. **Log technique + message utilisateur séparés.** On log la stack et le contexte pour le debug ; on renvoie à l'utilisateur un message compréhensible.

```
// app/Exceptions/PaymentDeclinedException.php
final class PaymentDeclinedException extends DomainException
{
    public static function forOrder(Order $order, string $reason): self
    {
        return new self("Le paiement de la commande #{$order->reference} a été refusé : {$reason}.");
    }
}
```

```
// app/Actions/Billing/ChargePayment.php
public function handle(Order $order): Payment
{
    $result = $this->gateway->charge($order->total());

    if ($result->declined()) {
        // message clair, contexte tracé — pas un simple "return false"
        throw PaymentDeclinedException::forOrder($order, $result->reason());
    }

    return Payment::createFromGateway($order, $result);
}
```

```
// app/Exceptions/Handler.php — chaque exception métier a une réponse claire
$this->renderable(function (DomainException $e, Request $request) {
    Log::warning($e->getMessage(), ['exception' => $e]); // trace pour le debug
    return $request->expectsJson()
        ? response()->json(['message' => $e->getMessage()], $e->httpStatus())
        : back()->withErrors(['metier' => $e->getMessage()]); // message lisible, pas un 419 nu
});
```

### Anti-patterns exceptions à refuser
- `abort(500)` / `abort(419)` sans message métier.
- `try { ... } catch (\Exception $e) {}` qui avale l'erreur en silence.
- Retourner `null`/`false` pour signaler un échec métier.
- Exposer un message technique (SQL, stack, classe) à l'utilisateur final.

---

## Eloquent — modèles maigres

- **Pas de logique métier dans le modèle.** Il décrit les données et leurs relations, rien de plus.
- `$fillable` **explicite** (jamais `$guarded = []`).
- Casts systématiques : dates, enums, `array`/`json`, `decimal:2` pour les montants.
- **Query scopes** pour les filtres réutilisables (`scopeActive`, `scopeForTenant`).
- **N+1 interdit** : eager loading (`with()`) par défaut. Détection via `Model::preventLazyLoading()` en local.

## Autorisation (RBAC) — `spatie/laravel-permission`

Modèle décidé par ADR-0012/0013/0015. Où vit quoi :

| Élément | Emplacement | Rôle |
|---|---|---|
| **Catalogue de permissions** | `app/Enums/Permission.php` | Source **unique en code** (12 attributions). La valeur du cas = nom stocké en base + testé via `can()` / middleware `permission:`. |
| **Profils par défaut** | `app/Enums/Profil.php` | Les 5 profils CGC + `super-admin`, avec leur composition **de départ** (éditable ensuite). |
| **Seed** | `database/seeders/RolesAndPermissionsSeeder.php` | Idempotent (`findOrCreate` + `syncPermissions`). Pose permissions + rôles. |
| **Bypass super-admin** | `AppServiceProvider::configureAuthorization()` | `Gate::before` : le rôle `super-admin` outrepasse tout (protégé, ADR-0012). |

**Règles :**
- **Ajouter une capacité = travail de code** : nouveau cas dans l'enum `Permission` + brancher un crochet d'autorisation (policy/`can`) + reseed. Jamais de permission créée depuis l'UI (elle ne contrôlerait rien).
- **Recomposer les rôles = libre depuis l'admin** (matrice cochable, module 1) — c'est la *composition* qui est éditable, pas le vocabulaire.
- **Permissions effectives = union des rôles** du compte. On assigne des **rôles**, jamais des permissions à la pièce.
- **Portée (agent ↔ armements, Superviseur ↔ son équipe) = filtre de données**, jamais une permission (ADR-0009). À traiter en policy/scope.
- **Garde-fous** (ADR-0012) : `super-admin` verrouillé ; un admin ne peut pas retirer sa propre capacité d'administration (anti-auto-blocage, à appliquer en policy côté module Utilisateurs) ; toute mutation de rôle/permission tracée au journal d'audit.

## Règles transverses

- **Une classe = une responsabilité.** Si une méthode dépasse ~30 lignes ou fait « et… et… », extraire.
- **Typage strict** : `declare(strict_types=1);`, types de retour, `readonly` quand pertinent.
- **Injection de dépendances** via le constructeur ; pas de `app()` dans la logique métier.
- **Config, pas de valeurs en dur** : `config()` + `.env`, `env()` seulement dans les fichiers de config.

## Signaux « demander avant d'agir »
Si tu hésites entre Action et Service au-delà du critère ci-dessus, si une règle métier n'est pas dans `GLOSSARY.md`, ou si un choix crée une nouvelle convention → **pose la question**, puis consigne la réponse dans `DECISIONS.md`.
