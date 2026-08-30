# eRéclamations — CNPS Côte d'Ivoire

Application métier de gestion des réclamations des partenaires sociaux (Entreprises & Travailleurs), avec portail public de déclaration et de suivi.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS + Lucide-React + React Router 6 + Recharts |
| Backend | PHP 8.3 Vanilla (API REST, sans framework) |
| Base de données | PostgreSQL 15 |
| Serveur Web | Nginx (Docker) / Apache (Laragon, XAMPP) |
| Orchestration | Docker Compose |
| PWA | vite-plugin-pwa (installable, cache offline) |

---

## Démarrage rapide

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### 1. Lancer l'environnement complet

```bash
# Depuis le dossier ereclamations/
docker compose up -d
```

Cela démarre automatiquement :
- **PostgreSQL** sur `localhost:5432` — avec le schéma + données de test importés
- **PHP-FPM 8.3** + **Nginx** sur `http://localhost:8080`
- **Frontend Vite** sur `http://localhost:5173`

> ⏳ Au premier lancement, Docker construit les images (~2 min). Les suivants sont instantanés.

### 2. Accéder à l'application

Ouvrir : **http://localhost:5173**

Portail public (sans authentification) :
- `/declarer` — Déclaration d'une réclamation par un usager
- `/suivi` ou `/tracking` — Suivi d'une réclamation via son numéro

### 3. Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Superviseur (Centrale) | `superviseur@cnps.ci` | `Password@1234` |
| Coordonnateur | `coordonnateur@cnps.ci` ou `coord.plateau@cnps.ci` | `Password@1234` |
| Pilote | `pilote.plateau@cnps.ci` | `Password@1234` |
| Agent | `agent.plateau@cnps.ci` | `Password@1234` |

> La connexion accepte l'email **ou** le matricule de l'utilisateur.

---

## Architecture du projet

```
ereclamations/
├── docker-compose.yml          # Orchestration des services
├── docker/
│   ├── Dockerfile.php          # PHP 8.3 FPM + PDO PostgreSQL
│   └── nginx.conf              # Configuration Nginx
│
├── backend/                    # API PHP REST
│   ├── public/
│   │   └── index.php           # Routeur unique (Front Controller)
│   ├── src/
│   │   ├── Config/
│   │   │   ├── Database.php    # Connexion PDO PostgreSQL
│   │   │   └── JWT.php         # JWT natif HS256
│   │   ├── Middleware/
│   │   │   └── Auth.php        # Vérification JWT + scoping rôle
│   │   ├── Models/              # Agence, ConfigMail, Motif, Reclamation, Utilisateur
│   │   ├── Controllers/         # Auth, Reclamation, Validation, Action, Attachment,
│   │   │                        # Parametrage, Analytics, Audit, ConfigMail, Interim,
│   │   │                        # KnowledgeBase, Public (portail usager)
│   │   ├── Services/
│   │   │   └── MailService.php  # Notifications email (SMTP configurable via ConfigMail)
│   │   └── Utils/
│   │       └── Audit.php        # Piste d'audit des actions sensibles
│   ├── scripts/                 # Scripts d'exploitation ponctuels (sla_reminder, inspect_*, ...)
│   └── database/
│       ├── schema.sql           # Tables + triggers + index
│       ├── seed.sql             # Données de test (agences, utilisateurs, référentiels)
│       ├── seed_causes.sql, causes_schema.sql, knowledge_base_schema.sql
│       └── migration_*.sql      # Migrations incrémentales (escalade, corbeille, partenaires)
│
└── frontend/                    # SPA React
    └── src/
        ├── api/index.js          # Clients API (JWT auto-injecté)
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── layout/            # AppLayout, Sidebar, Header, BottomNav, AgencySwitcher
        │   ├── tickets/            # StatusBadge, Timeline
        │   ├── forms/
        │   └── ui/                # Modal, ...
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx           # Claims Inbox
        │   ├── FicheTraitement.jsx     # Traitement + validation
        │   ├── NouvelleReclamation.jsx
        │   ├── Administration.jsx      # Paramétrage complet
        │   ├── KnowledgeBase.jsx       # Base de connaissance / suggestions de réponses
        │   ├── Infographie.jsx         # Tableaux de bord analytiques
        │   ├── PublicDeclaration.jsx   # Portail public — déclarer une réclamation
        │   └── PublicTracking.jsx      # Portail public — suivre une réclamation
        ├── hooks/useReclamations.js
        └── utils/roleGuard.js
```

---

## Routes API

### Authentification & réclamations

