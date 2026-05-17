# LHSPLA-TA — Guide de démarrage complet
**Bulletin Hebdomadaire · NPSP-CI · FY2026**

---

## Structure du projet

```
C:/DEV_APP_LAB/Angular_lab/
├── lhspla-api/           ← Backend NestJS + Prisma 7 + PostgreSQL (port 3000)
└── lhspla-bulletin/      ← Frontend Angular 19 (port 4201)
```

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |

---

## 1. Configuration de l'environnement

Le fichier `.env` est dans `lhspla-api/`. Il est déjà configuré pour l'environnement local.

```
C:/DEV_APP_LAB/Angular_lab/lhspla-api/.env
```

Variables clés :
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lhspla_bulletin?schema=public"
JWT_SECRET="votre-secret-min-32-caracteres"
MAIL_HOST="smtp.gmail.com"
MAIL_USER="votre-email@gmail.com"
MAIL_PASS="votre-mot-de-passe-app"
FRONTEND_URL="http://localhost:4201"
```

> **Note Prisma 7 :** L'URL de la base de données est dans `prisma.config.ts` (généré automatiquement), **pas** dans `schema.prisma`. Ne pas ajouter `url` dans le bloc `datasource` du schéma.

---

## 2. Migrations de base de données

```bash
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api

# Créer/mettre à jour les tables PostgreSQL
npx prisma migrate dev --name init
```

> **Si vous modifiez le schéma Prisma plus tard :**
> ```bash
> npx prisma migrate dev --name description_du_changement
> ```

---

## 3. Seed — Données initiales

```bash
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api

npm run db:seed
```

### Comptes créés par le seed

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin Système | `admin@npsp.ci` | `Admin@LHSPLA2026` |
| Chief of Party | `cop@npsp.ci` | `COP@LHSPLA2026` |
| MEL Manager (SE) | `c.lebri@npsp.ci` | `MEL@LHSPLA2026` |

> ⚠️ **Changer tous les mots de passe en production**

---

## 4. Démarrer l'application

Ouvrir **deux terminaux** :

### Terminal 1 — Backend API
```bash
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api
npm run start:dev
```
→ API disponible sur **http://localhost:3000/api**

### Terminal 2 — Frontend Angular
```bash
cd C:/DEV_APP_LAB/Angular_lab/lhspla-bulletin
npx ng serve --port 4201
```
→ Application disponible sur **http://localhost:4201**

---

## 5. Outils utiles

```bash
# Visualiser la base de données dans le navigateur
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api
npm run db:studio
# → Prisma Studio sur http://localhost:5555

# Build production frontend
cd C:/DEV_APP_LAB/Angular_lab/lhspla-bulletin
npx ng build --configuration=production

# Build production backend
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api
npm run build
node dist/src/main.js
```

---

## 6. Rôles et accès

| Rôle | Créer semaine | Saisir | Lire tout | Dashboard admin | Gestion users |
|------|:---:|:---:|:---:|:---:|:---:|
| `admin_system` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chief_of_party` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `entity_member` | ❌ | ✅ (sa propre entité) | lecture seule | ❌ | ❌ |

### Redirections après connexion

| Rôle | Page de destination |
|------|---------------------|
| `admin_system` | `/home` |
| `chief_of_party` | `/home` |
| `entity_member` | `/entity/:code` (son entité) |

---

## 7. Entités

| Code | Nom complet |
|------|-------------|
| CAD | Chaîne d'Approvisionnement Décentralisée |
| CAC | Chaîne d'Approvisionnement Communautaire |
| PMO | Gestion de Projet |
| QAD | Quantification Achat et Distribution |
| SE | Suivi & Évaluation (MEL) |
| SI | Système d'Information |
| FINANCES | Service Finances |
| COM | Service Communication |

---

## 8. Fonctionnalités clés

