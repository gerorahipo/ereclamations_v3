<?php
require_once __DIR__ . '/src/Config/Database.php';

use App\Config\Database;

try {
    $pdo = Database::getConnection();

    $sql = "
    CREATE TABLE IF NOT EXISTS travailleurs (
        id            SERIAL PRIMARY KEY,
        numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
        nom           VARCHAR(100) NOT NULL,
        prenoms       VARCHAR(150) NOT NULL,
        telephone     VARCHAR(30),
        email         VARCHAR(200),
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employeurs (
        id            SERIAL PRIMARY KEY,
        numero_cnps   VARCHAR(50)  NOT NULL UNIQUE,
        raison_sociale VARCHAR(300) NOT NULL,
        nom_employeur VARCHAR(250),
        telephone     VARCHAR(30),
        email         VARCHAR(200),
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sinistres (
        id            SERIAL PRIMARY KEY,
        numero_sinistre VARCHAR(50)  NOT NULL UNIQUE,
        nom           VARCHAR(100) NOT NULL,
        prenoms       VARCHAR(150) NOT NULL,
        telephone     VARCHAR(30),
        email         VARCHAR(200),
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
    );
    ";

    $pdo->exec($sql);
    echo "Tables travailleurs, employeurs, sinistres créées avec succès.\n";

} catch (\Throwable $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
}
