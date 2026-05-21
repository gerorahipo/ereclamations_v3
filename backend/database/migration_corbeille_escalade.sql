-- Migration : Corbeille et Cycle d'Escalade
-- 1. Ajout de la colonne pilote_escaladeur_id à la table reclamations
ALTER TABLE reclamations ADD COLUMN IF NOT EXISTS pilote_escaladeur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL;
