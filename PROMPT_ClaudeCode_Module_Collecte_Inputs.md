# Prompt pour Claude Code — Module « Collecte des inputs par entité » (LHSPLA / proposition GHSD)

> **Comment utiliser ce fichier :** place-le à la racine de `D:\outils-integres-lhspla`, ouvre le projet dans VS Code, puis demande à Claude Code de lire ce fichier et de l'exécuter. Le prompt lui demande **d'abord d'inspecter l'existant**, puis de te proposer un plan avant de coder.

---

## 0. Contexte métier (à ne pas perdre de vue)

La NPSP-CI répond à un appel à projets du Département d'État américain (GHSD, Assistance Listing 19.046, échéance **14 juillet 2026**). Une **proposition narrative de référence** (le « Livrable B ») a été rédigée et **validée par le Chief of Party**. Elle couvre 4 objectifs et répartit les activités entre **7 entités** du projet : **QAD** (Quantification-Achat-Distribution), **CAD** (Chaîne d'Approvisionnement Décentralisée), **CAC** (Chaîne d'Approvisionnement Communautaire), **S&E** (Suivi & Évaluation), **SI** (Systèmes d'Information), **COM** (Communication), **PMO** (Project Management Office).

**But du module :** afficher cette proposition validée comme **socle de référence en lecture seule**, et permettre à chaque entité, une fois connectée, de **proposer des inputs structurés axe par axe**. Le **PMO consolide** ensuite. L'objectif final est d'alimenter la proposition finale (qui, elle, sera soumise en anglais — hors périmètre de ce module).

**Nature de la finalité :** collecte structurée + export. **Ce n'est PAS un éditeur de document** ni un générateur de la proposition finale. On collecte, on consolide, on exporte.

---

## 1. Décisions déjà prises (contraintes fermes)

