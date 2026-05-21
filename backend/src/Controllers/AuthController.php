<?php
// ============================================================
// Controllers/AuthController.php
// POST /api/auth/login
// POST /api/auth/logout (stateless: côté client)
// GET  /api/auth/me
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Config\JWT;
use App\Middleware\Auth;
use App\Utils\Audit;

class AuthController
{
    // ─── POST /api/auth/login ────────────────────────────────
    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $email    = trim($data['email']    ?? '');
        $password = trim($data['password'] ?? '');

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email et mot de passe requis']);
            return;
        }

        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT u.id, u.email, u.password, u.role, u.actif,
                   r.nom, r.prenoms, r.matricule, r.agence_id,
                   a.code AS agence_code, a.nom AS agence_nom, a.type AS agence_type
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            JOIN agences    a ON a.id = r.agence_id
            WHERE u.email = :email
        ");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !$user['actif'] || !password_verify($password, $user['password'])) {
            sleep(1); // Anti brute-force
            Audit::log(null, 'login_failed', "Échec de connexion (Email: $email)");
            http_response_code(401);
            echo json_encode(['error' => 'Identifiants incorrects']);
            return;
        }

        // Mise à jour last_login
        $pdo->prepare("UPDATE utilisateurs SET last_login = CURRENT_TIMESTAMP WHERE id = :id")
            ->execute([':id' => $user['id']]);

        // Récupérer les agences en intérim (actives aujourd'hui)
        $stmtInt = $pdo->prepare("
            SELECT i.agence_id, a.nom as agence_nom, a.code as agence_code
            FROM interims i
            JOIN agences a ON i.agence_id = a.id
            WHERE i.user_id = ? AND i.actif IS TRUE AND CURRENT_DATE BETWEEN i.date_debut AND i.date_fin
        ");
        $stmtInt->execute([$user['id']]);
        $interims = $stmtInt->fetchAll(\PDO::FETCH_ASSOC);

        // Génération JWT
        $payload = [
            'id'          => $user['id'],
            'email'       => $user['email'],
            'role'        => $user['role'],
            'nom'         => $user['nom'],
            'prenoms'     => $user['prenoms'],
            'matricule'   => $user['matricule'],
            'agence_id'   => $user['agence_id'],
            'agence_code' => $user['agence_code'],
            'agence_nom'  => $user['agence_nom'],
            'agence_type' => $user['agence_type'],
            'interims'    => $interims
        ];

        $token = JWT::encode($payload);

        Audit::log(null, 'login_success', "Connexion réussie");

        http_response_code(200);
        echo json_encode([
            'token' => $token,
            'user'  => array_diff_key($payload, ['password' => '']),
        ]);
    }

    // ─── GET /api/auth/me ────────────────────────────────────
    public function me(): void
    {
        Auth::require();
        echo json_encode(['user' => Auth::$user]);
    }

    // ─── POST /api/auth/change-password ──────────────────────
    public function changePassword(): void
    {
        Auth::require();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $current = trim($data['current_password'] ?? '');
        $new     = trim($data['new_password']     ?? '');

        if (!$current || !$new) {
            http_response_code(400);
            echo json_encode(['error' => 'Ancien et nouveau mot de passe requis']);
            return;
        }

        // Validation de la complexité du mot de passe
        if (strlen($new) < 8) {
            http_response_code(400);
            echo json_encode(['error' => 'Le mot de passe doit contenir au moins 8 caractères']);
            return;
        }
        if (!preg_match('/[A-Z]/', $new)) {
            http_response_code(400);
            echo json_encode(['error' => 'Le mot de passe doit contenir au moins une majuscule']);
            return;
        }
        if (!preg_match('/[0-9]/', $new)) {
            http_response_code(400);
            echo json_encode(['error' => 'Le mot de passe doit contenir au moins un chiffre']);
            return;
        }
        if (!preg_match('/[^A-Za-z0-9]/', $new)) {
            http_response_code(400);
            echo json_encode(['error' => 'Le mot de passe doit contenir au moins un caractère spécial']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT password FROM utilisateurs WHERE id = :id");
        $stmt->execute([':id' => Auth::$user['id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($current, $user['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'L\'ancien mot de passe est incorrect']);
            return;
        }

        $hashed = password_hash($new, PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE utilisateurs SET password = :p WHERE id = :id")
            ->execute([':p' => $hashed, ':id' => Auth::$user['id']]);

        Audit::log(null, 'password_change', "Mot de passe modifié avec succès");

        http_response_code(200);
        echo json_encode(['message' => 'Mot de passe mis à jour avec succès']);
    }
}
