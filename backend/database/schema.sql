-- ============================================================
-- eReclamations CNPS CI — Schéma PostgreSQL
-- Version: 1.0 | Date: 2026-04-24
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. AGENCES
-- ============================================================
CREATE TABLE agences (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(200) NOT NULL,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    type        VARCHAR(20)  NOT NULL DEFAULT 'agence' CHECK (type IN ('agence', 'centrale')),
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. RESSOURCES (Agents CNPS)
-- ============================================================
CREATE TABLE ressources (
    id          SERIAL PRIMARY KEY,
    matricule   VARCHAR(30)  NOT NULL UNIQUE,
    nom         VARCHAR(100) NOT NULL,
    prenoms     VARCHAR(150) NOT NULL,
    agence_id   INTEGER      NOT NULL REFERENCES agences(id) ON DELETE RESTRICT,
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. UTILISATEURS
-- ============================================================
CREATE TABLE utilisateurs (
    id           SERIAL PRIMARY KEY,
    ressource_id INTEGER      NOT NULL REFERENCES ressources(id) ON DELETE CASCADE,
    email        VARCHAR(200) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    role         VARCHAR(30)  NOT NULL CHECK (role IN ('agent', 'pilote', 'coordonnateur', 'superviseur')),
    actif        BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login   TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. PARAMÉTRAGE MÉTIER (Nouveau)
-- ============================================================

CREATE TABLE regimes (
    id      SERIAL PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL UNIQUE,
    actif   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE types_clients (
    id         SERIAL PRIMARY KEY,
    regime_id  INTEGER      NOT NULL REFERENCES regimes(id) ON DELETE CASCADE,
    libelle    VARCHAR(150) NOT NULL,
    actif      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE modes_saisine (
    id      SERIAL PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL UNIQUE,
    actif   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 5. PROCESSUS CNPS
-- ============================================================
CREATE TABLE processus (
    id        SERIAL PRIMARY KEY,
    code      VARCHAR(30)  NOT NULL UNIQUE,
    libelle   VARCHAR(200) NOT NULL,
    actif     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 6. MOTIFS ET SOUS-MOTIFS
-- ============================================================
CREATE TABLE motifs (
    id              SERIAL PRIMARY KEY,
    regime_id       INTEGER      REFERENCES regimes(id) ON DELETE SET NULL,
    type_client_id  INTEGER      REFERENCES types_clients(id) ON DELETE SET NULL,
    categorie       VARCHAR(150) NOT NULL,
    objet           VARCHAR(300) NOT NULL,
    actif           BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE sous_motifs (
    id                    SERIAL PRIMARY KEY,
    motif_id              INTEGER      NOT NULL REFERENCES motifs(id) ON DELETE CASCADE,
    libelle               VARCHAR(300) NOT NULL,
    delai_traitement_jours INTEGER      NOT NULL DEFAULT 5 CHECK (delai_traitement_jours > 0),
    actif                 BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 7. IMPUTATION AUTOMATIQUE
-- ============================================================
CREATE TABLE affectations_pilotes (
    id           SERIAL PRIMARY KEY,
    agence_id    INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
    processus_id INTEGER NOT NULL REFERENCES processus(id) ON DELETE CASCADE,
    pilote_id    INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    UNIQUE(agence_id, processus_id, pilote_id)
);

-- ============================================================
-- 8. PARTENAIRES SOCIAUX (Entreprises & Travailleurs)
-- ============================================================
CREATE TABLE partenaires (
    id            SERIAL PRIMARY KEY,
    type          VARCHAR(20)  NOT NULL CHECK (type IN ('entreprise', 'travailleur')),
    numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
    nom           VARCHAR(300) NOT NULL,
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE travailleurs (
    id            SERIAL PRIMARY KEY,
    numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
    nom           VARCHAR(100) NOT NULL,
    prenoms       VARCHAR(150) NOT NULL,
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE employeurs (
    id            SERIAL PRIMARY KEY,
    numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
    raison_sociale VARCHAR(300) NOT NULL,
    nom_employeur VARCHAR(250),
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE sinistres (
    id            SERIAL PRIMARY KEY,
    numero_sinistre VARCHAR(50)  NOT NULL UNIQUE,
    nom           VARCHAR(100) NOT NULL,
    prenoms       VARCHAR(150) NOT NULL,
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. RÉCLAMATIONS (Mise à jour)
-- ============================================================
CREATE TABLE reclamations (
    id                SERIAL PRIMARY KEY,
    numero_ticket     VARCHAR(30)  NOT NULL UNIQUE,
    partenaire_type   VARCHAR(20)  NOT NULL CHECK (partenaire_type IN ('entreprise', 'travailleur')),
    partenaire_id     INTEGER      REFERENCES partenaires(id) ON DELETE SET NULL,
    partenaire_nom    VARCHAR(300),
    partenaire_nom_prenoms VARCHAR(300),
    partenaire_raison_sociale VARCHAR(300),
    partenaire_identifiant VARCHAR(100),
    partenaire_sexe   CHAR(1),
    partenaire_telephone VARCHAR(50),
    partenaire_email  VARCHAR(150),
    partenaire_employeur VARCHAR(300),
    partenaire_employeur_numero_cnps VARCHAR(50),
    date_reception    DATE,
    -- Nouveaux champs de paramétrage
    regime_id         INTEGER      NOT NULL REFERENCES regimes(id),
    type_client_id    INTEGER      NOT NULL REFERENCES types_clients(id),
    mode_saisine_id   INTEGER      NOT NULL REFERENCES modes_saisine(id),
    processus_id      INTEGER      NOT NULL REFERENCES processus(id),
    motif_id          INTEGER      NOT NULL REFERENCES motifs(id),
    sous_motif_id     INTEGER      NOT NULL REFERENCES sous_motifs(id),
    
    description       TEXT,
    statut            VARCHAR(30)  NOT NULL DEFAULT 'nouveau'
                        CHECK (statut IN ('nouveau','en_cours','a_valider','resolu','rejete')),
    hors_sla          BOOLEAN      NOT NULL DEFAULT FALSE,
    agent_createur_id INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
    pilote_id         INTEGER      REFERENCES utilisateurs(id) ON DELETE SET NULL,
    agence_id         INTEGER      NOT NULL REFERENCES agences(id) ON DELETE RESTRICT,
    date_creation     TIMESTAMP    NOT NULL DEFAULT NOW(),
    date_echeance_sla TIMESTAMP    NOT NULL,
    date_resolution   TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Index mis à jour
CREATE INDEX idx_reclamations_statut       ON reclamations(statut);
CREATE INDEX idx_reclamations_agence       ON reclamations(agence_id);
CREATE INDEX idx_reclamations_pilote       ON reclamations(pilote_id);
CREATE INDEX idx_reclamations_agent        ON reclamations(agent_createur_id);
CREATE INDEX idx_reclamations_date         ON reclamations(date_creation DESC);
CREATE INDEX idx_reclamations_sla          ON reclamations(date_echeance_sla) WHERE statut != 'resolu';
CREATE INDEX idx_reclamations_processus    ON reclamations(processus_id);

-- Séquence pour numéros de tickets
CREATE SEQUENCE ticket_seq START 1;

-- Fonction génération numéro ticket MISE À JOUR : Calcul SLA via sous_motif
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_ticket := 'REC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                         LPAD(nextval('ticket_seq')::TEXT, 6, '0');
    
    -- Calcul du SLA basé sur le sous-motif sélectionné
    NEW.date_echeance_sla := NEW.date_creation + INTERVAL '1 day' *
                             (SELECT delai_traitement_jours FROM sous_motifs WHERE id = NEW.sous_motif_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reclamation_before_insert
    BEFORE INSERT ON reclamations
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reclamations_updated_at
    BEFORE UPDATE ON reclamations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. ACTIONS DE TRAITEMENT
-- ============================================================
CREATE TABLE actions_traitement (
    id              SERIAL PRIMARY KEY,
    reclamation_id  INTEGER      NOT NULL REFERENCES reclamations(id) ON DELETE CASCADE,
    libelle         VARCHAR(300) NOT NULL,
    ressource_id    INTEGER      REFERENCES ressources(id) ON DELETE SET NULL,
    echeance        DATE,
    statut          VARCHAR(30)  NOT NULL DEFAULT 'en_attente'
                      CHECK (statut IN ('en_attente', 'en_cours', 'termine')),
    observations    TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actions_reclamation ON actions_traitement(reclamation_id);

-- ============================================================
-- 9. HISTORIQUE (Timeline)
-- ============================================================
CREATE TABLE historique (
    id              SERIAL PRIMARY KEY,
    reclamation_id  INTEGER      NOT NULL REFERENCES reclamations(id) ON DELETE CASCADE,
    acteur_id       INTEGER      REFERENCES utilisateurs(id) ON DELETE SET NULL,
    acteur_nom      VARCHAR(250),  -- Dénormalisation
    action_type     VARCHAR(50)  NOT NULL
                      CHECK (action_type IN (
                        'creation', 'affectation', 'prise_en_charge',
                        'soumission_validation', 'validation', 'retour_pilote',
                        'resolution', 'commentaire', 'action_ajoutee'
                      )),
    commentaire     TEXT,
    date_action     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_reclamation ON historique(reclamation_id);
CREATE INDEX idx_historique_date        ON historique(date_action DESC);
