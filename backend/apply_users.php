<?php
spl_autoload_register(function (string $class): void {
    $base = __DIR__ . '/src/';
    $file = $base . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Config\Database;

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();
    $sql = file_get_contents('add_demo_users.sql');
    $pdo->exec($sql);
    $pdo->commit();
    echo "SQL script applied successfully.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
