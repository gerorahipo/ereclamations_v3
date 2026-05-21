-- ============================================================
-- Mise à jour de la Base de Connaissances (KB)
-- ============================================================

-- Table principale des entrées de la base de connaissances
CREATE TABLE IF NOT EXISTS kb_entries (
    id              SERIAL PRIMARY KEY,
    sous_motif_id   INTEGER NOT NULL REFERENCES sous_motifs(id) ON DELETE CASCADE,
    titre           VARCHAR(255) NOT NULL,
    analyse_type    TEXT NOT NULL,
    actions_types   JSONB DEFAULT '[]'::jsonb, -- Liste des actions types [{libelle: "...", ressource_id: ...}]
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_sous_motif ON kb_entries(sous_motif_id);

-- Migration des anciennes suggestions vers la nouvelle table si nécessaire
-- Note: On garde suggestions_reponses pour l'instant pour la compatibilité descendante
-- mais on privilégiera kb_entries pour la nouvelle interface.
