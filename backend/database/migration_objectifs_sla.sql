-- ============================================================
-- Migration : Objectifs SLA configurables (tableau de bord)
-- ============================================================

CREATE TABLE IF NOT EXISTS parametres_objectifs (
    id                      SERIAL PRIMARY KEY,
    objectif_traitement_pct NUMERIC(5,2) NOT NULL DEFAULT 90,
    objectif_delai_pct      NUMERIC(5,2) NOT NULL DEFAULT 90,
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO parametres_objectifs (objectif_traitement_pct, objectif_delai_pct)
SELECT 90, 90
WHERE NOT EXISTS (SELECT 1 FROM parametres_objectifs);
