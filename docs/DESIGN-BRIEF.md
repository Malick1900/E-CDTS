# Prompt de design — e-CDTS (Conseil Gabonais des Chargeurs)

> Brief prêt à coller dans un outil de design IA (Figma Make, v0, Lovable…).
> Couleurs tirées du logo officiel du CGC (2026-07-08). Direction : plateforme publique et
> étatique, bleu dominant, avec un brin d'identité portuaire.

## Contexte
Conçois l'interface web de **e-CDTS**, la plateforme officielle du **Conseil Gabonais des
Chargeurs (CGC)**, établissement public gabonais sous tutelle du Ministère des Transports.
L'application digitalise la liquidation de la CDTS (redevance sur les marchandises transitant
par les ports) : les sociétés consignataires déposent leurs manifestes cargo, les agents du
CGC les contrôlent, l'application calcule les montants et produit les devis.

C'est une **plateforme publique et étatique** : elle doit inspirer la confiance, la rigueur et
la légitimité institutionnelle — pas une startup SaaS. Références d'inspiration :
- le **Système de Design de l'État français (DSFR)** et les portails demarches.gouv :
  sobriété, hiérarchie claire, aplats francs, zéro fantaisie gratuite ;
- **SNCF Connect** : application de service public moderne, fond sobre, données denses mais
  lisibles, statuts très visibles ;
- **SYDONIA / ASYCUDA World** (système douanier CNUCED) : univers métier de nos utilisateurs,
  logique de formulaires et de tableaux de données — à moderniser, pas à imiter.

## Identité visuelle
Le **bleu est la couleur principale**, tirée du logo officiel du CGC (anneau bleu roi,
mappemonde bleu ciel, anneau extérieur vert) :

- `--primary` **Bleu CGC** `#1D3E9C` (bleu roi de l'anneau du logo) : barres de navigation,
  boutons principaux, liens, en-têtes de tableaux, éléments actifs.
- `--primary-dark` `#142C73` : hovers, header institutionnel, pied de page.
- `--secondary` **Bleu ciel** `#7EC8F0` (océan de la mappemonde) : fonds d'encarts,
  surlignages, badges informatifs, illustrations.
- `--accent` **Vert CGC** `#2F9E2F` (anneau extérieur du logo) : uniquement pour les états de
  succès et validations (PV validé, dossier clôturé, paiement enregistré).
- Alertes : orange `#E07B00` (en attente, navette en cours), rouge `#C0392B` (réfuté, bloqué).
- Neutres : fond `#F5F7FA`, surfaces blanches, texte `#1A1F2E`, gris de bordure `#D8DEE9`.
- Le **logo circulaire du CGC** (mappemonde + avion/train/camion/navire) figure dans le header
  et sur l'écran de connexion, sur fond blanc, jamais déformé ni recoloré.

## Touche portuaire
Un « brin de maritime », discret et élégant — jamais décoratif au point de nuire à la densité :
- iconographie métier : navire porte-conteneurs, conteneur, quai, ancre, grue portuaire ;
- fines lignes d'onde stylisées en séparateurs ou en pied de bannière ;
- illustration légère de navire/port sur l'écran de connexion et les états vides ;
- les statuts navire (`Attendu · En rade · À quai · En zone d'exploitation · Sorti`) forment
  une frise chronologique horizontale évoquant l'approche du quai.

## Typographie
Sans-serif institutionnelle et très lisible (Marianne, Public Sans ou Inter). Titres en
semi-bold, corps 14–16 px. **Chiffres tabulaires obligatoires** dans les tableaux et montants
(alignement des colonnes FCFA).

## Écrans clés à concevoir
1. **Connexion** : logo CGC centré, mention officielle « République Gabonaise — Conseil
   Gabonais des Chargeurs », illustration portuaire discrète, formulaire sobre.
2. **Tableau de bord consignataire** : cartes de synthèse (dossiers ouverts, manifestes en
   validation, devis, factures), liste des dossiers avec badges d'état.
3. **Situation portuaire** (saisie agent CGC / lecture seule consignataires) : tableau des
   navires par port, frise de statut, ETA/ETD, poste à quai, sens import/export.
4. **Dossier d'escale** : en-tête navire + n° voyage + sens (import/export), fil d'avancement
   du circuit (manifeste → PV → devis → facture → clôture).
5. **Tableau du manifeste** (écran central) : tableau dense multi-pages (500+ lignes),
   chaque ligne = une expédition ; colonne finale « catégorie de conditionnement » avec
   sélecteur (préremplie pour les conteneurs) ; le **montant FCFA calculé en temps réel**
   s'affiche par ligne et en total figé en pied de tableau ; même écran en mode saisie
   manuelle ligne par ligne avec PDF joint.
6. **Navette du PV de réconciliation** : vue côte à côte déclaration/contestation,
   historique horodaté des allers-retours, totaux vivants.
7. **Devis** : document récapitulatif à l'identité CGC, téléchargeable en PDF.

## Principes UX
- Interface **entièrement en français**, vocabulaire métier exact (manifeste, dossier
  d'escale, dépouillement, PV de réconciliation, devis, consignataire).
- Densité de données assumée mais hiérarchisée : c'est un outil de travail quotidien.
- Statuts omniprésents sous forme de badges colorés cohérents dans toute l'app.
- Montants toujours en **FCFA**, format `17 632 FCFA` (espace comme séparateur de milliers).
- Accessibilité WCAG AA (contrastes vérifiés sur le bleu `#1D3E9C`), responsive desktop-first
  (poste de travail agent), utilisable sur tablette.
- Pas de mode sombre en phase 1 ; lumière institutionnelle, ombres légères, coins arrondis
  modérés (6–8 px).
