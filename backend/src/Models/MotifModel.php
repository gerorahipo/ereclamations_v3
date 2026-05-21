<?php
// ============================================================
// Models/MotifModel.php
// ============================================================

namespace App\Models;

use App\Config\Database;
use PDO;

class MotifModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function findAll(?int $processusId = null): array
    {
        $sql    = "SELECT m.*, p.libelle AS processus_libelle, p.code AS processus_code
                   FROM motifs m JOIN processus p ON p.id = m.processus_id
                   WHERE m.actif = TRUE";
        $params = [];

        if ($processusId) {
            $sql .= " AND m.processus_id = :pid";
            $params[':pid'] = $processusId;
        }

        $sql .= " ORDER BY p.libelle, m.categorie, m.objet";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $stmt = $this->pdo->prepare("
            SELECT m.*, p.code AS processus_code, p.libelle AS processus_libelle
            FROM motifs m JOIN processus p ON p.id = m.processus_id
            WHERE m.id = :id
        ");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO motifs (processus_id, categorie, objet, delai_sla_jours)
            VALUES (:pid, :cat, :obj, :sla) RETURNING id
        ");
        $stmt->execute([
            ':pid' => $data['processus_id'],
            ':cat' => $data['categorie'],
            ':obj' => $data['objet'],
            ':sla' => $data['delai_sla_jours'] ?? 5,
        ]);
        return (int)$stmt->fetch()['id'];
    }
}
