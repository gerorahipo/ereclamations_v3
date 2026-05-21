<?php
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    
    echo "=== USERS IN AGENCE DIGITALE ===\n";
    $users = $pdo->query("
        SELECT u.id, u.email, u.role, u.actif, r.nom as ressource_nom, a.nom as agence_nom
        FROM utilisateurs u
        JOIN ressources r ON r.id = u.ressource_id
        JOIN agences a ON a.id = r.agence_id
        WHERE a.id = 6
        ORDER BY u.role
    ")->fetchAll(PDO::FETCH_ASSOC);
    print_r($users);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
