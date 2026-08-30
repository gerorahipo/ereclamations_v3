<?php
// ============================================================
// Controllers/NotificationController.php
// Centre de notifications in-app
// ============================================================

namespace App\Controllers;

use App\Middleware\Auth;
use App\Models\NotificationModel;

class NotificationController
{
    // ─── GET /api/notifications ───────────────────────────────
    public function index(): void
    {
        Auth::require();
        $model = new NotificationModel();
        $limit = !empty($_GET['limit']) && (int)$_GET['limit'] > 0 ? min((int)$_GET['limit'], 100) : 30;

        echo json_encode([
            'data'   => $model->listForUser(Auth::$user['id'], $limit),
            'unread' => $model->unreadCount(Auth::$user['id']),
        ]);
    }

    // ─── GET /api/notifications/unread-count ──────────────────
    public function unreadCount(): void
    {
        Auth::require();
        $model = new NotificationModel();
        echo json_encode(['unread' => $model->unreadCount(Auth::$user['id'])]);
    }

    // ─── PUT /api/notifications/{id}/lu ───────────────────────
    public function markRead(int $id): void
    {
        Auth::require();
        $model = new NotificationModel();
        $ok = $model->markRead($id, Auth::$user['id']);
        if (!$ok) {
            http_response_code(404);
            echo json_encode(['error' => 'Notification introuvable']);
            return;
        }
        echo json_encode(['message' => 'Notification marquée comme lue']);
    }

    // ─── PUT /api/notifications/lu-tout ───────────────────────
    public function markAllRead(): void
    {
        Auth::require();
        $model = new NotificationModel();
        $model->markAllRead(Auth::$user['id']);
        echo json_encode(['message' => 'Toutes les notifications ont été marquées comme lues']);
    }
}