### Gestion des semaines
- Plusieurs semaines peuvent être actives simultanément
- États : `active` → `closed` (rouvrable par l'admin)
- La création d'une semaine génère automatiquement 8 soumissions (une par entité)
- Deadline hebdomadaire : **lundi 9h00** (heure Abidjan)

### Formulaire de saisie (entity_member) — modèle SharePoint
- **Verrous consultatifs** (advisory locks) : pas de bouton "Modifier" obligatoire
  - Les champs sont toujours éditables pour les membres de l'entité
  - Un indicateur de présence montre qui édite quelle section (polling 15 s)
  - Le backend acquiert/renouvelle le verrou automatiquement à chaque sauvegarde
- **Auto-save** : déclenchement 3 s après chaque frappe, sans condition de verrou
- **Soumission** : flush immédiat + statut `submitted`
- Mode **lecture seule** automatique pour admin/COP et après soumission
- **Réouverture** (admin uniquement) : bouton "Réouvrir pour modification" remet le statut en `draft`

### Gestion des semaines (admin-weeks)
- Semaines actives : détail par entité (statut, bouton "Réouvrir saisie", lien "Consulter")
- **Réouverture de soumission** : l'admin peut remettre une soumission `submitted` en `draft`
- Semaines clôturées : **filtre mois → semaine en cascade** + pagination (25 par page)
- Libellé de semaine auto-généré depuis les dates (ex. `S16 - 14 au 18 avr 2026`)

### Compilation
- **Filtre mois → semaine en cascade** : sélectionner d'abord le mois, puis la semaine
- Chargement des 8 entités en parallèle (`forkJoin`)
- Onglets : Activités réalisées / Planifiées / Points de vigilance
- **Export PDF** : `window.print()` avec CSS print (mise en page A4, entêtes figés)
- **Export Excel** : SheetJS (`xlsx`) — 4 feuilles : Activités B, Planifiées C, Vigilance D, Synthèse
  - Installer : `npm install xlsx` dans `lhspla-bulletin/`
  - Nom du fichier : `Compilation_<weekReference>.xlsx`

### Tableaux de bord
- **Admin/COP** : heatmap soumissions, taux de soumission (trend), risques (stacked bar), comparaison entités, alertes risques critiques
- **Entité** : KPIs, tendance activités, ponctualité (délai en heures), tendance risques, historique complet

### Notifications
- In-app : cloche avec badge non lus, mark-as-read individuel et global
- Email (nodemailer) : rappels retardataires, alertes risques critiques
- **Cron** : chaque lundi 8h00 Abidjan → envoi automatique des rappels

---

## 9. Architecture technique

### Backend (`lhspla-api/`)
```
src/
├── auth/          ← JWT (access 15min + refresh 7j), bcrypt
├── users/         ← CRUD, toggle actif, changement mot de passe
├── weeks/         ← Création, clôture, réouverture
├── submissions/   ← Saisie par section, verrouillage, soumission
├── dashboard/     ← KPIs admin + entité
├── notifications/ ← In-app + email
├── cron/          ← Rappels lundi 8h00, nettoyage verrous expirés
└── prisma/        ← PrismaService avec adapter @prisma/adapter-pg
```

**Modèles Prisma principaux :**
- `User` — email, rôle, entité, hash mot de passe
- `Week` — weekStart, weekEnd, weekReference, status
- `EntitySubmission` — responsible, status (draft/submitted), submittedAt
- `Activity` / `PlannedActivity` / `RiskPoint` — données des sections B/C/D
- `SectionLock` — userId, section, expiresAt (TTL 10 min)
- `Notification` — userId, type, message, isRead

### Frontend (`lhspla-bulletin/`)
```
src/app/
├── models/        ← Interfaces TypeScript + factory functions + ENTITIES
├── services/
│   ├── api.service.ts      ← Tous les appels HTTP backend
│   └── auth.service.ts     ← Signals : currentUser, isAdmin, isCOP...
├── interceptors/  ← JWT Bearer auto + refresh token sur 401
├── guards/        ← authGuard, adminGuard, adminOrCOPGuard
├── components/
│   ├── login/              ← Formulaire + redirect par rôle
│   ├── navbar/             ← Menu entités, admin, notifications, user
│   ├── home/               ← Dashboard semaines + grille entités
│   ├── entity-form/        ← Saisie sections A/B/C/D + verrous
│   ├── compilation/        ← Vue agrégée multi-semaines
│   ├── admin-dashboard/    ← ECharts : heatmap, trends, comparaison
│   ├── entity-dashboard/   ← ECharts : activités, ponctualité, risques
│   ├── admin-users/        ← CRUD utilisateurs
│   ├── admin-weeks/        ← Création/clôture/réouverture semaines
│   ├── notifications/      ← Panel cloche avec badge
│   └── profile/            ← Infos + changement mot de passe
└── environments/  ← apiUrl: http://localhost:3000/api
```

**Dépendances notables :**
- `@angular/material` — composants UI (MatPaginator sur toutes les listes)
- `ngx-echarts` v21 — graphiques (via `provideEchartsCore`)
- `xlsx` (SheetJS) — export Excel dans la compilation
- `@nestjs/schedule` — cron jobs
- `nodemailer` — envoi d'emails
- `@prisma/adapter-pg` + `pg` — requis par Prisma 7

---

## 10. Déploiement Railway (production)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Créer le projet et la base PostgreSQL
railway new
railway add --database postgresql

# Déployer le backend
cd C:/DEV_APP_LAB/Angular_lab/lhspla-api
railway up

# Appliquer les migrations en production
railway run npx prisma migrate deploy

# Lancer le seed en production
railway run npm run db:seed
```

> Pour le frontend, builder localement et héberger le dossier `dist/` sur Vercel, Netlify ou Railway Static.
> Mettre à jour `FRONTEND_URL` dans les variables d'environnement Railway et `apiUrl` dans `src/environments/environment.prod.ts`.

---

*LHSPLA-TA | NPSP-CI | Préparé par Charles Oscar LEBRI, MEL Manager | FY2026*
