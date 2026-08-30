-- ============================================================
-- Migration : Centre de notifications in-app
-- Date : 2026-08-29
-- ------------------------------------------------------------
-- Notifications adressées à un utilisateur, liées (optionnellement)
-- à une réclamation, avec statut lu/non lu.
-- Idempotent : réexécutable sans erreur.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    reclamation_id  INTEGER REFERENCES reclamations(id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL,
    titre           VARCHAR(255) NOT NULL,
    message         TEXT,
    lu              BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_lu   ON notifications(utilisateur_id, lu);
CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON notifications(utilisateur_id, date_creation DESC);

-- Vérification :
--   SELECT type, COUNT(*) FROM notifications GROUP BY type;
