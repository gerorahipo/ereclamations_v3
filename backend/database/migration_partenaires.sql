-- migration_partenaires.sql
-- Ajout des tables pour les partenaires sociaux (Travailleurs, Employeurs, Sinistres)

CREATE TABLE IF NOT EXISTS travailleurs (
    id            SERIAL PRIMARY KEY,
    numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
    nom           VARCHAR(100) NOT NULL,
    prenoms       VARCHAR(150) NOT NULL,
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employeurs (
    id            SERIAL PRIMARY KEY,
    numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
    raison_sociale VARCHAR(300) NOT NULL,
    nom_employeur VARCHAR(250),
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sinistres (
    id            SERIAL PRIMARY KEY,
    numero_sinistre VARCHAR(50)  NOT NULL UNIQUE,
    nom           VARCHAR(100) NOT NULL,
    prenoms       VARCHAR(150) NOT NULL,
    telephone     VARCHAR(30),
    email         VARCHAR(200),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Mise à jour de la contrainte historique pour accepter admin_action et login_success/failed
-- On supprime d'abord les lignes qui violent la contrainte future (si migration non encore appliquée)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'historique_action_type_check'
    ) THEN
        ALTER TABLE historique DROP CONSTRAINT historique_action_type_check;
    END IF;
END $$;

-- Supprimer les lignes d'historique avec des types non conformes (admin_action, login_* etc.)
-- plutôt que d'essayer de les conserver
DELETE FROM historique 
WHERE action_type NOT IN (
    'creation', 'affectation', 'prise_en_charge',
    'soumission_validation', 'validation', 'retour_pilote',
    'resolution', 'commentaire', 'action_ajoutee',
    'admin_action', 'login_success', 'login_failed', 'password_change',
    'escalade'
);

ALTER TABLE historique ADD CONSTRAINT historique_action_type_check 
    CHECK (action_type IN (
        'creation', 'affectation', 'prise_en_charge',
        'soumission_validation', 'validation', 'retour_pilote',
        'resolution', 'commentaire', 'action_ajoutee',
        'admin_action', 'login_success', 'login_failed', 'password_change',
        'escalade'
    ));
