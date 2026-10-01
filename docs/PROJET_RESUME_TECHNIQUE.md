# e-Réclamations CNPS — Résumé technique du projet

> Document de passation destiné à un développeur ou à un outil de "vibe coding" reprenant le projet. Il couvre les fonctionnalités, l'architecture, les fichiers critiques, le schéma de base de données et les points d'attention connus.
>
> Dernière mise à jour : 2026-10-01 (branche `main`, dépôt `ereclamations_v3`).

---

## 1. Objectif de l'application

Application web de gestion des réclamations des assurés et employeurs de la CNPS (Caisse Nationale de Prévoyance Sociale, Côte d'Ivoire). Elle couvre tout le cycle de vie d'une réclamation : dépôt (guichet ou portail public), qualification, traitement, validation, clôture — avec traçabilité complète, SLA par type de demande, pièces jointes, et reporting multi-agences.

Deux espaces distincts :
- **Portail public** (`/`, `/declarer`, `/suivi`) : tout assuré peut déclarer une réclamation et suivre son avancement avec un numéro de ticket, sans compte.
- **Espace agent** (`/login` puis routes protégées) : personnel CNPS, accès par rôle (voir §3).

---

## 2. Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 18 + Vite 5, React Router 6, Tailwind CSS, Recharts (graphiques), jsPDF + jspdf-autotable (export PDF), xlsx (export Excel), lucide-react (icônes), vite-plugin-pwa (PWA/service worker) |
| Backend | PHP 8.x "nu" (pas de framework), routeur maison dans `public/index.php`, autoload PSR-4 manuel, PDO/PostgreSQL |
| Base de données | PostgreSQL 15 |
| Auth | JWT maison (HS256, implémenté à la main dans `JWT.php`, pas de librairie) |
| Déploiement de référence | Docker Compose (nginx + php-fpm + postgres + node) **ou** Apache/XAMPP/Laragon (voir `docker/httpd-ereclamations.conf`) |

Pas de build backend (pas de composer.json, pas de dépendances PHP externes) : tout le code backend est "vanilla PHP" avec un autoloader PSR-4 écrit à la main dans `public/index.php`.

---

## 3. Profils utilisateurs et fonctionnalités

La colonne `utilisateurs.role` détermine le profil. Labels et permissions centralisés côté frontend dans `frontend/src/utils/roleGuard.js` (c'est le fichier de référence pour les rôles) et dupliqués dans quelques pages (`Sidebar.jsx`, `Dashboard.jsx`, `Administration.jsx` ont chacun leur propre `ROLE_LABELS` — **point de dette technique**, voir §8).

| Rôle | Fonction | Périmètre |
|---|---|---|
| `agent` | Accueil et relations client | Saisit les réclamations au guichet, qualifie les dossiers "Non qualifiés" venant du portail public (si rattaché à l'Agence Digitale) |
| `pilote` | Traite les dossiers | Prend en charge, analyse (catégorie/cause), ajoute des actions correctives, soumet pour validation ou escalade — limité à son agence |
| `manager` | "Manager de service/section accueil réclamations" — valide au niveau agence | Valide (clôture) ou retourne les dossiers soumis par les pilotes de sa propre agence |
| `superviseur` | Directeur d'agence + vision transverse | Valide/retourne les dossiers de **toutes** les agences, dashboard Reporting/Opérations, accès à `/api/objectifs` en lecture |
| `coordonnateur` | Structure centrale, analyse qualité transverse | Vision toutes agences, qualifie les dossiers NQ comme l'Agence Digitale, PAS de droit de valider/retourner (volontairement exclu, voir conversation de conception). Dashboard "Performance" avec export PDF/Excel. |
| `administrateur_fonctionnel` | Paramétrage métier | Processus, motifs, causes, régimes, modes de saisine, affectations auto, intérims, **objectifs SLA** |
| `administrateur_systeme` | Administration technique | Utilisateurs, agences, personnel (ressources), notifications email, audit & logs, référentiels travailleurs/employeurs/sinistres |

### Workflow métier (statuts d'une réclamation)

```
nouveau → en_cours → a_valider → resolu
                                → rejete
     (retour possible : a_valider → en_cours, via "Retourner")
```

Logique d'autorisation centralisée côté backend dans `ReclamationController::checkAccess()` (public depuis le correctif IDOR du 2026, réutilisée par `ActionController`) et côté frontend dans `roleGuard.js::canPerformAction()`.

### Fonctionnalités clés

- **Déclaration portail public** : formulaire en 2 étapes, contrôle strict du Numéro CNPS selon le type de client (Régime Général = 12 chiffres, RSTI = 14 chiffres, Employeur = 1 à 6 chiffres) via `PartenaireValidator.php`, toggle "Client immatriculé Oui/Non", pièces jointes (5 Mo max/fichier).
- **Qualification des dossiers "Non Qualifiés"** : les réclamations déposées sur le portail public sont automatiquement rattachées au processus de repli `NQ` (code `NQ` dans la table `processus` — **doit impérativement exister en base**, seedé dans `seed.sql`) jusqu'à qualification par l'Agence Digitale ou le Coordonnateur.
- **Fiche de traitement** à 4 onglets : Vue d'ensemble, Traitement (analyse + actions), Documents (pièces jointes), Historique (timeline complète).
- **Traçabilité des corrections** : toute modification d'une réclamation après création est horodatée et attribuée (ancienne valeur → nouvelle valeur) dans `historique` (type `modification`).
- **Centre de notifications in-app** (cloche) : table `notifications`, géré par `NotificationController`/`NotificationModel`.
- **Base de connaissances** : articles liés aux sous-motifs (`kb_entries`) + suggestions de réponses liées à un motif/cause (`suggestions_reponses`).
- **Objectifs SLA configurables** : table `parametres_objectifs` (une seule ligne), réservé à `administrateur_fonctionnel`, affiché en écart sur les dashboards de tous les rôles.
- **Export Excel/PDF** : listes de tickets (`exportToExcel`/`exportToPDF`, tous rôles avec la vue Opérations) et rapport de performance (`exportAnalyticsToExcel`/`exportAnalyticsToPDF`, rôles `coordonnateur`/`administrateur_fonctionnel`) — voir `frontend/src/utils/exportUtils.js`.
- **Accusé de réception / lettre de réponse PDF** générés à la volée (`frontend/src/utils/pdfGenerator.js`, logo CNPS encodé en base64 dans `frontend/src/assets/logo.js`).
- **PWA** : installable, service worker configuré en `NetworkOnly` sur `/api/*` pour éviter de servir des réponses API périmées depuis le cache (bug corrigé en août 2026, voir `vite.config.js`).

---

## 4. Architecture et fichiers critiques

### 4.1 Backend (`backend/`)

```
backend/
├── public/
│   ├── index.php          ← Front controller : autoload PSR-4, CORS, parsing .env, routeur (gros switch sur $segments[0])
│   └── .htaccess           ← Réécriture Apache + transmission de l'en-tête Authorization (voir §6)
├── src/
│   ├── Config/
│   │   ├── Database.php    ← Connexion PDO PostgreSQL (singleton), lit DB_HOST/PORT/NAME/USER/PASSWORD via getenv()
│   │   └── JWT.php         ← Encodage/décodage JWT HS256 maison. fromRequest() lit $_SERVER['HTTP_AUTHORIZATION']
│   ├── Middleware/
│   │   └── Auth.php        ← Auth::require() / Auth::requireRole([...]) / Auth::$user (payload JWT décodé)
│   ├── Controllers/        ← 1 fichier par domaine métier (voir tableau ci-dessous)
│   ├── Models/              ← Requêtes SQL réutilisables (peu utilisés, la plupart des Controllers font du SQL direct)
│   ├── Services/
│   │   └── MailService.php ← Envoi d'emails (alertes validation, etc.)
│   └── Utils/
│       ├── Audit.php            ← Audit::log($reclamationId, $actionType, $commentaire) → écrit dans `historique`
│       └── PartenaireValidator.php ← Règles de validation du Numéro CNPS par type de client
└── database/
    ├── schema.sql           ← DDL complet (SOURCE DE VÉRITÉ pour une installation neuve)
    └── seed.sql              ← Données de démo/paramétrage (agences, régimes, processus dont NQ, comptes de test, objectifs SLA par défaut)
```

**Controllers (taille = complexité approximative) :**

| Fichier | Lignes | Rôle |
|---|---|---|
| `ParametrageController.php` | 1737 | CRUD générique de tous les référentiels (processus, motifs, régimes, agences, utilisateurs, intérims...) — **le plus gros fichier du projet**, à surveiller pour refactoring |
| `ReclamationController.php` | 1031 | Cœur métier : CRUD réclamations, prise en charge, soumission, `checkAccess()` (contrôle d'accès central) |
| `PublicController.php` | 465 | API du portail public : `init()`, `declare()`/`submit()`, `track()` |
| `AttachmentController.php` | 286 | Upload/téléchargement/suppression de pièces jointes, contrôle d'accès par agence, limite 5 Mo |
| `ValidationController.php` | 272 | Valider / Retourner un dossier (`manager`/`superviseur`) |
| `KnowledgeBaseController.php` | 248 | Base de connaissances |
| `ActionController.php` | 206 | Actions de traitement (ajout, édition, marquage "réalisée", suppression) — contrôle d'accès ajouté en 2026 (correctif IDOR) |
| `AuthController.php` | 159 | Login, changement de mot de passe |
| `AnalyticsController.php` | 75 | `/api/analytics` : performance par agence, répartition par processus, évolution 6 mois (alimente le dashboard Coordonnateur/Admin fonctionnel) |
| `NotificationController.php` | 57 | Centre de notifications |
| `InterimController.php` | 53 | Gestion des intérims d'agence |
| `AuditController.php` | 37 | Logs d'audit |

### 4.2 Frontend (`frontend/src/`)

```
frontend/src/
├── App.jsx                     ← Routeur React Router (routes publiques vs protégées via <PrivateRoute>)
├── api/index.js                 ← Client API unique : injection automatique du JWT + X-Active-Agency,
│                                    gestion 401 → redirection /login (voir §6 pour le bug historique lié)
├── context/
│   ├── AuthContext.jsx          ← État d'authentification, décodage JWT côté client, gestion multi-agence (intérims)
│   └── AlertContext.jsx         ← Système d'alertes/toasts
├── pages/
│   ├── Dashboard.jsx             ← LE fichier le plus complexe du frontend : rendu conditionnel par rôle
│   │                                (KPI cards différentes par rôle dans getKPIs(), vues Performance/Reporting/Opérations)
│   ├── NouvelleReclamation.jsx   ← Formulaire de saisie interne (agent/pilote)
│   ├── FicheTraitement.jsx       ← Fiche à 4 onglets (cœur du traitement d'un dossier)
│   ├── PublicHome.jsx / PublicDeclaration.jsx / PublicTracking.jsx ← Portail public (pas d'auth)
│   ├── Administration.jsx        ← Paramétrage, onglets visibles selon le rôle (tableau `TABS` avec `roles: [...]`)
│   ├── KnowledgeBase.jsx
│   └── Infographie.jsx
├── components/layout/
│   ├── Sidebar.jsx                ← Menu latéral, corbeilles de traitement (statut-based navigation via query params)
│   ├── Header.jsx, AppLayout.jsx, BottomNav.jsx, AgencySwitcher.jsx (bascule entre agence principale et intérims)
├── utils/
│   ├── roleGuard.js               ← RÉFÉRENCE pour ROLES, ROLE_LABELS, STATUTS, canPerformAction() — lire ce fichier en premier pour comprendre les permissions
│   ├── exportUtils.js             ← exportToExcel/PDF (listes) + exportAnalyticsToExcel/PDF (rapport performance)
│   └── pdfGenerator.js            ← Génération de l'accusé de réception / lettre de réponse
└── assets/logo.js                 ← Logo CNPS en base64 (évite une dépendance réseau dans les PDF)
```

### 4.3 Flux de données type (ex. : pilote soumet un dossier)

1. Frontend (`FicheTraitement.jsx`) appelle `reclamationsApi.soumettre(id)` → `POST /api/reclamations/:id/soumettre`
2. `public/index.php` route vers `ReclamationController::soumettre()`
3. Le controller vérifie `Auth::requireRole(['pilote'])`, puis `checkAccess()` (agence + rôle), met à jour `statut = 'a_valider'`, écrit une ligne dans `historique` via `Audit::log()`, et crée une notification pour le manager (`NotificationModel`).
4. Réponse JSON → frontend recharge les données.

---

## 5. Base de données (PostgreSQL)

24 tables, décrites dans `backend/database/schema.sql` (source de vérité). Résumé des relations principales :

```
agences ──< ressources ──< utilisateurs
                                │
regimes ──< types_clients       │
   │             │              │
   └──< motifs ──┘              │
          │                     │
          └──< sous_motifs      │
                                 │
processus ──< categories_causes ──< causes
   │
   └──< affectations_pilotes >── utilisateurs (pilotes)

reclamations ─┬── agences, regimes, types_clients, modes_saisine,
              │   processus, motifs, sous_motifs, categories_causes, causes
              ├──< actions_traitement
              ├──< historique (timeline/audit)
              ├──< notifications
              └──< pieces_jointes (stockage disque dans backend/storage/attachments/, table
                   pieces_jointes pour les métadonnées)

parametres_objectifs  (table isolée, 1 seule ligne)
travailleurs / employeurs / sinistres  (référentiels administratifs, indépendants de reclamations)
kb_entries / suggestions_reponses  (base de connaissances)
```

**Points structurants :**
- `reclamations.numero_ticket` et `date_echeance_sla` sont calculés automatiquement par un trigger PostgreSQL (`generate_ticket_number()`) à l'insertion, basé sur `sous_motifs.delai_traitement_jours`. **Ne jamais essayer de les calculer côté applicatif.**
- `reclamations.partenaire_immatricule` (boolean, défaut `TRUE`) distingue un client réellement non immatriculé d'une saisie incomplète (ajouté en août 2026).
- `historique.action_type` est verrouillé par une contrainte CHECK avec une liste fermée de valeurs — **toute nouvelle sorte d'événement doit être ajoutée à cette contrainte dans `schema.sql`**, sinon l'insertion échoue.
- `utilisateurs.role` est aussi verrouillé par CHECK — idem si un nouveau rôle est introduit.
- Index partiel notable : `idx_reclamations_sla` filtre sur `hors_sla = FALSE AND statut NOT IN ('resolu','rejete')` — correctif de performance appliqué en juillet 2026 (l'ancien code faisait un `UPDATE` sur toute la table à chaque `GET /api/reclamations`, p95 passé de 3.59s à 0.72s sous charge).
- **`pieces_jointes`** (table des métadonnées de pièces jointes) était absente de `schema.sql` malgré un usage actif dans `AttachmentController.php`/`PublicController.php` — corrigé en octobre 2026 lors de la rédaction de ce document, reconstruite à partir des colonnes réellement utilisées par le code et testée sur une base neuve. **Si une erreur `relation "pieces_jointes" does not exist` réapparaît un jour, c'est que `schema.sql` a divergé à nouveau du code — toujours vérifier la cohérence entre les deux après une modification de controller qui touche au SQL.**

---

## 6. Sécurité — points critiques à connaître

1. **En-tête `Authorization` et serveurs web** : Apache/Nginx ne transmettent PAS `Authorization` à PHP par défaut (CGI/FastCGI/mod_php). `JWT::fromRequest()` lit `$_SERVER['HTTP_AUTHORIZATION']` — sans configuration serveur explicite, **toutes les requêtes authentifiées échouent en 401** (symptôme observé en prod : connexion réussie puis déconnexion immédiate). Corrigé dans `backend/public/.htaccess` (RewriteRule), `docker/nginx.conf` (`fastcgi_param HTTP_AUTHORIZATION`), `docker/httpd-ereclamations.conf` (`CGIPassAuth On`). **Si l'app est redéployée sur un nouveau serveur/stack, revérifier ce point en premier en cas de déconnexion en boucle.**
2. **Correctifs IDOR (2026)** : `ActionController` ne vérifiait initialement AUCUN droit d'accès à la réclamation parente avant d'agir sur ses actions de traitement (CRUD) — un pilote authentifié pouvait manipuler les actions de n'importe quel dossier, même hors de son agence, en devinant l'ID. Corrigé en rendant `ReclamationController::checkAccess()` public et en l'appelant systématiquement dans `ActionController`.
3. **Suppression de référentiels sensibles** : `ParametrageController::delete()` restreint désormais la suppression de `utilisateurs`/`agences`/`ressources` au rôle `administrateur_systeme` uniquement (cohérence avec leur création).
4. **Mots de passe** : hash bcrypt standard PHP (`password_hash`/`password_verify`, `PASSWORD_DEFAULT`). Le mot de passe de test partagé en environnement de démo est `Password@1234` — **à ne jamais réutiliser en production**.
5. **JWT** : HS256 signé avec `JWT_SECRET` (variable d'environnement). Pas de refresh token — durée de vie fixe (`ttlSeconds`, 8h par défaut dans `JWT::encode()`).
6. **Pièces jointes** : contrôle d'accès par agence sur download/delete (corrigé en août 2026, voir historique de conversation), limite 5 Mo appliquée côté serveur (pas seulement côté UI).

---

## 7. Configuration et variables d'environnement

Fichier `backend/.env` (non versionné, voir `.gitignore`) :

```
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...            # à générer de façon aléatoire et robuste en prod
APP_ENV=production|development
CORS_ORIGIN=http://...    # origine exacte du frontend, utilisé pour l'en-tête Access-Control-Allow-Origin
```

Chargé manuellement dans `public/index.php` (parsing ligne par ligne, pas de librairie dotenv).

Frontend : `frontend/.env` avec `VITE_API_URL` (lu via `loadEnv()` dans `vite.config.js` depuis le correctif d'octobre 2026 — ne pas revenir à `process.env.VITE_API_URL`, peu fiable selon le mode Vite).

---

## 8. Dette technique connue / points de vigilance pour une prochaine évolution

- **`ROLE_LABELS` dupliqué** à 4 endroits différents (`roleGuard.js`, `Sidebar.jsx`, `Dashboard.jsx`, `Administration.jsx`) — à factoriser en un seul import pour éviter les désynchronisations si un rôle est renommé.
- **`ParametrageController.php` (1737 lignes)** fait office de controller fourre-tout pour une dizaine de référentiels différents — candidat naturel à un découpage en plusieurs controllers si le projet grossit.
- **Bundle frontend volumineux** : `npm run build` signale un chunk JS > 1.8 Mo (avertissement Vite "chunks larger than 500kB"). Candidat à du code-splitting (`React.lazy`, `manualChunks`) si le temps de chargement initial devient un problème.
- **Vulnérabilités npm connues** (`npm audit` au 2026-08-30) : 8 high / 5 moderate / 1 low. La plupart corrigibles par un simple `npm audit fix` (non testé après coup, à refaire avant mise en prod). Le paquet `xlsx` n'a **aucun correctif disponible** (prototype pollution / ReDoS) — risque réel seulement si des fichiers Excel **uploadés par des utilisateurs** sont parsés avec cette lib (à vérifier dans le code avant de considérer ça comme acceptable).
- **`vite` est resté en v5** volontairement — un `npm audit fix --force` proposerait un saut vers v8 (breaking change majeur), non testé.
- **Pas de tests automatisés** identifiés dans le dépôt (ni PHPUnit côté backend, ni Vitest/Jest côté frontend) — toute la validation faite durant ce projet a été manuelle (via navigateur). À considérer en priorité pour la prochaine itération.
- **Pas de `composer.json`** : si une dépendance PHP externe devient nécessaire un jour (ex. librairie JWT standard, PHPMailer...), il faudra introduire Composer, actuellement absent par choix ("JWT natif PHP").

---

## 9. Déploiement

- **Nouvelle base de données** : `schema.sql` + `seed.sql` suffisent seuls (plus besoin de scripts de migration incrémentale — ceux-ci ont été retirés du dépôt en octobre 2026 après avoir vérifié que `schema.sql`/`seed.sql` contenaient bien tout ce qu'ils ajoutaient, notamment la table `parametres_objectifs` et le processus `NQ` qui en étaient absents avant correctif).
- **Build frontend** : `cd frontend && npm install && npm run build` → dossier `frontend/dist` à servir statiquement (ou à importer dans l'Apache vhost, voir `docker/httpd-ereclamations.conf`).
- **Comptes admin de prod** : scripts prêts dans `deploy/create_admin_systeme_prod.sql` (génère un hash via `php -r "echo password_hash(...)"`, jamais de mot de passe en clair dans le script).
- **Guides utilisateurs** (4 profils : Agent, Pilote, Manager, Superviseur) disponibles dans `guides/` au format CNPS institutionnel (docx + pdf), générés par les scripts dans `deploy/build_guide_*.js`.

---

## 10. Pour aller plus loin — où chercher quoi

| Je veux comprendre... | Je regarde... |
|---|---|
| Qui a le droit de faire quoi | `frontend/src/utils/roleGuard.js` (frontend) + `ReclamationController::checkAccess()` (backend, source de vérité réelle) |
| Le cycle de vie complet d'un ticket | `backend/database/schema.sql` (contrainte CHECK sur `statut`) + `ReclamationController.php` + `ValidationController.php` |
| Toutes les routes API disponibles | Le gros `if/elseif` sur `$segments[0]` dans `backend/public/index.php` |
| Toutes les pages/routes frontend | `frontend/src/App.jsx` |
| Le détail d'une fonctionnalité métier (CNPS, SLA, notifications...) | Rechercher le nom de la fonctionnalité dans les commentaires de `schema.sql` — chaque ajout majeur y est documenté avec sa date |
