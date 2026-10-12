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

\set ON_ERROR_STOP on

BEGIN;

-- 1. Agence Digitale ------------------------------------------------
-- Creee avec l'id 6 EXPLICITE (le code applicatif actuel en depend).
--   - deja presente (code ADG ou nom "digitale") : rien n'est cree ; un
--     avertissement est affiche si son id n'est pas 6, et son code est
--     aligne sur 'ADG' si besoin.
--   - id 6 deja occupe par une autre agence : le script s'arrete et
--     annule tout (aucune modification).
--   - la sequence agences_id_seq est resynchronisee pour que les
--     prochaines agences creees n'entrent pas en collision avec l'id 6.
DO $$
DECLARE
    v_id      INTEGER;
    v_code    VARCHAR;
    v_occupant VARCHAR;
BEGIN
    SELECT id, code INTO v_id, v_code
    FROM agences
    WHERE code = 'ADG' OR nom ILIKE '%digitale%'
    ORDER BY (code = 'ADG') DESC, id
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        IF v_id <> 6 THEN
            RAISE WARNING 'Agence Digitale deja presente avec id=% (attendu: 6). Aucune creation.', v_id;
        ELSE
            RAISE NOTICE 'Agence Digitale deja presente (id=6). Aucune creation.';
        END IF;
        IF v_code <> 'ADG' AND NOT EXISTS (SELECT 1 FROM agences WHERE code = 'ADG') THEN
            UPDATE agences SET code = 'ADG' WHERE id = v_id;
            RAISE NOTICE 'Code de l''agence id=% aligne sur ADG.', v_id;
        END IF;
    ELSE
        SELECT nom INTO v_occupant FROM agences WHERE id = 6;
        IF v_occupant IS NOT NULL THEN
            RAISE EXCEPTION 'Creation impossible : l''id 6 est deja occupe par l''agence "%". Aucune modification appliquee.', v_occupant;
        END IF;
        INSERT INTO agences (id, nom, code, type, actif)
        VALUES (6, 'Agence Digitale', 'ADG', 'agence', TRUE);
        RAISE NOTICE 'Agence Digitale creee (id=6, code=ADG).';
    END IF;

    PERFORM setval(pg_get_serial_sequence('agences', 'id'), (SELECT MAX(id) FROM agences));
END $$;

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
