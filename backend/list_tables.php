<?php
require_once __DIR__ . '/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    $q = $pdo->query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
