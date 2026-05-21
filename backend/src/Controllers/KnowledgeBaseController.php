<?php
// ============================================================
// Controllers/KnowledgeBaseController.php
// Gestion de la base de connaissances (Suggestions de Réponses)
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;

class KnowledgeBaseController
{
    // ─── GET /api/suggestions ───────────────────────────────
    public function index(): void
    {
        Auth::require();
        $pdo = Database::getConnection();
        
        $sql = "
            SELECT s.*, m.libelle as motif_libelle, c.libelle as cause_libelle
            FROM suggestions_reponses s
            LEFT JOIN motifs m ON m.id = s.motif_id
            LEFT JOIN causes c ON c.id = s.cause_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($_GET['motif_id'])) {
            $sql .= " AND s.motif_id = :mid";
            $params[':mid'] = (int)$_GET['motif_id'];
        }
        if (!empty($_GET['cause_id'])) {
            $sql .= " AND s.cause_id = :cid";
            $params[':cid'] = (int)$_GET['cause_id'];
        }
        if (isset($_GET['actif'])) {
            $sql .= " AND s.actif = :actif";
            $params[':actif'] = $_GET['actif'] === 'true' ? 'true' : 'false';
        }

        $sql .= " ORDER BY s.titre";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/suggestions ──────────────────────────────
    public function create(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO suggestions_reponses (motif_id, cause_id, titre, contenu, actif)
            VALUES (:mid, :cid, :titre, :contenu, :actif)
            RETURNING id
        ");
        $stmt->execute([
            ':mid'     => !empty($data['motif_id']) ? (int)$data['motif_id'] : null,
            ':cid'     => !empty($data['cause_id']) ? (int)$data['cause_id'] : null,
            ':titre'   => $data['titre'],
            ':contenu' => $data['contenu'],
            ':actif'   => $data['actif'] ?? true
        ]);

        $id = $stmt->fetchColumn();
        Audit::log(null, 'admin_action', "Suggestion créée: {$data['titre']} (ID: $id)");
        
        http_response_code(201);
        echo json_encode(['message' => 'Suggestion créée', 'id' => $id]);
    }

    // ─── PUT /api/suggestions/{id} ──────────────────────────
    public function update(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            UPDATE suggestions_reponses 
            SET motif_id = :mid, cause_id = :cid, titre = :titre, contenu = :contenu, actif = :actif 
            WHERE id = :id
        ");
        $stmt->execute([
            ':mid'     => !empty($data['motif_id']) ? (int)$data['motif_id'] : null,
            ':cid'     => !empty($data['cause_id']) ? (int)$data['cause_id'] : null,
            ':titre'   => $data['titre'],
            ':contenu' => $data['contenu'],
            ':actif'   => $data['actif'] ?? true,
            ':id'      => $id
        ]);

        Audit::log(null, 'admin_action', "Suggestion mise à jour: {$data['titre']} (ID: $id)");
        echo json_encode(['message' => 'Suggestion mise à jour']);
    }

    // ─── DELETE /api/suggestions/{id} ───────────────────────
    public function delete(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare("DELETE FROM suggestions_reponses WHERE id = :id");
        $stmt->execute([':id' => $id]);

        Audit::log(null, 'admin_action', "Suggestion supprimée (ID: $id)");
        echo json_encode(['message' => 'Suggestion supprimée']);
    }

    // ─── GET /api/reclamations/{id}/suggestions ─────────────
    public function getSuggestionsForReclamation(int $id): void
    {
        Auth::require();
        $pdo = Database::getConnection();

        // 1. Récupérer les infos de la réclamation
        $stmt = $pdo->prepare("SELECT motif_id, cause_id FROM reclamations WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $rec = $stmt->fetch();

        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        // 2. Chercher les suggestions correspondantes (par cause en priorité, puis par motif, puis générales)
        $sql = "
            SELECT * FROM suggestions_reponses 
            WHERE actif = TRUE 
            AND (
                cause_id = :cid 
                OR (cause_id IS NULL AND motif_id = :mid)
                OR (cause_id IS NULL AND motif_id IS NULL)
            )
            ORDER BY (cause_id IS NOT NULL) DESC, (motif_id IS NOT NULL) DESC, titre ASC
        ";
        
        $stmtS = $pdo->prepare($sql);
        $stmtS->execute([
            ':cid' => $rec['cause_id'],
            ':mid' => $rec['motif_id']
        ]);

        echo json_encode(['data' => $stmtS->fetchAll()]);
    }
    // ─── GET /api/kb ────────────────────────────────────────
    public function listEntries(): void
    {
        Auth::require();
        $pdo = Database::getConnection();
        
        $sql = "
            SELECT kb.*, sm.libelle as sous_motif_libelle, m.libelle as motif_libelle, p.libelle as processus_libelle
            FROM kb_entries kb
            JOIN sous_motifs sm ON sm.id = kb.sous_motif_id
            JOIN motifs m ON m.id = sm.motif_id
            LEFT JOIN processus p ON p.id = m.processus_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($_GET['q'])) {
            $sql .= " AND (kb.titre ILIKE :q OR kb.analyse_type ILIKE :q)";
            $params[':q'] = '%' . $_GET['q'] . '%';
        }
        if (!empty($_GET['sous_motif_id'])) {
            $sql .= " AND kb.sous_motif_id = :smid";
            $params[':smid'] = (int)$_GET['sous_motif_id'];
        }

        $sql .= " ORDER BY kb.titre";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/kb ───────────────────────────────────────
    public function createEntry(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO kb_entries (sous_motif_id, titre, analyse_type, actions_types, actif)
            VALUES (:smid, :titre, :analyse, :actions, :actif)
            RETURNING id
        ");
        $stmt->execute([
            ':smid'    => (int)$data['sous_motif_id'],
            ':titre'   => $data['titre'],
            ':analyse' => $data['analyse_type'],
            ':actions' => json_encode($data['actions_types'] ?? []),
            ':actif'   => $data['actif'] ?? true
        ]);

        $id = $stmt->fetchColumn();
        Audit::log(null, 'admin_action', "KB: Nouvelle entrée créée: {$data['titre']} (ID: $id)");
        
        http_response_code(201);
        echo json_encode(['message' => 'Entrée KB créée', 'id' => $id]);
    }

    // ─── PUT /api/kb/{id} ───────────────────────────────────
    public function updateEntry(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            UPDATE kb_entries 
            SET sous_motif_id = :smid, titre = :titre, analyse_type = :analyse, actions_types = :actions, actif = :actif 
            WHERE id = :id
        ");
        $stmt->execute([
            ':smid'    => (int)$data['sous_motif_id'],
            ':titre'   => $data['titre'],
            ':analyse' => $data['analyse_type'],
            ':actions' => json_encode($data['actions_types'] ?? []),
            ':actif'   => $data['actif'] ?? true,
            ':id'      => $id
        ]);

        Audit::log(null, 'admin_action', "KB: Entrée mise à jour: {$data['titre']} (ID: $id)");
        echo json_encode(['message' => 'Entrée KB mise à jour']);
    }

    // ─── DELETE /api/kb/{id} ────────────────────────────────
    public function deleteEntry(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare("DELETE FROM kb_entries WHERE id = :id");
        $stmt->execute([':id' => $id]);

        Audit::log(null, 'admin_action', "KB: Entrée supprimée (ID: $id)");
        echo json_encode(['message' => 'Entrée KB supprimée']);
    }
}
