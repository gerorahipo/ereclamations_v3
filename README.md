# eRéclamations — CNPS Côte d'Ivoire

Application métier de gestion des réclamations des assurés et employeurs (Entreprises & Travailleurs), avec portail public de déclaration et de suivi.

> 📘 Pour une documentation technique approfondie (architecture détaillée, schéma de base de données complet, fichiers critiques, dette technique connue), voir **[docs/PROJET_RESUME_TECHNIQUE.md](docs/PROJET_RESUME_TECHNIQUE.md)**.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS + Lucide-React + React Router 6 + Recharts |
| Backend | PHP 8.x Vanilla (API REST, sans framework, autoload PSR-4 maison) |
| Base de données | PostgreSQL 15 |
| Serveur Web | Nginx + PHP-FPM (Docker) ou Apache (voir §Déploiement) |
| Orchestration (dev) | Docker Compose |
| PWA | vite-plugin-pwa (installable, cache offline, `NetworkOnly` sur `/api/*`) |

---

## Démarrage rapide (Docker)

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### 1. Lancer l'environnement complet

```bash
# Depuis le dossier ereclamations/
docker compose up -d
```

Cela démarre automatiquement :
- **PostgreSQL** sur `localhost:5432` — schéma + données de test importés automatiquement au premier démarrage (`backend/database/schema.sql` puis `seed.sql`)
- **PHP-FPM** + **Nginx** sur `http://localhost:8888`
- **Frontend Vite** (mode dev) sur `http://localhost:5173`

> ⏳ Au premier lancement, Docker construit les images (~2 min). Les suivants sont instantanés.

### 2. Accéder à l'application

Ouvrir : **http://localhost:5173**

Portail public (sans authentification) :
- `/` — Accueil assuré
- `/declarer` — Déclaration d'une réclamation
- `/suivi` ou `/tracking` — Suivi d'une réclamation via son numéro de ticket

Espace agent : `/login`

### 3. Comptes de démonstration

Mot de passe commun en environnement de test/démo : `Password@1234` (⚠️ à ne jamais réutiliser en production — voir §Sécurité).

| Rôle | Email |
|------|-------|
| Agent accueil et relations client | `agent.plateau@cnps.ci` |
| Pilote | `pilote.plateau@cnps.ci` |
| Manager (valide les dossiers de son agence) | `coord.plateau@cnps.ci` |
| Superviseur (valide toutes agences + reporting) | `superviseur@cnps.ci` |
| Coordonnateur (structure centrale, analyse transverse) | `coordonnateur@cnps.ci` |
| Administrateur fonctionnel (paramétrage métier) | `admin.fonctionnel@cnps.ci` |
| Administrateur système (utilisateurs, agences, audit) | `admin.systeme@cnps.ci` |

> La connexion accepte l'email **ou** le matricule de l'utilisateur.

---

## Architecture du projet

```
ereclamations/
├── docker-compose.yml          # Orchestration des services (dev)
├── docker/
│   ├── Dockerfile.php          # PHP-FPM + PDO PostgreSQL
│   └── nginx.conf              # Configuration Nginx (transmet HTTP_AUTHORIZATION à PHP)
│
├── backend/                    # API PHP REST
│   ├── public/
│   │   ├── index.php           # Routeur unique (Front Controller), autoload PSR-4 manuel
│   │   └── .htaccess            # Réécriture Apache + transmission de l'en-tête Authorization
│   ├── src/
│   │   ├── Config/
│   │   │   ├── Database.php    # Connexion PDO PostgreSQL (singleton)
│   │   │   └── JWT.php         # JWT natif HS256 (encode/decode fait main)
│   │   ├── Middleware/
│   │   │   └── Auth.php        # Vérification JWT + scoping rôle
│   │   ├── Models/              # Agence, ConfigMail, Motif, Notification, Objectif, Reclamation, Utilisateur
│   │   ├── Controllers/         # Auth, Reclamation, Validation, Action, Attachment, Parametrage,
│   │   │                        # Analytics, Audit, ConfigMail, Interim, Notification,
│   │   │                        # KnowledgeBase, Public (portail usager)
│   │   ├── Services/
│   │   │   └── MailService.php  # Notifications email (SMTP configurable via ConfigMail)
│   │   └── Utils/
│   │       ├── Audit.php               # Piste d'audit / historique des actions
│   │       └── PartenaireValidator.php # Validation du Numéro CNPS selon le type de client
│   ├── scripts/                 # Scripts d'exploitation ponctuels (sla_reminder, inspect_*, ...)
│   └── database/
│       ├── schema.sql           # DDL complet — source de vérité pour une base neuve (24 tables)
│       └── seed.sql             # Données de référence (agences, régimes, processus dont NQ,
│                                 # objectifs SLA par défaut, comptes de démo)
│
└── frontend/                    # SPA React
    └── src/
        ├── api/index.js          # Client API unique (JWT + X-Active-Agency auto-injectés)
        ├── context/
        │   ├── AuthContext.jsx    # État d'authentification, multi-agence (intérims)
        │   └── AlertContext.jsx
        ├── components/
        │   ├── layout/            # AppLayout, Sidebar, Header, BottomNav, AgencySwitcher
        │   ├── tickets/            # StatusBadge, Timeline
        │   └── ui/                # Modal, ...
        ├── pages/
        │   ├── Login.jsx
        │   ├── PublicHome.jsx / PublicDeclaration.jsx / PublicTracking.jsx  # Portail public
        │   ├── Dashboard.jsx           # Tableau de bord — rendu conditionnel par rôle
        │   ├── NouvelleReclamation.jsx # Saisie interne (agent/pilote)
        │   ├── FicheTraitement.jsx     # Traitement + validation (4 onglets)
        │   ├── Administration.jsx      # Paramétrage, onglets filtrés par rôle
        │   ├── KnowledgeBase.jsx       # Base de connaissances / suggestions de réponses
        │   └── Infographie.jsx         # Tableaux de bord analytiques
        ├── hooks/useReclamations.js
        └── utils/
            ├── roleGuard.js        # Référence des rôles/permissions (canPerformAction)
            ├── exportUtils.js      # Export Excel/PDF (listes + rapport de performance)
            └── pdfGenerator.js     # Accusé de réception / lettre de réponse
```

