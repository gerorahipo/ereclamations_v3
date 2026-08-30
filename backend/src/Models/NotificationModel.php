<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class NotificationModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─── Crée une notification pour un utilisateur ──────────
    public function create(int $userId, ?int $reclamationId, string $type, string $titre, ?string $message = null): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO notifications (utilisateur_id, reclamation_id, type, titre, message)
            VALUES (:uid, :rid, :type, :titre, :message)
        ");
        $stmt->execute([
            ':uid'     => $userId,
            ':rid'     => $reclamationId,
            ':type'    => $type,
            ':titre'   => $titre,
            ':message' => $message,
        ]);
    }

    // ─── Crée la même notification pour plusieurs utilisateurs ──
    public function createForMany(array $userIds, ?int $reclamationId, string $type, string $titre, ?string $message = null): void
    {
        foreach (array_unique(array_filter($userIds)) as $uid) {
            $this->create((int)$uid, $reclamationId, $type, $titre, $message);
        }
    }

    // ─── Liste les notifications d'un utilisateur (les plus récentes d'abord) ──
    public function listForUser(int $userId, int $limit = 30): array
    {
        $stmt = $this->pdo->prepare("
            SELECT n.*, r.numero_ticket
            FROM notifications n
            LEFT JOIN reclamations r ON r.id = n.reclamation_id
            WHERE n.utilisateur_id = :uid
            ORDER BY n.date_creation DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function unreadCount(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM notifications WHERE utilisateur_id = :uid AND lu = FALSE");
        $stmt->execute([':uid' => $userId]);
        return (int)$stmt->fetchColumn();
    }

    // ─── Marque une notification comme lue (scopée au propriétaire) ──
    public function markRead(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare("UPDATE notifications SET lu = TRUE WHERE id = :id AND utilisateur_id = :uid");
        $stmt->execute([':id' => $id, ':uid' => $userId]);
        return $stmt->rowCount() > 0;
    }

    public function markAllRead(int $userId): void
    {
        $stmt = $this->pdo->prepare("UPDATE notifications SET lu = TRUE WHERE utilisateur_id = :uid AND lu = FALSE");
        $stmt->execute([':uid' => $userId]);
    }
}
