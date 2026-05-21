-- ============================================================
-- Knowledge Base Schema (Suggestions de Réponses)
-- ============================================================

CREATE TABLE IF NOT EXISTS suggestions_reponses (
    id          SERIAL PRIMARY KEY,
    motif_id    INTEGER REFERENCES motifs(id) ON DELETE SET NULL,
    cause_id    INTEGER REFERENCES causes(id) ON DELETE SET NULL,
    titre       VARCHAR(255) NOT NULL,
    contenu     TEXT NOT NULL,
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestions_motif ON suggestions_reponses(motif_id);
CREATE INDEX idx_suggestions_cause ON suggestions_reponses(cause_id);

-- Trigger pour updated_at
CREATE TRIGGER trg_suggestions_reponses_updated_at
    BEFORE UPDATE ON suggestions_reponses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Quelques exemples de base
INSERT INTO suggestions_reponses (titre, contenu) VALUES 
('Remerciements standard', 'Nous vous remercions pour votre message. Nous avons bien pris en compte votre réclamation et nos services travaillent à sa résolution dans les plus brefs délais.'),
('Clôture positive', 'Après analyse de votre dossier, nous avons procédé à la régularisation de votre situation. Votre paiement sera effectif sous 48h.');
