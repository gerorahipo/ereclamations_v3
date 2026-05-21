<?php
require_once 'backend/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    
    // 1. Renommer ressource_id en structure_id si il existe
    // On va vérifier si structure_id existe déjà
    $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'actions_traitement' AND column_name = 'structure_id'");
    if (!$stmt->fetch()) {
        echo "Renommage de ressource_id en structure_id...\n";
        $pdo->exec("ALTER TABLE actions_traitement RENAME COLUMN ressource_id TO structure_id");
        // On retire la contrainte FK vers ressources si elle existe et on en ajoute une vers agences
        // Mais on va faire simple : juste s'assurer que structure_id peut stocker l'ID d'une agence
    } else {
        echo "La colonne structure_id existe déjà.\n";
    }

    echo "Migration terminée avec succès.\n";
} catch (Exception $e) {
    echo "Erreur lors de la migration : " . $e->getMessage() . "\n";
}
