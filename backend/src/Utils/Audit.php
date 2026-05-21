<?php
namespace App\Utils;

use App\Config\Database;
use App\Middleware\Auth;

class Audit {
    /**
     * Enregistre une action dans l'historique global (Audit).
     */
    public static function log(?int $reclamationId, string $type, string $comment, ?array $metadata = null): void {
        try {
            $pdo = Database::getConnection();
            $user = Auth::$user;

            $stmt = $pdo->prepare("
                INSERT INTO historique (reclamation_id, acteur_id, acteur_nom, action_type, commentaire, metadata, date_action)
                VALUES (:rec_id, :acteur_id, :acteur_nom, :type, :comment, :metadata, NOW())
            ");

            $stmt->execute([
                ':rec_id'    => $reclamationId,
                ':acteur_id' => $user['id'] ?? null,
                ':acteur_nom'=> $user ? ($user['prenoms'] . ' ' . $user['nom']) : 'Système',
                ':type'      => $type,
                ':comment'   => $comment,
                ':metadata'  => $metadata ? json_encode($metadata) : null,
            ]);
        } catch (\Exception $e) {
            error_log("Erreur Audit Log: " . $e->getMessage());
        }
    }
}
