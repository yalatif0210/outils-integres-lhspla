# LHSPLA-TA — Guide Développeur (Backend)

API REST NestJS pour l'Outil Intégré LHSPLA — Projet USAID NPSP-CI, Côte d'Ivoire.

---

## Prérequis

| Outil | Version |
|-------|---------|
| Node.js | 20+ |
| PostgreSQL | 14+ |
| npm | 10+ |

---

## Installation

```bash
npm install
```

## Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/lhspla_db"
JWT_SECRET="votre_secret_jwt_tres_long"
JWT_REFRESH_SECRET="votre_secret_refresh_jwt"
MAIL_HOST="smtp.example.com"
MAIL_PORT=587
MAIL_USER="notifications@npsp.ci"
MAIL_PASS="mot_de_passe_smtp"
MAIL_FROM="LHSPLA <notifications@npsp.ci>"
PORT=3000
```

> La connexion Prisma est configurée dans `prisma/prisma.config.ts` (pas dans `schema.prisma`).

## Démarrage

```bash
# Développement (watch mode)
npm run start:dev

# Production
npm run start:prod
```

API disponible sur : http://localhost:3000/api

---

## Base de données

### Migrations

```bash
# Appliquer toutes les migrations en attente
npx prisma migrate deploy

# Créer une nouvelle migration (après modification du schema)
npx prisma migrate dev --name nom_de_la_migration

# Régénérer le client Prisma (après toute modification du schema)
npx prisma generate
```

### Seed (données initiales)

```bash
npm run db:seed
```

Crée les comptes par défaut :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| super_admin | superadmin@npsp.ci | SuperAdmin@LHSPLA2026 |
| admin_system | admin@npsp.ci | Admin@LHSPLA2026 |
| chief_of_party | cop@npsp.ci | COP@LHSPLA2026 |
| entity_member (SE) | c.lebri@npsp.ci | MEL@LHSPLA2026 |

> Le seed est idempotent (upsert) — sûr à relancer.

### Seed personnel missions

Après démarrage, appeler via l'interface (super_admin) ou via curl :
```bash
curl -X POST http://localhost:3000/api/personnel/seed \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Architecture

```
src/
├── app.module.ts              ← Point d'entrée — tous les modules importés
├── auth/                      ← Login, refresh token, JWT strategy
├── users/                     ← CRUD utilisateurs + règle super_admin
├── weeks/                     ← Gestion des semaines de bulletins
├── submissions/               ← Saisie entités + verrouillage sections
├── dashboard/                 ← Statistiques admin + entité
├── notifications/             ← In-app + email (nodemailer)
├── cron/                      ← Jobs planifiés (voir ci-dessous)
├── app-config/                ← Paramètres globaux (taux de change, etc.)
├── activity-references/       ← Références activités NPSP-CI
├── risk-categories/           ← Catégories de risques
├── financing-funds/           ← Fonds de financement (USAID, etc.)
├── budget-projects/           ← Budgets (CRUD + workflow approval)
├── budget-recalls/            ← Rappels & pièces justificatives
├── cost-items/                ← Grille de coûts (159 postes)
├── personnel/                 ← Table agents pour missions (distinct de User)
├── missions/                  ← Demandes de mission + ordres de mission
├── common/
│   ├── guards/                ← JwtAuthGuard, RolesGuard
│   └── decorators/            ← @Roles()
└── prisma/
    ├── prisma.service.ts
    ├── prisma.config.ts       ← Configuration adapter-pg
    └── migrations/
```

### Jobs CRON (`cron/cron.service.ts`)

| Heure | Job |
|-------|-----|
| Lundi 08:00 WAT | Envoi rappels de soumission (entités en retard) |
| Toutes les heures | Nettoyage verrous de section expirés |
| Quotidien 06:00 WAT | Auto-complétion missions (returnDate dépassée) |

---

## Modules & endpoints principaux

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Login → accessToken + refreshToken |
| POST | `/api/auth/refresh` | Renouveler le token |
| GET | `/api/auth/me` | Infos utilisateur connecté |

### Personnel (module missions)
| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| GET | `/api/personnel` | tous | Liste (+ inactifs si `?includeInactive=true`) |
| POST | `/api/personnel` | admin/assistant_direction | Créer agent |
| PATCH | `/api/personnel/:id` | admin/assistant_direction | Modifier |
| DELETE | `/api/personnel/:id` | super_admin/admin_system | Supprimer (soft) |
| PUT | `/api/personnel/reorder` | admin/assistant_direction | Réordonner |
| POST | `/api/personnel/seed` | super_admin | Importer agents NPSP-CI |

### Missions
| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| GET | `/api/missions` | tous | Liste (filtrée par rôle) |
| POST | `/api/missions` | tous | Créer DM (statut draft) |
| GET | `/api/missions/:id` | tous | Détail |
| PATCH | `/api/missions/:id` | initiateur (draft) | Modifier |
| POST | `/api/missions/:id/submit` | entity_member/COP/super_admin | Soumettre |
| POST | `/api/missions/:id/transmit` | assistant_direction/super_admin | Transmettre au COP |
| POST | `/api/missions/:id/cop-review` | COP/super_admin | Valider `{decision:"cop_approved"}` ou rejeter `{decision:"cancelled"}` |
| POST | `/api/missions/:id/generate-docs` | assistant_direction/super_admin | Générer DM+ODM → pending_dg |
| POST | `/api/missions/:id/validate-dg` | assistant_direction/super_admin | Valider DG → in_progress |
| POST | `/api/missions/:id/cancel` | initiateur(draft) / staff | Annuler |

### Budgets
| Méthode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/api/budget-projects` | Liste / Créer |
| GET/PATCH/DELETE | `/api/budget-projects/:id` | Détail / Modifier / Supprimer |
| POST | `/api/budget-projects/:id/submit` | Soumettre au TPM |
| POST | `/api/budget-projects/:id/tpm-review` | Vérification TPM `{decision:"tpm_approved"\|"rejected"}` |
| POST | `/api/budget-projects/:id/cop-review` | Validation COP `{decision:"approved"\|"rejected"}` |

---

## Workflow Demande de Mission

```
Création (draft)
  → [entity_member soumet] → pending_cop
  → [assistant_direction transmet] → [COP dans formulaire review]
  → cop_approved OU cancelled (rejet)
  → [assistant_direction génère docs] → pending_dg
  → [assistant_direction valide DG] → in_progress
  → [CRON 06h00 : returnDate < today] → completed

COP initiateur : saute pending_cop → direct cop_approved
```

---

## Authentification

JWT Bearer Token. Le token doit être envoyé dans le header :
```
Authorization: Bearer <accessToken>
```

Durée de vie : 15 minutes (accessToken) / 7 jours (refreshToken).

---

## Rôles (enum Prisma)

```typescript
enum Role {
  super_admin        // Tout
  admin_system       // Gestion + personnel missions
  admin_finance      // Grille coûts + clôture rappels
  admin_tpm          // Vérification budgets étape 1
  chief_of_party     // Validation budgets + missions
  entity_member      // Saisie bulletin + budgets + missions
  assistant_direction // Workflow missions DM/ODM + personnel
}
```

---

## Fichiers uploadés

Stockés dans `uploads/recalls/{recallId}/{timestamp}_{filename}`.
Servis via `/uploads` (endpoint sécurisé JWT).
