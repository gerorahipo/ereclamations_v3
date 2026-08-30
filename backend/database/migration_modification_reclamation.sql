-- ============================================================
-- Migration : Modification traçable d'une réclamation (Exigence 10)
-- Date : 2026-08-29
-- ------------------------------------------------------------
-- Ajoute le type d'action 'modification' à la contrainte CHECK de la
-- table historique, pour permettre l'agent créateur à corriger sa
-- réclamation (nouveau/en_cours) avec traçabilité complète.
-- Idempotent : réexécutable sans erreur.
-- ============================================================

BEGIN;

ALTER TABLE historique DROP CONSTRAINT IF EXISTS historique_action_type_check;

-- Le type 'document' (pièces jointes) et 'qualification' (portail Non
-- Qualifié) étaient déjà utilisés en pratique mais absents de l'ancienne
-- contrainte (qui, de fait, n'était plus respectée par les données
-- existantes) : ils sont donc ajoutés ici pour refléter l'usage réel.
ALTER TABLE historique
    ADD CONSTRAINT historique_action_type_check
    CHECK (action_type IN (
        'creation', 'affectation', 'prise_en_charge',
        'soumission_validation', 'validation', 'retour_pilote',
        'resolution', 'commentaire', 'action_ajoutee',
        'admin_action', 'login_success', 'login_failed', 'password_change',
        'escalade', 'modification', 'document', 'qualification'
    ));

COMMIT;

-- Vérification :
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'historique_action_type_check';
