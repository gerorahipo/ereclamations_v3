<?php
require_once __DIR__ . '/../backend/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    echo "--- AGENCES ---\n";
    $stmt = $pdo->query("SELECT * FROM agences");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

    echo "\n--- COLUMNS IN RECLAMATIONS ---\n";
    $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reclamations'");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
