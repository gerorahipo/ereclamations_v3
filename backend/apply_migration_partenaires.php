<?php
// apply_migration_partenaires.php
require_once __DIR__ . '/src/Config/Database.php';
use App\Config\Database;

header('Content-Type: application/json');

try {
    $pdo = Database::getConnection();
    $results = [];

    // 1. Créer les tables partenaires (si elles n'existent pas)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS travailleurs (
            id            SERIAL PRIMARY KEY,
            numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
            nom           VARCHAR(100) NOT NULL,
            prenoms       VARCHAR(150) NOT NULL,
            telephone     VARCHAR(30),
            email         VARCHAR(200),
            created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
        )
    ");
    $results[] = 'Table travailleurs: OK';

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS employeurs (
            id            SERIAL PRIMARY KEY,
            numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
            raison_sociale VARCHAR(300) NOT NULL,
            nom_employeur VARCHAR(250),
            telephone     VARCHAR(30),
            email         VARCHAR(200),
            created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
        )
    ");
    $results[] = 'Table employeurs: OK';

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sinistres (
            id            SERIAL PRIMARY KEY,
            numero_sinistre VARCHAR(50)  NOT NULL UNIQUE,
            nom           VARCHAR(100) NOT NULL,
            prenoms       VARCHAR(150) NOT NULL,
            telephone     VARCHAR(30),
            email         VARCHAR(200),
            created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
        )
    ");
    $results[] = 'Table sinistres: OK';

    // 2. Mettre à jour la contrainte historique
    // Supprimer les lignes en violation d'abord
    $deleted = $pdo->exec("
        DELETE FROM historique 
        WHERE action_type NOT IN (
            'creation', 'affectation', 'prise_en_charge',
            'soumission_validation', 'validation', 'retour_pilote',
            'resolution', 'commentaire', 'action_ajoutee',
            'admin_action', 'login_success', 'login_failed', 'password_change',
            'escalade'
        )
    ");
    $results[] = "Lignes historique nettoyées: $deleted";

    // Supprimer la contrainte existante
    $pdo->exec("ALTER TABLE historique DROP CONSTRAINT IF EXISTS historique_action_type_check");
    $results[] = 'Ancienne contrainte supprimée: OK';

    // Ajouter la nouvelle contrainte élargie
    $pdo->exec("
        ALTER TABLE historique ADD CONSTRAINT historique_action_type_check 
        CHECK (action_type IN (
            'creation', 'affectation', 'prise_en_charge',
            'soumission_validation', 'validation', 'retour_pilote',
            'resolution', 'commentaire', 'action_ajoutee',
            'admin_action', 'login_success', 'login_failed', 'password_change',
            'escalade'
        ))
    ");
    $results[] = 'Nouvelle contrainte historique: OK';

    echo json_encode(['success' => true, 'steps' => $results]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