---

## Routes API

### Authentification & réclamations

| Méthode | Endpoint | Description | Rôle minimum |
|---------|----------|-------------|--------------|
| POST | `/api/auth/login` | Authentification JWT (email ou matricule) | Public |
| GET | `/api/auth/me` | Profil connecté | Tous |
| POST | `/api/auth/change-password` | Changer son mot de passe | Tous |
| GET | `/api/reclamations` | Liste scopée par rôle/agence | Tous |
| POST | `/api/reclamations` | Créer réclamation | Tous |
| GET | `/api/reclamations/history` | Historique global | Tous |
| GET | `/api/reclamations/{id}` | Détail | Tous (scopé) |
| PUT | `/api/reclamations/{id}/infos` | Corriger les infos (traçable) | Agent créateur+ |
| PUT | `/api/reclamations/{id}/analyse` | MAJ analyse | Pilote |
| PUT | `/api/reclamations/{id}/qualify` | Qualifier (processus NQ → processus réel) | Agent (Agence Digitale) / Coordonnateur |
| PUT | `/api/reclamations/{id}/escalader` | Escalader la réclamation | Pilote |
| POST | `/api/reclamations/{id}/soumettre` | Soumettre à validation | Pilote |
| POST | `/api/reclamations/{id}/valider` | Valider (clôturer) | Manager (son agence) / Superviseur (toutes) |
| POST | `/api/reclamations/{id}/retourner` | Retourner au pilote | Manager (son agence) / Superviseur (toutes) |
| GET/POST | `/api/reclamations/{id}/actions` | Actions de traitement | Tous (scopé) / Pilote |
| PUT/DELETE | `/api/actions/{id}` | MAJ / suppression action | Pilote (scopé) |
| GET/POST | `/api/reclamations/{id}/attachments` | Pièces jointes (5 Mo max/fichier) | Tous (scopé) |
| GET/DELETE | `/api/attachments/{id}` | Télécharger / supprimer une pièce jointe | Tous (scopé agence) |
| GET | `/api/reclamations/{id}/suggestions` | Suggestions de réponse (KB) | Tous |
| GET/PUT | `/api/notifications` | Centre de notifications in-app | Tous |
| GET/PUT | `/api/objectifs` | Objectifs SLA du tableau de bord | Lecture : tous · Écriture : Administrateur fonctionnel |

### Portail public (sans authentification)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/init` | Données d'initialisation du formulaire public |
| POST | `/api/public/declare` | Déclarer une réclamation (rattachée au processus `NQ` en attente de qualification) |
| GET | `/api/public/tracking/{numero}` | Suivre une réclamation par son numéro de ticket |

### Paramétrage & administration

| Méthode | Endpoint | Description | Rôle minimum |
|---------|----------|-------------|--------------|
| GET/POST/PUT/DELETE | `/api/agences`, `/api/utilisateurs`, `/api/ressources` | Référentiels techniques | Administrateur système |
| GET/POST/PUT/DELETE | `/api/regimes`, `/api/types-clients`, `/api/modes-saisine`, `/api/processus`, `/api/motifs`, `/api/sous-motifs`, `/api/categories-causes`, `/api/causes`, `/api/affectations`, `/api/interims` | Référentiels métier + objectifs SLA | Administrateur fonctionnel |
| GET/POST/PUT/DELETE | `/api/travailleurs`, `/api/employeurs`, `/api/sinistres` (+ `/bulk`, `/clear`) | Référentiels administratifs | Administrateur système |
| GET/POST/PUT/DELETE | `/api/kb`, `/api/suggestions` | Base de connaissances | Administrateur fonctionnel |
| GET/POST | `/api/config-mail` (+ `/test`) | Configuration SMTP | Superviseur |
| GET | `/api/audit` | Piste d'audit | Superviseur / Admin système |
| GET | `/api/analytics` | Statistiques comparatives multi-agences | Coordonnateur / Admin fonctionnel |
| GET | `/api/stats` | KPIs tableaux de bord | Tous (scopé par rôle) |

