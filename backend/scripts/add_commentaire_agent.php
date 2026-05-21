<?php
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    
    // 1. Add commentaire_agent column to reclamations table if it doesn't exist
    $pdo->exec("ALTER TABLE reclamations ADD COLUMN IF NOT EXISTS commentaire_agent TEXT");
    echo "Column commentaire_agent added successfully (or already exists).\n";
    
    // 2. Verify that it was successfully added
    $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reclamations' AND column_name = 'commentaire_agent'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($col) {
        echo "Verification: Column " . $col['column_name'] . " exists with type " . $col['data_type'] . ".\n";
    } else {
        echo "Verification failed: Column does not exist.\n";
    }
} catch (Exception $e) {
    echo "Error adding column: " . $e->getMessage() . "\n";
}
