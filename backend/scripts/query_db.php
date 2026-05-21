<?php
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    echo "--- PROCESSUS ---\n";
    $stmt = $pdo->query("SELECT * FROM processus");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