---

## Flux de validation

```
[Agent/Portail public] → Crée réclamation                 → statut: "nouveau"
[Agent Agence Digitale /
 Coordonnateur]         → Qualifie (si venu du portail)    → processus NQ → processus réel
[Pilote]                → Prend en charge                  → statut: "en_cours"
[Pilote]                → Analyse, ajoute actions, escalade (optionnel)
[Pilote]                → Soumet à validation               → statut: "a_valider"
[Manager / Superviseur] → Valide (clôture)                  → statut: "resolu"
[Manager / Superviseur] → Retourne (commentaire obligatoire) → statut: "en_cours"
                           ↑ Chaque transition est enregistrée dans `historique` (timeline + audit)
```

---

## Scoping par rôle

| Rôle | Accès |
|------|-------|
| `agent` | Ses réclamations créées uniquement (+ qualification NQ si Agence Digitale) |
| `pilote` | Réclamations affectées à son agence |
| `manager` | Son agence : traitement + validation/retour |
| `superviseur` | Toutes les agences : validation/retour, dashboard Reporting/Opérations |
| `coordonnateur` | Toutes les agences : vision transverse, qualification NQ, dashboard Performance + export — **pas** de droit de valider/retourner |
| `administrateur_fonctionnel` | Paramétrage métier (processus, motifs, causes, régimes, objectifs SLA, intérims) |
| `administrateur_systeme` | Administration technique (utilisateurs, agences, personnel, audit, notifications email) |

Détail des permissions : `frontend/src/utils/roleGuard.js` (frontend) et `ReclamationController::checkAccess()` (backend, source de vérité réelle).

---

## Commandes utiles Docker

```bash
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Voir les logs
docker compose logs -f

# Accéder à la base PostgreSQL
docker compose exec db psql -U db -d db

# Réinitialiser la base (ATTENTION: supprime toutes les données)
docker compose down -v
docker compose up -d

# Build forcé (après modification Dockerfile)
docker compose build --no-cache php
docker compose up -d
```

---

## Variables d'environnement

Copier `backend/.env.example` → `backend/.env` et ajuster :

```env
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=votre_secret_jwt_tres_long_et_complexe
CORS_ORIGIN=https://votre-domaine.ci
APP_ENV=production
```

Frontend : `frontend/.env` avec `VITE_API_URL` (lu via `loadEnv()` dans `vite.config.js`).

---

## Déploiement hors Docker (Apache / Nginx)

Il n'existe plus de script de déploiement automatisé dans ce dépôt : la mise en production se fait sur une base de données neuve, avec `backend/database/schema.sql` + `seed.sql` suffisants (aucune migration incrémentale à rejouer).

Étapes générales :

1. **Base de données** : créer la base PostgreSQL, puis `psql -f backend/database/schema.sql` suivi de `psql -f backend/database/seed.sql`.
2. **Backend** : pointer le document root du serveur web vers `backend/public/`, configurer `backend/.env`.
3. **Frontend** : `cd frontend && npm install && npm run build`, servir le dossier `frontend/dist` (statique) avec un reverse-proxy `/api/*` vers le backend PHP.
4. **⚠️ En-tête `Authorization`** : Apache et Nginx ne transmettent pas cet en-tête à PHP par défaut, ce qui casse toute requête authentifiée (symptôme : connexion réussie puis déconnexion immédiate). Vérifier que `backend/public/.htaccess` (Apache) ou l'équivalent `fastcgi_param HTTP_AUTHORIZATION $http_authorization;` (Nginx) est bien pris en compte par le serveur cible.

Détails complets et points de vigilance : voir **[docs/PROJET_RESUME_TECHNIQUE.md](docs/PROJET_RESUME_TECHNIQUE.md#6-sécurité--points-critiques-à-connaître)**.

---

## Sécurité

- En-têtes de sécurité systématiques sur l'API : CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- JWT HS256 maison, vérifié via `App\Middleware\Auth` (scoping par rôle et par agence) ; voir `App\Config\JWT::fromRequest()` pour le point de fragilité lié à l'en-tête `Authorization` (§Déploiement)
- Contrôle d'accès par agence appliqué systématiquement sur les réclamations, actions de traitement et pièces jointes (`ReclamationController::checkAccess()`, réutilisé par `ActionController`)
- La suppression des référentiels sensibles (`utilisateurs`, `agences`, `ressources`) est réservée à l'Administrateur système
- Piste d'audit (`/api/audit`) pour tracer les actions sensibles et chaque transition de statut

---

> © 2026 CNPS Côte d'Ivoire — Usage strictement interne
