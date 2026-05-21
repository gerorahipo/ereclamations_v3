<?php
// ============================================================
// Middleware/Auth.php — Vérification JWT + scoping par rôle
// ============================================================

namespace App\Middleware;

use App\Config\JWT;

class Auth
{
    public static array $user = [];

    // ─── Vérifie le JWT et charge l'utilisateur ─────────────
    public static function require(): void
    {
        $token = JWT::fromRequest();

        if (!$token) {
            self::unauthorized('Token manquant');
        }

        $payload = JWT::decode($token);
        if (!$payload) {
            self::unauthorized('Token invalide ou expiré');
        }

        self::$user = $payload;

        // Gestion du basculement d'agence (Intérim)
        $activeAgencyHeader = $_SERVER['HTTP_X_ACTIVE_AGENCY'] ?? null;
        if ($activeAgencyHeader && is_numeric($activeAgencyHeader)) {
            $requestedId = (int)$activeAgencyHeader;
            
            // Vérifier si l'utilisateur est autorisé (agence principale ou intérim)
            $isAuthorized = ($requestedId === (int)$payload['agence_id']);
            
            if (!$isAuthorized && isset($payload['interims'])) {
                foreach ($payload['interims'] as $interim) {
                    if ((int)$interim['agence_id'] === $requestedId) {
                        $isAuthorized = true;
                        break;
                    }
                }
            }

            // Les admins peuvent switcher n'importe où
            if ($payload['role'] === 'administrateur') {
                $isAuthorized = true;
            }

            if ($isAuthorized) {
                self::$user['agence_id'] = $requestedId;
            }
        }
    }

    // ─── Vérifie que l'utilisateur a le bon rôle ────────────
    public static function requireRole(array $roles): void
    {
        self::require();

        if ((self::$user['role'] ?? '') === 'administrateur') {
            return;
        }

        if (!in_array(self::$user['role'] ?? '', $roles, true)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès refusé pour ce rôle']);
            exit;
        }
    }

    // ─── Getters sur l'utilisateur connecté ─────────────────
    public static function id(): int
    {
        return (int)(self::$user['id'] ?? 0);
    }

    public static function role(): string
    {
        return self::$user['role'] ?? '';
    }

    public static function agenceId(): int
    {
        return (int)(self::$user['agence_id'] ?? 0);
    }

    public static function isCentrale(): bool
    {
        return (self::$user['agence_type'] ?? '') === 'centrale';
    }

    // ─── 401 helper ─────────────────────────────────────────
    private static function unauthorized(string $msg): void
    {
        http_response_code(401);
        echo json_encode(['error' => $msg]);
        exit;
    }
}
