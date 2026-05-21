<?php
// ============================================================
// Config/Database.php — Connexion PDO PostgreSQL
// Lit les variables d'environnement Docker / DDEV
// ============================================================

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host     = getenv('DB_HOST')     ?: 'db';
            $port     = getenv('DB_PORT')     ?: '5432';
            $dbname   = getenv('DB_NAME')     ?: 'db';
            $user     = getenv('DB_USER')     ?: 'db';
            $password = getenv('DB_PASSWORD') ?: 'db';

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

            try {
                self::$instance = new PDO($dsn, $user, $password, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                self::$instance->exec("SET client_encoding TO 'UTF8'");
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                http_response_code(503);
                echo json_encode(['error' => 'Service indisponible']);
                exit;
            }
        }

        return self::$instance;
    }
}
