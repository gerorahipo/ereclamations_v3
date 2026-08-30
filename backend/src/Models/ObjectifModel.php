<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class ObjectifModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function get(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM parametres_objectifs ORDER BY id LIMIT 1");
        $res = $stmt->fetch();
        return $res ?: ['objectif_traitement_pct' => 90, 'objectif_delai_pct' => 90];
    }

    public function save(array $data): bool
    {
        $existing = $this->pdo->query("SELECT id FROM parametres_objectifs ORDER BY id LIMIT 1")->fetch();

        if ($existing) {
            $stmt = $this->pdo->prepare("
                UPDATE parametres_objectifs
                SET objectif_traitement_pct = :traitement,
                    objectif_delai_pct      = :delai,
                    updated_at = NOW()
                WHERE id = :id
            ");
            return $stmt->execute([
                ':traitement' => $data['objectif_traitement_pct'],
                ':delai'      => $data['objectif_delai_pct'],
                ':id'         => $existing['id'],
            ]);
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO parametres_objectifs (objectif_traitement_pct, objectif_delai_pct)
            VALUES (:traitement, :delai)
        ");
        return $stmt->execute([
            ':traitement' => $data['objectif_traitement_pct'],
            ':delai'      => $data['objectif_delai_pct'],
        ]);
    }
}
