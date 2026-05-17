# LHSPLA API — Guide de démarrage

## Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Installation

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env
# Remplir les valeurs dans .env (DATABASE_URL, JWT_SECRET, MAIL_*)

# 2. Installer les dépendances
npm install

# 3. Générer le client Prisma
npx prisma generate

# 4. Créer la base de données et appliquer les migrations
npx prisma migrate dev --name init

# 5. Initialiser les données (admin + COP + MEL Manager)
npm run db:seed

# 6. Démarrer en développement
npm run start:dev
```

## Comptes par défaut (seed)
| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin Système | admin@npsp.ci | Admin@LHSPLA2026 |
| Chief of Party | cop@npsp.ci | COP@LHSPLA2026 |
| MEL Manager (SE) | c.lebri@npsp.ci | MEL@LHSPLA2026 |

**⚠️ Changer tous les mots de passe en production**

## Endpoints principaux
- `POST /api/auth/login` — connexion
- `GET  /api/auth/me` — profil utilisateur
- `GET  /api/weeks` — liste des semaines
- `POST /api/weeks` — créer une semaine (admin)
- `GET  /api/weeks/:id/submissions/:entityCode` — saisie entité
- `GET  /api/dashboard/admin/overview` — tableau de bord admin
- `GET  /api/dashboard/my-entity` — tableau de bord entité
- `GET  /api/notifications` — notifications utilisateur

## Déploiement Railway
```bash
railway login
railway new
railway add --database postgresql
railway up
railway run npx prisma migrate deploy
railway run npm run db:seed
```
