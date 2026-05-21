# eRéclamations — CNPS Côte d'Ivoire

Application métier de gestion des réclamations des partenaires sociaux (Entreprises & Travailleurs).

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS + Lucide-React |
| Backend | PHP 8.3 Vanilla (API REST) |
| Base de données | PostgreSQL 15 |
| Serveur Web | Nginx |
| Orchestration | Docker Compose |

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

### 3. Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Superviseur (Centrale) | `superviseur@cnps.ci` | `Password@1234` |
| Coordonnateur | `coord.plateau@cnps.ci` | `Password@1234` |
| Pilote | `pilote.plateau@cnps.ci` | `Password@1234` |
| Agent | `agent.plateau@cnps.ci` | `Password@1234` |

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
│   │   ├── Models/             # Accès données
│   │   └── Controllers/        # Logique métier
│   └── database/
│       ├── schema.sql          # 9 tables + triggers + index
│       └── seed.sql            # Données de test
│
└── frontend/                   # SPA React
    └── src/
        ├── api/index.js        # Clients API (JWT auto-injecté)
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── layout/         # Sidebar, Header
        │   ├── tickets/        # StatusBadge, Timeline
        │   └── ui/             # Modal, ...
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx       # Claims Inbox
        │   ├── FicheTraitement.jsx # Traitement + validation
        │   ├── NouvelleReclamation.jsx
        │   └── Administration.jsx
        ├── hooks/useReclamations.js
        └── utils/roleGuard.js
```

---

## Routes API

| Méthode | Endpoint | Description | Rôle minimum |
|---------|----------|-------------|--------------|
| POST | `/api/auth/login` | Authentification JWT | Public |
| GET | `/api/auth/me` | Profil connecté | Tous |
| GET | `/api/reclamations` | Liste scopée | Tous |
| POST | `/api/reclamations` | Créer réclamation | Tous |
| GET | `/api/reclamations/{id}` | Détail + actions + historique | Tous |
| PUT | `/api/reclamations/{id}/statut` | Changer statut | Pilote+ |
| POST | `/api/reclamations/{id}/soumettre` | Soumettre à validation | Pilote |
| POST | `/api/reclamations/{id}/valider` | Valider (résoudre) | Coordonnateur+ |
| POST | `/api/reclamations/{id}/retourner` | Retourner au pilote | Coordonnateur+ |
| GET | `/api/reclamations/{id}/actions` | Actions de traitement | Tous |
| POST | `/api/reclamations/{id}/actions` | Ajouter action | Pilote+ |
| PUT | `/api/actions/{id}` | MAJ action | Pilote+ |
| GET | `/api/processus` | Liste processus | Tous |
| GET | `/api/motifs` | Motifs (filtre: `?processus_id=`) | Tous |
| GET | `/api/agences` | Liste agences | Tous |
| GET | `/api/ressources` | Ressources scopées | Tous |
| GET | `/api/utilisateurs` | Liste utilisateurs | Coord+ |
| GET | `/api/stats` | KPIs tableaux de bord | Tous |

---

## Flux de validation

```
[Agent]       → Crée réclamation          → statut: "nouveau"
[Pilote]      → Prend en charge           → statut: "en_cours"
[Pilote]      → Ajoute actions/corrections
[Pilote]      → Soumet à validation       → statut: "à_valider"
[Coordonnateur] → Valide                  → statut: "résolu"
[Coordonnateur] → Retourne (commentaire obligatoire) → statut: "en_cours"
                  ↑ Enregistré dans l'historique
```

---

## Scoping par rôle

| Rôle | Accès |
|------|-------|
| `agent` | Ses réclamations uniquement |
| `pilote` | Réclamations de son agence |
| `coordonnateur` | Réclamations de son agence + validation |
| `superviseur` | Toutes les agences + Administration + Switch agence |

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

> © 2026 CNPS Côte d'Ivoire — Usage strictement interne
