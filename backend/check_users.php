<?php
require_once __DIR__ . '/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    echo "--- UTILISATEURS ---\n";
    $stmt = $pdo->query("
        SELECT u.id, u.email, u.role, u.actif, r.agence_id, a.nom as agence_nom
        FROM utilisateurs u
        JOIN ressources r ON r.id = u.ressource_id
        JOIN agences a ON a.id = r.agence_id
    ");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
