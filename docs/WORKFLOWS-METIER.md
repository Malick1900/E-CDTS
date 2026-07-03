# Workflows métier e-CDTS (d'après le CDC)

> Source : cahier des charges CGC, restitué par le porteur du projet le 2026-07-02.
> ⚠️ Caveat d'origine : dans le CDC, les blocs « Processus » des workflows 4 à 8 sont des copier-coller du même modèle. Chaque workflow est décrit ici par sa **vraie finalité**, pas par le texte recopié.

## Acteurs

| Famille | Acteur | Rôle |
|---|---|---|
| Interne CGC | Agent Régulation / Technicien Logistique et Transport | Saisit la conférence portuaire, traite les dossiers |
| Interne CGC | Chef de Service Régulation | Valide la nomenclature, génère le PV de réconciliation |
| Interne CGC | Contrôleur | Vérifications de clôture (BIETC, sorties) |
| Interne CGC | Administrateur CGC | Crée les comptes des acteurs externes |
| Interne CGC | Direction Financière et Comptable (DAF) | Établit la facture CDTS (**hors application**) |
| Interne CGC | Service recouvrement | Suit les règlements |
| Externe | Consignataire | Gère ses agents, affecte les armements, reçoit les factures |
| Externe | Agent consignataire | Ouvre les dossiers d'escale, téléverse les manifestes, valide la nomenclature, saisit les infos de règlement |
| Partenaire portuaire | Capitainerie | Tient la conférence portuaire quotidienne (11h) — pas forcément utilisateur de l'app |
| Partenaire portuaire | OPRAG | Consulte la situation portuaire |
| — | Système (e-CDTS) | Vérifie, propose, agrège, génère |

**Règles transverses confirmées (2026-07-02)** :
- Les rôles internes CGC sont **distincts dans l'application, avec cumul possible** (un même compte peut porter plusieurs rôles).
- Un agent consignataire appartient à **une seule** société consignataire.
- La nature exacte du « compte consignataire » (entité seule ou compte opérant) est **en attente CGC** (Q14), de même que les règles d'affectation armements ↔ agents (Q15).

## Les 8 workflows

### WF1 — Inscription (§6.2.1 & 6.2.2)
Création des comptes externes, **uniquement par le CGC** (pas d'auto-inscription). L'Administrateur CGC crée le compte ; le système génère les identifiants, envoyés par mail ; changement de mot de passe obligatoire à la première connexion. Le consignataire transmet la liste de ses agents, **affecte les armements à chacun**, et active/désactive ses agents.

### WF2 — Conférence portuaire (§6.2.3)
Centralise chaque jour (conférence Capitainerie à 11h) l'état des mouvements des navires : **en rade, à quai, en départ**. L'Agent CGC (Régulation) saisit ETA, ETD, nom du navire, statut. Le système vérifie la cohérence (doublons, conflits de poste), publie la **situation portuaire**, garde l'historique. **C'est la référence qui conditionne la facturation** (un navire doit être déclaré à quai ou sorti).

### WF3 — Ouverture du dossier d'escale (§6.2.4)
L'agent consignataire ouvre un **dossier d'escale** pour un voyage (navire + armement). Le dossier reste « ouvert » tant que la date à quai/sortie n'est pas confirmée par la situation portuaire. Tableau de bord des dossiers + alertes d'incohérence.

### WF4 — Transmission du manifeste (§6.2.5)
L'agent consignataire sélectionne le dossier et téléverse le manifeste : **XML** ; saisie ligne par ligne + PDF pour les consignataires sans format. **Les deux modes d'entrée sont dans la phase 1** (confirmé 2026-07-02). Le système contrôle la conformité (champs requis, formats). États du manifeste : **soumis, en validation, validé, transmis**.

### WF5 — Dépouillement & PV de réconciliation (§6.2.6) — le cœur du projet
1. **Système** : détermine le conditionnement, agrège les produits, **propose le passage à la nomenclature CGC** (cf. ADR-0004).
2. **Agent consignataire** : confirme/valide ligne par ligne au regard de la nomenclature.
3. **CGC** (agent traitant / Chef de Service Régulation) : valide à son tour et **génère le PV de réconciliation** = accord contradictoire sur quantités/catégories.

### WF6 — Facturation (§6.2.7)
⚠️ **La facture est établie par la DAF, hors périmètre applicatif.** L'app ne fait que recevoir/héberger la facture : un Agent CGC la téléverse dans le dossier du consignataire, qui la consulte.

### WF7 — Règlement (§6.2.8)
⚠️ **Le paiement se fait hors application.** L'agent consignataire saisit le mode de règlement, le montant, la référence. Le Service recouvrement suit.

### WF8 — Clôture du dossier (§6.2.9)
Réservée au CGC. L'Agent CGC / Contrôleur vérifie que **tous les BL sont couverts par un BIETC**, que les cargaisons sont sorties (imports), référence le dossier dans la situation portuaire, puis clôture. **Seul le CGC peut clôturer.**

## Points ouverts (cadrage en cours)
> Les questions en attente de réponse CGC sont centralisées dans `QUESTIONS-CGC.md` (calcul CDTS/devis, BIETC, barème).
