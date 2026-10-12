-- ============================================================
-- Mise a jour d'une base e-Reclamations EXISTANTE
-- ============================================================
-- Rattrape les elements absents de schema.sql/seed.sql avant le
-- correctif d'octobre 2026 :
--   1. Agence Digitale        (portail public + qualification)
--   2. Processus NQ           (processus de repli "Non Qualifie")
--   3. parametres_objectifs   (objectifs SLA du tableau de bord)
--   4. pieces_jointes         (metadonnees des pieces jointes)
--
-- Idempotent : reexecutable sans risque (aucune donnee existante
-- n'est modifiee ni supprimee).
--
-- Usage :
--   psql -h <HOTE> -U <USER> -d <BASE> -f update_existing_db.sql
-- ============================================================

BEGIN;

-- 1. Agence Digitale ------------------------------------------------
-- Le code applicatif la retrouve par son nom (ILIKE '%digitale%').
INSERT INTO agences (nom, code, type, actif)
SELECT 'Agence Digitale', 'ADG', 'agence', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agences WHERE nom ILIKE '%digitale%' OR code = 'ADG'
);

-- 2. Processus de repli "Non Qualifie" ------------------------------
-- Requis par PublicController::submit (reclamations du portail public).
INSERT INTO processus (code, libelle, actif)
SELECT 'NQ', 'Non Qualifié', TRUE
WHERE NOT EXISTS (SELECT 1 FROM processus WHERE code = 'NQ');

-- 3. Objectifs SLA --------------------------------------------------
CREATE TABLE IF NOT EXISTS parametres_objectifs (
    id                      SERIAL PRIMARY KEY,
    objectif_traitement_pct NUMERIC(5,2) NOT NULL DEFAULT 90,
    objectif_delai_pct      NUMERIC(5,2) NOT NULL DEFAULT 90,
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO parametres_objectifs (objectif_traitement_pct, objectif_delai_pct)
SELECT 90, 90
WHERE NOT EXISTS (SELECT 1 FROM parametres_objectifs);

-- 4. Pieces jointes -------------------------------------------------
CREATE TABLE IF NOT EXISTS pieces_jointes (
    id              SERIAL PRIMARY KEY,
    reclamation_id  INTEGER      NOT NULL REFERENCES reclamations(id) ON DELETE CASCADE,
    nom_original    VARCHAR(255) NOT NULL,
    nom_stockage    VARCHAR(255) NOT NULL,
    type_mime       VARCHAR(150) NOT NULL,
    taille          INTEGER      NOT NULL,
    chemin          VARCHAR(500) NOT NULL,
    cree_par        INTEGER      REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_creation   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pieces_jointes_reclamation ON pieces_jointes(reclamation_id);

COMMIT;

-- Verification ------------------------------------------------------
SELECT id, code, nom, type FROM agences WHERE nom ILIKE '%digitale%';
SELECT id, code, libelle   FROM processus WHERE code = 'NQ';
SELECT * FROM parametres_objectifs;
SELECT to_regclass('public.pieces_jointes') AS table_pieces_jointes;
