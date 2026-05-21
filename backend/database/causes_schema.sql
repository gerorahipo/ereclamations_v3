-- Création des tables pour la gestion des causes
CREATE TABLE IF NOT EXISTS categories_causes (
    id SERIAL PRIMARY KEY,
    processus_id INTEGER REFERENCES processus(id),
    libelle VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS causes (
    id SERIAL PRIMARY KEY,
    categorie_id INTEGER REFERENCES categories_causes(id),
    libelle TEXT NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de quelques catégories par défaut pour les processus existants
INSERT INTO categories_causes (processus_id, libelle)
SELECT id, 'Cause Client' FROM processus;

INSERT INTO categories_causes (processus_id, libelle)
SELECT id, 'Cause CNPS' FROM processus;
