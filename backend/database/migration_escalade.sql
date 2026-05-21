-- Migration : Support Escalade
-- 1. Ajout de la colonne metadata à la table historique si elle n'existe pas
ALTER TABLE historique ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Mise à jour de la contrainte CHECK sur action_type pour inclure 'escalade'
-- On doit d'abord supprimer l'ancienne contrainte car elle est nommée différemment selon l'installation
-- On cherche le nom de la contrainte (souvent historique_action_type_check)
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    SELECT conname INTO constraint_name 
    FROM pg_constraint 
    WHERE conrelid = 'historique'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%action_type%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE historique DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE historique ADD CONSTRAINT historique_action_type_check 
CHECK (action_type IN (
    'creation', 'affectation', 'prise_en_charge',
    'soumission_validation', 'validation', 'retour_pilote',
    'resolution', 'commentaire', 'action_ajoutee', 'escalade'
));