| Méthode | Endpoint | Description | Rôle minimum |
|---------|----------|-------------|--------------|
| POST | `/api/auth/login` | Authentification JWT (email ou matricule) | Public |
| GET | `/api/auth/me` | Profil connecté | Tous |
| POST | `/api/auth/change-password` | Changer son mot de passe | Tous |
| GET | `/api/reclamations` | Liste scopée | Tous |
| POST | `/api/reclamations` | Créer réclamation | Tous |
| GET | `/api/reclamations/history` | Historique global | Tous |
| GET | `/api/reclamations/{id}` | Détail | Tous |
| PUT | `/api/reclamations/{id}/statut` | Changer statut | Pilote+ |
| PUT | `/api/reclamations/{id}/analyse` | MAJ analyse | Pilote+ |
| PUT | `/api/reclamations/{id}/remarques` | MAJ remarques | Pilote+ |
| PUT | `/api/reclamations/{id}/escalader` | Escalader la réclamation | Pilote+ |
| PUT | `/api/reclamations/{id}/qualify` | Qualifier (causes) | Pilote+ |
| POST | `/api/reclamations/{id}/soumettre` | Soumettre à validation | Pilote |
| POST | `/api/reclamations/{id}/valider` | Valider (résoudre) | Coordonnateur+ |
| POST | `/api/reclamations/{id}/retourner` | Retourner au pilote | Coordonnateur+ |
| GET/POST | `/api/reclamations/{id}/actions` | Actions de traitement | Tous / Pilote+ |
| PUT/DELETE | `/api/actions/{id}` | MAJ / suppression action | Pilote+ |
| GET/POST | `/api/reclamations/{id}/attachments` | Pièces jointes | Tous / Pilote+ |
| GET/DELETE | `/api/attachments/{id}` | Télécharger / supprimer une pièce jointe | Tous / Pilote+ |
| GET | `/api/reclamations/{id}/suggestions` | Suggestions de réponse (KB) | Tous |

### Portail public (sans authentification)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/init` | Données d'initialisation du formulaire public |
| GET | `/api/public/types-clients` | Types de clients |
| GET | `/api/public/motifs` | Motifs |
| GET | `/api/public/sous-motifs` | Sous-motifs |
| GET | `/api/public/check-identifier` | Vérifier un identifiant usager |
| POST | `/api/public/declare` | Déclarer une réclamation |
| GET | `/api/public/tracking/{numero}` | Suivre une réclamation par son numéro |

### Paramétrage & administration

| Méthode | Endpoint | Description | Rôle minimum |
|---------|----------|-------------|--------------|
| GET/POST/PUT/DELETE | `/api/agences` | Agences | Coord+ |
| GET/POST/PUT/DELETE | `/api/utilisateurs` | Utilisateurs | Coord+ (administrateur inclus) |
| GET/POST/PUT/DELETE | `/api/ressources` (+ `/bulk`, `/clear-no-account`) | Ressources humaines | Coord+ |
| GET/POST/PUT/DELETE | `/api/regimes` | Régimes | Coord+ |
| GET/POST/PUT/DELETE | `/api/types-clients` | Types de clients | Coord+ |
| GET/POST/PUT/DELETE | `/api/modes-saisine` | Modes de saisine | Coord+ |
| GET/POST/PUT/DELETE | `/api/processus` | Processus | Coord+ |
| GET/POST/PUT/DELETE | `/api/motifs` (+ `/bulk`) | Motifs (filtre `?processus_id=`) | Coord+ |
| GET/POST/PUT/DELETE | `/api/sous-motifs` | Sous-motifs | Coord+ |
| GET/POST/PUT/DELETE | `/api/categories-causes` | Catégories de causes | Coord+ |
| GET/POST/PUT/DELETE | `/api/causes` (+ `/import`, `/bulk`) | Causes de réclamation | Coord+ |
| GET/POST/DELETE | `/api/affectations` | Affectations pilote ↔ agence | Coord+ |
| GET/POST/PUT/DELETE | `/api/travailleurs`, `/api/employeurs`, `/api/sinistres` (+ `/bulk`, `/clear`) | Référentiel partenaires | Coord+ |
| GET/POST/PUT/DELETE | `/api/kb` | Entrées base de connaissance | Coord+ |
| GET/POST/PUT/DELETE | `/api/suggestions` | Suggestions de réponses | Coord+ |
| GET/POST | `/api/config-mail` (+ `/test`) | Configuration SMTP | Superviseur |
| GET/POST/DELETE/PATCH | `/api/interims` | Gestion des intérims (délégation temporaire de rôle) | Administrateur |
| GET | `/api/audit` | Piste d'audit | Superviseur |
| GET | `/api/analytics` | Statistiques comparatives | Coord+ |
| GET | `/api/stats` | KPIs tableaux de bord | Tous |

---

## Flux de validation

```
[Agent]         → Crée réclamation                    → statut: "nouveau"
[Pilote]        → Prend en charge                      → statut: "en_cours"
[Pilote]        → Ajoute actions / qualifie / escalade
[Pilote]        → Soumet à validation                  → statut: "a_valider"
[Coordonnateur] → Valide                                → statut: "resolu"
[Coordonnateur] → Retourne (commentaire obligatoire)    → statut: "en_cours"
                  ↑ Chaque transition est enregistrée dans l'historique et la piste d'audit
```

