-- ============================================================
-- Migration : refonte des profils utilisateurs
-- Date : 2026-08-11
-- ------------------------------------------------------------
-- Objectif :
--   1. Dissocier le rôle "coordonnateur" détourné : l'usage actuel
--      (Manager de service/section accueil réclamations qui clôture les
--      tickets) devient le rôle "manager". Le rôle "coordonnateur" est
--      restauré dans son sens d'origine (structure centrale, analyse).
--   2. Scinder "administrateur" en "administrateur_fonctionnel"
--      (référentiels métier) et "administrateur_systeme" (technique).
--
-- Bascule des comptes existants :
--   - coordonnateur  -> manager
--   - administrateur -> administrateur_systeme (par défaut ; à réaffecter
--     en administrateur_fonctionnel au cas par cas via l'écran Utilisateurs)
--
-- Idempotent : réexécutable sans erreur.
-- ============================================================

BEGIN;

-- 1. Retirer l'ancienne contrainte CHECK (le nom par défaut d'une
--    contrainte CHECK inline sur la colonne "role" est
--    "utilisateurs_role_check").
ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

-- 2. Élargir la colonne si besoin (les nouveaux libellés sont plus longs).
ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(40);

-- 3. Basculer les comptes existants vers les nouveaux rôles.
UPDATE utilisateurs SET role = 'manager'                WHERE role = 'coordonnateur';
UPDATE utilisateurs SET role = 'administrateur_systeme' WHERE role = 'administrateur';

-- 4. Rétablir la contrainte avec le nouvel ensemble de rôles.
ALTER TABLE utilisateurs
    ADD CONSTRAINT utilisateurs_role_check
    CHECK (role IN (
        'agent',
        'pilote',
        'coordonnateur',
        'manager',
        'superviseur',
        'administrateur_fonctionnel',
        'administrateur_systeme'
    ));

COMMIT;

-- Vérification :
--   SELECT role, COUNT(*) FROM utilisateurs GROUP BY role ORDER BY role;
