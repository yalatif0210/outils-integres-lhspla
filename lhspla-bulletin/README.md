# LHSPLA-TA — Manuel Utilisateur

Outil Intégré de Reporting et Gestion — Projet USAID NPSP-CI, Côte d'Ivoire.

---

## Démarrage rapide (développeurs)

```bash
# Lancer le frontend
npx ng serve --port 4201
# → http://localhost:4201

# Lancer le backend (dans lhspla-api/)
npm run start:dev
# → http://localhost:3000/api
```

---

## Présentation

L'application LHSPLA-TA remplace plusieurs fichiers Excel par un outil web centralisé :

| Fichier remplacé | Module |
|-----------------|--------|
| Canevas Bulletin LHSPLA.xlsx | Bulletin hebdomadaire |
| Template Budget.xlsx | Budgets & dépenses |
| Template demande de mission.xlsx | Demandes de Mission / ODM |

---

## Comptes de connexion (environnement de développement)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Super Admin | superadmin@npsp.ci | SuperAdmin@LHSPLA2026 |
| Admin Système | admin@npsp.ci | Admin@LHSPLA2026 |
| Chief of Party | cop@npsp.ci | COP@LHSPLA2026 |
| Membre Entité (SE) | c.lebri@npsp.ci | MEL@LHSPLA2026 |

---

## Rôles et accès

### Super Admin
- Accès complet à toutes les fonctionnalités
- Seul à pouvoir créer un autre Super Admin
- Peut initialiser la liste du personnel (`Admin → Gestion du personnel → Initialiser`)

### Admin Système
- Gestion des utilisateurs, semaines, paramètres
- Gestion du personnel missions
- Peut annuler toute demande de mission

### Admin Finance
- Gestion de la grille de coûts (159 postes budgétaires)
- Clôture des rappels & justificatifs
- Consultation de tous les budgets

### Admin TPM
- Vérification des budgets (étape 1 du cycle d'approbation)

### Chief of Party (COP)
- Validation finale des budgets
- Validation / rejet des demandes de mission
- Peut créer ses propres demandes de mission (circuit accéléré)

### Assistant(e) Direction
- Réception et transmission des demandes de mission au COP
- Génération des documents DM et ODM (PDF + Word)
- Marquage "Validé par le DG"
- Administration de la liste du personnel

### Membre Entité
- Saisie du bulletin hebdomadaire (section par entité)
- Création et soumission de budgets
- Création de demandes de mission

---

## Module 1 — Bulletin Hebdomadaire

### Workflow
1. L'Admin Système crée une semaine (`Admin → Gestion des semaines → Nouvelle semaine`)
2. Chaque entité saisit son bulletin dans `Entités → [nom de l'entité]`
3. Sections disponibles : Activités réalisées, Planification, Risques & vigilance
4. Bouton **Soumettre** envoie le bulletin pour compilation
5. L'admin peut **Rouvrir** un bulletin soumis si correction nécessaire

### Verrouillage
Une section ne peut être éditée que par une personne à la fois (verrou de 10 min, renouvelé automatiquement).

### Compilation
`Compilation` (accès admin/COP) — affiche tous les bulletins en vue consolidée, imprimable.

---

## Module 2 — Budgets

### Cycle d'approbation

```
Création (Brouillon)
  → [Membre Entité soumet]
  → Soumis → Vérification Admin TPM
  → Approuvé TPM → Validation Chef de Parti
  → Approuvé (ou Rejeté → retour Brouillon)
```

### Créer un budget
1. `Budgets → Nouvelle demande`
2. Choisir le type (Atelier, Achat fournitures, Mission terrain, Appuis, Contractualisation)
3. Sélectionner le fonds de financement
4. Renseigner le taux de change FCFA/USD
5. Remplir les lignes de dépenses (désignation depuis la grille, quantité, fréquence)
6. Cliquer **Soumettre**

### Notes importantes
- La désignation se choisit dans la liste déroulante — **aucune saisie libre**
- Le coût unitaire est automatique (prérempli depuis la grille de coûts)
- Seules les lignes avec quantité ET fréquence renseignées sont enregistrées
- En mode consultation, les lignes à zéro sont masquées automatiquement

### Export
- **Excel** : disponible sur tout budget
- **PDF** : disponible uniquement sur budgets approuvés

### Rappels & Justificatifs
Après approbation, l'entité peut attacher des pièces justificatives pour des postes spécifiques.
(`Budgets → [ouvrir le budget] → section Rappels`)

---

## Module 3 — Demandes de Mission / ODM

### Qui peut créer une demande de mission ?
Tous les utilisateurs connectés (`Missions → Nouvelle demande`).

### Workflow complet

| Étape | Acteur | Action |
|-------|--------|--------|
| 1 | Membre Entité / COP | Créer la demande (brouillon) |
| 2 | Membre Entité / COP | Soumettre la demande |
| 3 | Assistant(e) Direction | Transmettre au COP (si soumis par Membre Entité) |
| 4 | Chief of Party | Valider ou rejeter dans le formulaire |
| 5 | Assistant(e) Direction | Cliquer **Générer documents** → crée DM + ODM |
| 6 | Assistant(e) Direction | Imprimer + faire signer physiquement par le DG |
| 7 | Assistant(e) Direction | Cliquer **Validé par le DG** → mission en cours |
| — | Automatique | À la date de retour dépassée → mission terminée |

> **Cas spécial COP :** Si c'est le COP lui-même qui crée et soumet, l'étape de validation COP est sautée (direct cop_approved).

### Statuts affichés

| Couleur | Statut | Signification |
|---------|--------|---------------|
| Gris | Brouillon | En cours de rédaction |
| Orange | En attente COP | Soumise, attend transmission |
| Vert clair | Approuvé COP | Validée par le COP |
| Bleu | En attente DG | Documents générés |
| Violet | En cours | Mission démarrée (DG signé) |
| Vert foncé | Terminée | Retour effectué |
| Rouge | Annulée | Rejetée ou annulée manuellement |

### Participants
Sélectionner les agents parmi la liste du personnel NPSP-CI (liste administrable dans `Admin → Gestion du personnel`).

---

## Module 4 — Administration du Personnel (Missions)

Accessible à : Admin Système, Admin Général, Assistant(e) Direction.

`Admin → Gestion du personnel`

- Visualiser tous les agents actifs/inactifs
- Ajouter / modifier un agent (nom, service, fonction, n° Wave, email)
- Activer / désactiver un agent
- **Initialiser** : bouton de seed pour importer les 30 agents NPSP-CI (Super Admin uniquement, si liste vide)

---

## Navigation par rôle

### Membre Entité
- Accueil → bulletin de son entité
- Budgets → ses budgets
- Missions → ses demandes de mission

### Chief of Party
- Tout ce qu'un Membre Entité voit
- Compilation
- Dashboard admin
- Missions → toutes les missions (actions de validation)

### Assistant(e) Direction
- Menu **Direction** : Demandes de mission · Gestion du personnel · Budgets

### Admin Système
- Menu **Admin** : Utilisateurs · Semaines · Personnel · Rappels · Paramètres

---

## Notifications

Les notifications in-app apparaissent dans la cloche en haut à droite de la barre de navigation.

Événements notifiés :
- Nouveau bulletin soumis (admin)
- Rappel du lundi pour soumissions en retard
- Budget soumis / approuvé / rejeté
- Demande de mission soumise / transmise / approuvée / rejetée / générée
- Mission terminée automatiquement

---

## Support

Pour tout problème technique, contacter l'administrateur système LHSPLA-TA.
