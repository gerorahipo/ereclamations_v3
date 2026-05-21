<?php
// ============================================================
// Models/AgenceModel.php
// ============================================================

namespace App\Models;

use App\Config\Database;
use PDO;

class AgenceModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function findAll(): array
    {
        $stmt = $this->pdo->query(
            "SELECT * FROM agences WHERE actif = TRUE ORDER BY type DESC, nom"
        );
        return $stmt->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $stmt = $this->pdo->prepare("SELECT * FROM agences WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public function isCentrale(int $agenceId): bool
    {
        $agence = $this->findById($agenceId);
        return $agence && $agence['type'] === 'centrale';
    }
}
