<?php
// ============================================================
// Config/JWT.php — Gestion JWT native PHP (sans librairie)
// Algorithme: HS256
// ============================================================

namespace App\Config;

class JWT
{
    private static string $secret;

    private static function getSecret(): string
    {
        if (empty(self::$secret)) {
            $secret = getenv('JWT_SECRET');
            if (!$secret) {
                http_response_code(500);
                echo json_encode(['error' => 'Configuration serveur incomplète (SECRET manquante)']);
                exit;
            }
            self::$secret = $secret;
        }
        return self::$secret;
    }

    // ─── Encode ────────────────────────────────────────────
    public static function encode(array $payload, int $ttlSeconds = 28800): string
    {
        $header = self::base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));

        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;

        $body      = self::base64url(json_encode($payload));
        $signature = self::base64url(hash_hmac('sha256', "{$header}.{$body}", self::getSecret(), true));

        return "{$header}.{$body}.{$signature}";
    }

    // ─── Decode & Validate ─────────────────────────────────
    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $body, $signature] = $parts;

        // Vérification signature
        $expectedSig = self::base64url(hash_hmac('sha256', "{$header}.{$body}", self::getSecret(), true));
        if (!hash_equals($expectedSig, $signature)) return null;

        $payload = json_decode(self::base64urlDecode($body), true);
        if (!$payload) return null;

        // Vérification expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;

        return $payload;
    }

    // ─── Extrait le token du header Authorization ───────────
    public static function fromRequest(): ?string
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($authHeader, 'Bearer ')) {
            return substr($authHeader, 7);
        }

        // Support du token via paramètre d'URL (utile pour les téléchargements de fichiers)
        if (!empty($_GET['token'])) {
            return $_GET['token'];
        }

        return null;
    }

    // ─── Helpers ────────────────────────────────────────────
    private static function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
