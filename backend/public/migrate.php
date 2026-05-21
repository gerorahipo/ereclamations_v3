<?php
// migrate.php - Temporary migration trigger
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

header('Content-Type: text/plain');

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/../database/migration_escalade.sql');
    $pdo->exec($sql);
    echo "SUCCESS: Migration appliquée.";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
