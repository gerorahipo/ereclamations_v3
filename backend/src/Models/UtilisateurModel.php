<?php
// ============================================================
// Models/UtilisateurModel.php
// ============================================================

namespace App\Models;

use App\Config\Database;
use PDO;

class UtilisateurModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function findByEmail(string $email): array|false
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.email, u.password, u.role, u.actif,
                   r.nom, r.prenoms, r.matricule, r.agence_id,
                   a.code AS agence_code, a.nom AS agence_nom, a.type AS agence_type
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            JOIN agences    a ON a.id = r.agence_id
            WHERE u.email = :email AND u.actif = TRUE
        ");
        $stmt->execute([':email' => $email]);
        return $stmt->fetch();
    }

    public function updateLastLogin(int $id): void
    {
        $this->pdo->prepare("UPDATE utilisateurs SET last_login = NOW() WHERE id = :id")
            ->execute([':id' => $id]);
    }

    /**
     * Récupère les pilotes d'une agence (pour affectation)
     */
    public function getPilotesByAgence(int $agenceId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, r.nom, r.prenoms, r.matricule, u.email
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            WHERE r.agence_id = :agence_id AND u.role = 'pilote' AND u.actif = TRUE
            ORDER BY r.nom
        ");
        $stmt->execute([':agence_id' => $agenceId]);
        return $stmt->fetchAll();
    }

    public function getCoordonnateursByAgence(int $agenceId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, r.nom, r.prenoms, u.email
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            WHERE r.agence_id = :agence_id AND u.role = 'coordonnateur' AND u.actif = TRUE
        ");
        $stmt->execute([':agence_id' => $agenceId]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.email, u.role, r.nom, r.prenoms
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            WHERE u.id = :id
        ");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}