---

## Scoping par rôle

| Rôle | Accès |
|------|-------|
| `agent` | Ses réclamations uniquement |
| `pilote` | Réclamations de son agence |
| `coordonnateur` | Réclamations de son agence + validation |
| `superviseur` | Toutes les agences + Administration + Switch agence |
| `administrateur` | Accès superviseur + gestion des intérims (délégation temporaire de rôle) |

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
JWT_SECRET=votre_secret_jwt_tres_long_et_complexe
CORS_ORIGIN=https://votre-domaine.ci
APP_ENV=production
```

---

## Déploiement hors Docker (Windows)

Le dépôt fournit trois scripts PowerShell de déploiement selon l'environnement cible :
- `deploy-laragon.ps1` — Laragon (Apache + PHP 8.1), voir section détaillée ci-dessous
- `deploy-xampp.ps1` — XAMPP
- `deploy.ps1` — déploiement générique

### Déploiement sur Laragon (Windows, PHP 8.1)

#### Prérequis
- [Laragon](https://laragon.org/) installé (version Full ou Lite)
- PHP 8.1 sélectionné dans Laragon (clic droit > PHP > Switch > 8.1.x)
- Extension `pdo_pgsql` activée dans `php.ini` de Laragon
- PostgreSQL installé avec la base de données `ereclamations` déjà créée et le schéma importé
- Node.js 20 LTS installé ([nodejs.org](https://nodejs.org/))

#### 1. Placer le projet dans Laragon

Copier le dossier du projet dans `C:\laragon\www\ereclamations\`
*(ou adapter le paramètre `-ProjectPath` du script).*

#### 2. Importer la base de données (si pas encore fait)

```powershell
# Importer le schéma principal
psql -h localhost -U postgres -d ereclamations -f backend\database\schema.sql

# Importer les données de référence (causes, KB, etc.)
psql -h localhost -U postgres -d ereclamations -f backend\database\seed.sql
psql -h localhost -U postgres -d ereclamations -f backend\database\seed_causes.sql

# Migrations complémentaires (escalade, corbeille, partenaires)
psql -h localhost -U postgres -d ereclamations -f backend\database\migration_escalade.sql
psql -h localhost -U postgres -d ereclamations -f backend\database\migration_corbeille_escalade.sql
psql -h localhost -U postgres -d ereclamations -f backend\database\migration_partenaires.sql
```

#### 3. Lancer le script de déploiement

```powershell
# Déploiement minimal (valeurs par défaut)
powershell -ExecutionPolicy Bypass -File .\deploy-laragon.ps1

# Déploiement avec paramètres personnalisés
powershell -ExecutionPolicy Bypass -File .\deploy-laragon.ps1 `
    -ProjectPath  "C:\laragon\www\ereclamations" `
    -LaragonPath  "C:\laragon" `
    -FrontendPort "81" `
    -BackendPort  "9000" `
    -PgHost       "localhost" `
    -PgPort       "5432" `
    -PgDb         "ereclamations" `
    -PgUser       "postgres"
```

Le script effectue automatiquement :
1. ✅ Vérifie Apache, PHP 8.1, l'extension `pdo_pgsql`, Node.js et `psql`
2. ✅ Crée/met à jour le fichier `backend/.env`
3. ✅ Build le frontend React/Vite (`npm install` + `npm run build`) — le build nettoie automatiquement `dist/` (`npm run clean` / `prebuild`)
4. ✅ Génère et installe les VirtualHosts Apache Laragon (ports 81 et 9000)
5. ✅ Active les modules Apache nécessaires (`mod_rewrite`, `mod_proxy`, `mod_proxy_http`)
6. ✅ Configure les permissions du dossier `storage`
7. ✅ Ouvre le pare-feu Windows pour le port 81
8. ✅ Redémarre Apache et teste l'API + le frontend

#### 4. Accéder à l'application

Ouvrir : **http://localhost:81**

#### Architecture des ports Laragon

| Port | Service | Accès |
|------|---------|-------|
| `81` | Frontend React (build Vite) | Réseau local + navigateur |
| `9000` | Backend PHP API | Localhost uniquement (interne Apache) |
| `5432` | PostgreSQL | Localhost uniquement |

---

## Sécurité

- En-têtes de sécurité systématiques sur l'API : CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- JWT HS256 maison, vérifié via `App\Middleware\Auth` (scoping par rôle et par agence)
- Les routes de paramétrage (`travailleurs`, `employeurs`, `sinistres`) exigent explicitement `Auth::require()` en défense en profondeur
- Piste d'audit (`/api/audit`) pour tracer les actions sensibles

---

> © 2026 CNPS Côte d'Ivoire — Usage strictement interne
