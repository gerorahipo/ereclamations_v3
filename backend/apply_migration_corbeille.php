<?php
require_once __DIR__ . '/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/database/migration_corbeille_escalade.sql');
    $pdo->exec($sql);
    echo "Migration corbeille d'escalade appliquée avec succès !\n";
} catch (Exception $e) {
    echo "Erreur lors de l'application de la migration : " . $e->getMessage() . "\n";
    exit(1);
}