- **Application séparée** de l'app principale, servie par **Nginx** sur sa propre route. L'app principale y accède via **un simple bouton/lien de redirection** (pas d'intégration intra-projet).
- **Stack :** **Angular 17+ (standalone components)** en front, **NestJS** en back, **PostgreSQL** en base. Le tout **dockerisé** et intégré au `docker-compose` / à la configuration Nginx existants.
- **Accès collaboratif ouvert :** tout utilisateur authentifié **voit et édite tout**. Pas de cloisonnement dur par entité. **MAIS** chaque input doit être **attribué** (entité + utilisateur + horodatage) et **traçable** (historique des modifications), pour que l'édition ouverte reste gouvernable.
- **Authentification : réutiliser l'auth JWT existante en SSO.** L'utilisateur déjà connecté sur l'app principale ne doit pas se reconnecter.

---

## 2. PREMIÈRE ÉTAPE OBLIGATOIRE — inspecter l'existant avant de coder

Avant d'écrire la moindre ligne, **explore le dépôt** `D:\outils-integres-lhspla` et **rends compte** de :

1. **Auth / JWT :** où et comment les tokens sont émis et validés ; l'algorithme de signature (HS256 ? RS256 ?) ; le **secret ou la clé publique** ; la **structure des claims** (où se trouve l'identité utilisateur, et existe-t-il déjà une notion d'« entité »/service/département dans le token ou en base ?).
2. **Structure du projet :** mono-repo ou dépôts séparés front/back ? emplacement des `Dockerfile`, du `docker-compose.yml`, de la **config Nginx** (pour savoir comment ajouter une route/‌service).
3. **Conventions :** style de code, ORM éventuel (Prisma ? TypeORM ?), gestion des migrations, variables d'environnement, port(s) déjà utilisés.
4. **Front principal :** version d'Angular confirmée, structure de navigation, où insérer le **bouton de redirection** vers le module.

**Puis propose-moi un plan d'implémentation et attends ma validation avant de coder.** Si un élément d'auth est introuvable ou ambigu, **signale-le explicitement** et propose l'option de repli (voir §4).

---

## 3. Le socle de référence : contenu du Livrable B à intégrer

Le module doit afficher la proposition validée comme référence en lecture seule, **structurée selon les rubriques imposées de la NOFO**, et c'est **sur ces axes** que les entités contribuent.

**Rubriques (axes de contribution) :**
1. Proposal Summary
2. Introduction to the Organization
3. Problem Statement
4. Project Goal and Objectives (Objectifs 1 à 4)
5. Project Activities (sous-sections 5.1 à 5.5, chacune rattachée à une ou plusieurs entités)
6. Project Methods and Design (modèle logique)
7. Milestone Plan
8. Monitoring & Evaluation Plan
9. Future Funding / Sustainability
10. Project Partners
11. Risk Analysis / Security Plan

**Rattachement entité ↔ axe (à titre indicatif, modifiable en base) :**
- QAD → Activities 5.1, 5.2 ; Milestones ; Objectif 1 & 2
- CAD → Activities 5.2 (dernier kilomètre), 5.3 ; Objectif 2 & 3
- CAC → Activities 5.5 ; Objectif 3
- S&E → Monitoring & Evaluation ; Objectif 1
- SI → Activities 5.3 ; Methods & Design ; Objectif 3
- COM → Activities 5.5 (mobilisation, branding)
- PMO → Activities 5.4 ; Sustainability ; Risk/Security ; Objectif 4

> **Important :** le texte intégral et validé du Livrable B sera fourni séparément (fichier `.docx` ou `.md`). **Prévois un mécanisme de seed** (script d'amorçage de la base) qui charge ce contenu de référence, plutôt que de le coder en dur. Structure la donnée pour qu'un rafraîchissement du texte de référence soit trivial.

---

## 4. Authentification — spécification paramétrable

Implémente le SSO en **réutilisant le JWT de l'app principale** :

- Le module **valide** le token entrant avec **le même secret / la même clé** que l'app principale (à lire dans l'existant, à externaliser en variable d'environnement `JWT_SECRET` / `JWT_PUBLIC_KEY`).
- Récupère l'identité et, si présent, le champ **entité** depuis les claims. **Rends configurable le nom du claim** (`JWT_ENTITY_CLAIM`, ex. `entity`, `service`, `department`).
- **Si le token ne contient pas d'entité :** au premier accès, l'utilisateur **sélectionne son entité** (QAD/CAD/CAC/S&E/SI/COM/PMO) dans une liste ; ce choix est mémorisé (en base, lié à son identifiant utilisateur).
- **Repli (fallback) explicite :** si l'intégration SSO s'avère impossible dans les délais, prévois un **mini-login autonome** activable par variable d'environnement (`AUTH_MODE=sso|standalone`). Ne l'active pas par défaut.

**Sécurité minimale :** valider la signature ET l'expiration du token ; ne jamais loguer le token ; garder les guards NestJS sur toutes les routes d'écriture.

---

## 5. Modèle de données (PostgreSQL) — proposition, à affiner selon l'ORM existant

Réutilise l'ORM déjà en place dans le projet (Prisma ou TypeORM). Entités suggérées :

- **`entity`** : les 7 entités (code, libellé). Table de référence, seedée.
- **`reference_section`** : les axes/rubriques du Livrable B (numéro, titre, texte de référence en lecture seule, objectif rattaché, ordre d'affichage).
- **`app_user`** : miroir léger de l'utilisateur (id issu du JWT, nom, entité choisie/déduite). Pas de mot de passe si SSO.
- **`input`** : la contribution structurée. Champs : `id`, `reference_section_id` (l'axe), `entity_id` (entité contributrice), `author_user_id`, `type` (`activity` | `indicator` | `milestone` | `comment` | `risk`), `title`, `content` (texte riche), champs structurés optionnels (`means`/intrant, `output`/extrant, `verification_method`, `target_value`, `due_month`), `status` (`draft` | `submitted` | `retained` | `rejected`), `created_at`, `updated_at`.
- **`input_revision`** : historique (qui a modifié quoi, quand) — indispensable vu l'édition ouverte.

> **Input structuré, pas juste un commentaire.** Le type `activity` doit refléter le format de la proposition (activité / intrant / extrant / jalon / indicateur), pour que la consolidation soit directement réutilisable.

---

## 6. Fonctionnalités du module (périmètre)

**Front (Angular 17+, standalone) :**
1. **Vue « Socle de référence »** : la proposition validée, navigable par axe/rubrique, en lecture seule, bien mise en forme.
2. **Vue « Contribuer »** : pour un axe donné, le texte de référence à gauche, et le formulaire d'input structuré à droite (choix du type, champs adaptés au type). Édition ouverte à tous, chaque contribution attribuée à son entité/auteur.
3. **Vue « Consolidation » (PMO)** : tableau filtrable par axe / entité / type / statut ; permet de marquer un input `retained`/`rejected` ; compteur de contributions par axe et par entité.
4. **Export** : générer un export **par axe** et **global** (au minimum **Word .docx** et **Excel .xlsx** ; JSON en bonus) reprenant les inputs retenus, prêt pour consolidation par le PMO.
5. **Traçabilité** : sur chaque input, afficher auteur, entité, date, et l'historique des révisions.

**Back (NestJS) :**
- API REST versionnée (`/api/v1/...`), guards JWT, validation des DTO (class-validator).
- Endpoints CRUD sur `input`, lecture seule sur `reference_section`, endpoints de consolidation et d'export.
- Génération des exports côté serveur (docx/xlsx).
- Script de **seed** (entités + sections de référence depuis le fichier fourni).
- **Migrations** versionnées.

**Dev / Ops :**
- `Dockerfile` front + back, ajout au `docker-compose` existant, **route Nginx dédiée** (ex. `location /collecte/ { ... }`) — s'aligner sur la config existante.
- `README` d'installation + `.env.example` documentant **toutes** les variables (`JWT_SECRET`/`JWT_PUBLIC_KEY`, `JWT_ENTITY_CLAIM`, `AUTH_MODE`, DB, port, base href Angular pour servir sous sous-chemin).
- Le bouton de redirection à ajouter dans l'app principale (un lien vers la route Nginx du module, en transmettant le contexte de session si nécessaire au SSO).

---

## 7. Qualité et garde-fous (exigences du commanditaire)

- **Rien en dur** qui devrait être configurable (secrets, URLs, claim d'entité) → variables d'environnement.
- **Ne pas casser l'existant** : le module est séparé ; n'introduis aucune dépendance dans l'app principale au-delà du bouton de redirection.
- **Attribution et horodatage systématiques** de chaque contribution (traçabilité de l'édition ouverte).
- **Aucune donnée inventée** dans le socle de référence : il provient exclusivement du Livrable B validé (fichier fourni). Si le fichier manque, demande-le avant de seeder.
- Code commenté, testable, avec quelques tests sur l'auth (validation JWT) et sur le CRUD des inputs.

---

## 8. Livrables attendus de Claude Code

1. Un **compte rendu d'inspection** de l'existant (§2) + un **plan** validé avant codage.
2. Le **module complet** (front Angular 17+ standalone, back NestJS, schéma Postgres + migrations + seed).
3. La **dockerisation** + la **route Nginx** + le **bouton** dans l'app principale.
4. `README` + `.env.example` + instructions de déploiement.
5. La liste des **points où l'auth SSO a dû être supposée** (à confirmer avec l'équipe), le cas échéant.

**Commence par le §2 (inspection) et propose ton plan. N'écris pas de code avant validation du plan.**