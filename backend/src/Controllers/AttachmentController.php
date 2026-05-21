<?php
// ============================================================
// Controllers/AttachmentController.php
// Gestion des pièces jointes (Upload, Download, List, Delete)
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;

class AttachmentController
{
    private string $uploadDir;
    private array $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
    private array $allowedMimes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg', 
        'image/png', 
        'text/plain'
    ];

    public function __construct()
    {
        $this->uploadDir = __DIR__ . '/../../storage/attachments/';
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    // ─── GET /api/reclamations/{id}/attachments ──────────────
    public function list(int $reclamationId): void
    {
        Auth::require();
        $pdo = Database::getConnection();
        $user = Auth::$user;

        // Scoping Check
        /*
        if (!$this->checkAccess($pdo, $reclamationId, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé à cette réclamation']);
            return;
        }
        */

        $stmt = $pdo->prepare("
            SELECT pj.*, CONCAT(r.prenoms, ' ', r.nom) AS cree_par_nom
            FROM pieces_jointes pj
            LEFT JOIN utilisateurs u ON u.id = pj.cree_par
            LEFT JOIN ressources r ON r.id = u.ressource_id
            WHERE pj.reclamation_id = :rid
            ORDER BY pj.date_creation DESC
        ");
        $stmt->execute([':rid' => $reclamationId]);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/reclamations/{id}/attachments ─────────────
    public function upload(int $reclamationId): void
    {
        Auth::require();
        $user = Auth::$user;
        $pdo  = Database::getConnection();

        // Scoping Check
        if (!$this->checkAccess($pdo, $reclamationId, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé pour ajouter des fichiers']);
            return;
        }

        if (empty($_FILES['files'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Aucun fichier reçu']);
            return;
        }

        $files = $_FILES['files'];
        $uploaded = [];
        $errors = [];

        $fileCount = is_array($files['name']) ? count($files['name']) : 1;

        for ($i = 0; $i < $fileCount; $i++) {
            $name     = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $tmpPath  = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $error    = is_array($files['error']) ? $files['error'][$i] : $files['error'];

            if ($error !== UPLOAD_ERR_OK) {
                $errors[] = "Erreur d'upload pour {$name}";
                continue;
            }

            // 1. Validation de l'extension
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($extension, $this->allowedExtensions)) {
                $errors[] = "Extension non autorisée : {$name}";
                continue;
            }

            // 2. Validation du type MIME réel
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpPath);
            if (!in_array($mime, $this->allowedMimes)) {
                $errors[] = "Type de fichier non autorisé : {$name} ({$mime})";
                continue;
            }

            // Générer un nom unique pour le stockage
            $storageName = bin2hex(random_bytes(16)) . '.' . $extension;
            $destPath = $this->uploadDir . $storageName;

            if (move_uploaded_file($tmpPath, $destPath)) {
                $stmt = $pdo->prepare("
                    INSERT INTO pieces_jointes 
                        (reclamation_id, nom_original, nom_stockage, type_mime, taille, chemin, cree_par)
                    VALUES 
                        (:rid, :orig, :stock, :mime, :size, :path, :uid)
                    RETURNING id
                ");
                $stmt->execute([
                    ':rid'   => $reclamationId,
                    ':orig'  => $name,
                    ':stock' => $storageName,
                    ':mime'  => $mime,
                    ':size'  => filesize($destPath),
                    ':path'  => 'storage/attachments/' . $storageName,
                    ':uid'   => $user['id']
                ]);
                
                $id = $stmt->fetchColumn();
                $uploaded[] = ['id' => $id, 'name' => $name];
                
                Audit::log($reclamationId, 'document', "Fichier joint ajouté : {$name}");
            } else {
                $errors[] = "Impossible de sauvegarder {$name}";
            }
        }

        echo json_encode([
            'message'  => count($uploaded) . " fichier(s) ajouté(s)",
            'uploaded' => $uploaded,
            'errors'   => $errors
        ]);
    }

    // ─── GET /api/attachments/{id} ───────────────────────────
    public function download(int $id): void
    {
        Auth::require();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM pieces_jointes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $pj = $stmt->fetch();

        if (!$pj) {
            http_response_code(404);
            echo json_encode(['error' => 'Fichier introuvable']);
            return;
        }

        $filePath = $this->uploadDir . $pj['nom_stockage'];

        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Le fichier physique est manquant sur le serveur']);
            return;
        }

        // Forcer le téléchargement ou l'affichage
        header('Content-Description: File Transfer');
        header('Content-Type: ' . ($pj['type_mime'] ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $pj['nom_original'] . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($filePath));
        
        readfile($filePath);
        exit;
    }

    // ─── DELETE /api/attachments/{id} ────────────────────────
    public function delete(int $id): void
    {
        Auth::require();
        $user = Auth::$user;
        $pdo = Database::getConnection();

        // Seul le créateur ou un superviseur/coordo peut supprimer
        $stmt = $pdo->prepare("SELECT * FROM pieces_jointes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $pj = $stmt->fetch();

        if (!$pj) {
            http_response_code(404);
            echo json_encode(['error' => 'Fichier introuvable']);
            return;
        }

        if ($pj['cree_par'] != $user['id'] && !in_array($user['role'], ['superviseur', 'coordonnateur'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Action non autorisée']);
            return;
        }

        $filePath = $this->uploadDir . $pj['nom_stockage'];

        // 1. Supprimer le fichier physique
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // 2. Supprimer l'entrée en base
        $delStmt = $pdo->prepare("DELETE FROM pieces_jointes WHERE id = :id");
        $delStmt->execute([':id' => $id]);

        Audit::log($pj['reclamation_id'], 'document', "Fichier joint supprimé : {$pj['nom_original']}");

        echo json_encode(['message' => 'Fichier supprimé']);
    }

    // ─── Helper: vérification des droits sur la réclamation ──
    private function checkAccess($pdo, int $reclamationId, array $user): bool
    {
        if ($user['role'] === 'administrateur' || $user['role'] === 'superviseur') {
            return true;
        }

        $isDigitalAgency = false;
        if (!empty($user['agence_id'])) {
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$user['agence_id']]);
            $userAgenceNom = $stmtA->fetchColumn() ?: '';
            $isDigitalAgency = (stripos($userAgenceNom, 'digitale') !== false);
        }

        if ($isDigitalAgency) {
            return true;
        }

        $stmt = $pdo->prepare("SELECT agent_createur_id, agence_id, agence_origine_id FROM reclamations WHERE id = :id");
        $stmt->execute([':id' => $reclamationId]);
        $rec = $stmt->fetch();

        if (!$rec) return false;

        if ($user['role'] === 'agent') {
            return (int)$rec['agent_createur_id'] === (int)$user['id'];
        }

        if (in_array($user['role'], ['pilote', 'coordonnateur'])) {
            return (int)$rec['agence_id'] === (int)$user['agence_id'] || (int)$rec['agence_origine_id'] === (int)$user['agence_id'];
        }

        return false;
    }
}
