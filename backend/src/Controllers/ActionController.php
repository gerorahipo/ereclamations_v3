<?php
// ============================================================
// Controllers/ActionController.php
// GET  /api/reclamations/{id}/actions
// POST /api/reclamations/{id}/actions
// PUT  /api/actions/{id}
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;

class ActionController
{
    public function index(int $recId): void
    {
        Auth::require();
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT at.*, a.nom AS ressource_nom
            FROM actions_traitement at
            LEFT JOIN agences a ON a.id = at.ressource_id
            WHERE at.reclamation_id = :id
            ORDER BY at.created_at
        ");
        $stmt->execute([':id' => $recId]);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    public function create(int $recId): void
    {
        Auth::requireRole(['pilote', 'superviseur']);

        $data = json_decode(file_get_contents('php://input'), true);
        $libelle = trim($data['libelle'] ?? '');

        if (!$libelle) {
            http_response_code(400);
            echo json_encode(['error' => 'Le libellé de l\'action est requis']);
            return;
        }

        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $stmt = $pdo->prepare("
            INSERT INTO actions_traitement
                (reclamation_id, libelle, ressource_id, echeance, statut, observations)
            VALUES
                (:rec_id, :libelle, :res_id, :echeance, 'en_attente', :observations)
            RETURNING id
        ");
        $stmt->execute([
            ':rec_id'      => $recId,
            ':libelle'     => $libelle,
            ':res_id'      => !empty($data['ressource_id']) ? $data['ressource_id'] : null,
            ':echeance'    => !empty($data['echeance']) ? $data['echeance'] : null,
            ':observations'=> !empty($data['observations']) ? $data['observations'] : null,
        ]);

        $action = $stmt->fetch();

        Audit::log($recId, 'action_ajoutee', "Action ajoutée : {$libelle}");

        // Mettre réclamation en cours si elle est encore "nouveau"
        $pdo->prepare("
            UPDATE reclamations SET statut = 'en_cours', pilote_id = :pid
            WHERE id = :id AND statut = 'nouveau'
        ")->execute([':pid' => $user['id'], ':id' => $recId]);

        http_response_code(201);
        echo json_encode(['message' => 'Action ajoutée', 'id' => $action['id']]);
    }

    public function update(int $actionId): void
    {
        Auth::requireRole(['pilote', 'superviseur']);

        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $fields = [];
        $params = [':id' => $actionId];

        if (isset($data['statut'])) {
            $fields[] = 'statut = :statut';
            $params[':statut'] = $data['statut'];
        }
        if (isset($data['observations'])) {
            $fields[] = 'observations = :observations';
            $params[':observations'] = $data['observations'];
        }
        if (isset($data['echeance'])) {
            $fields[] = 'echeance = :echeance';
            $params[':echeance'] = !empty($data['echeance']) ? $data['echeance'] : null;
        }
        if (isset($data['libelle'])) {
            $fields[] = 'libelle = :libelle';
            $params[':libelle'] = $data['libelle'];
        }
        if (isset($data['ressource_id'])) {
            $fields[] = 'ressource_id = :ressource_id';
            $params[':ressource_id'] = !empty($data['ressource_id']) ? $data['ressource_id'] : null;
        }
        if (isset($data['commentaire_cloture'])) {
            $fields[] = 'commentaire_cloture = :commentaire_cloture';
            $params[':commentaire_cloture'] = $data['commentaire_cloture'];
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Aucun champ à mettre à jour']);
            return;
        }

        $fields[] = 'updated_at = NOW()';
        $pdo->prepare("UPDATE actions_traitement SET " . implode(', ', $fields) . " WHERE id = :id")
            ->execute($params);

        // Récupérer reclamation_id pour l'historique
        $stmtRec = $pdo->prepare("SELECT reclamation_id, libelle FROM actions_traitement WHERE id = :id");
        $stmtRec->execute([':id' => $actionId]);
        $action = $stmtRec->fetch();

        if ($action) {
            Audit::log($action['reclamation_id'], 'action_modifiee', "Action modifiée : {$action['libelle']}");
        }

        echo json_encode(['message' => 'Action mise à jour']);
    }

    public function delete(int $actionId): void
    {
        Auth::requireRole(['pilote', 'superviseur']);
        $pdo = Database::getConnection();
        $user = Auth::$user;

        // Récupérer l'action pour l'historique
        $stmt = $pdo->prepare("SELECT reclamation_id, libelle FROM actions_traitement WHERE id = :id");
        $stmt->execute([':id' => $actionId]);
        $action = $stmt->fetch();

        if (!$action) {
            http_response_code(404);
            echo json_encode(['error' => "Action #{$actionId} non trouvée"]);
            return;
        }

        $pdo->prepare("DELETE FROM actions_traitement WHERE id = :id")->execute([':id' => $actionId]);

        Audit::log($action['reclamation_id'], 'action_supprimee', "Action supprimée : {$action['libelle']}");

        echo json_encode(['message' => 'Action supprimée']);
    }
}
