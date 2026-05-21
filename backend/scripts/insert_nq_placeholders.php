<?php
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    
    // Check if the NQ process already exists
    $stmt = $pdo->prepare("SELECT id FROM processus WHERE code = ?");
    $stmt->execute(['NQ']);
    $processId = $stmt->fetchColumn();
    
    if (!$processId) {
        $stmtInsert = $pdo->prepare("INSERT INTO processus (code, libelle, actif) VALUES (?, ?, ?)");
        $stmtInsert->execute(['NQ', 'Non Qualifié', 1]);
        echo "Created process 'Non Qualifié' (code = 'NQ').\n";
    } else {
        echo "Process 'Non Qualifié' (code = 'NQ') already exists.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
