<?php
namespace App\Controllers;

use App\Config\Database;
use App\Utils\Audit;
use PDO;

class InterimController {
    public function list() {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT i.*, 
                   r.nom as user_nom, r.prenoms as user_prenoms, r.matricule,
                   a.nom as agence_nom, a.code as agence_code
            FROM interims i
            JOIN utilisateurs u ON i.user_id = u.id
            JOIN ressources r ON u.ressource_id = r.id
            JOIN agences a ON i.agence_id = a.id
            ORDER BY i.created_at DESC
        ");
        $stmt->execute();
        return ['status' => 'success', 'data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)];
    }

    public function create() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['user_id'], $data['agence_id'], $data['date_debut'], $data['date_fin'])) {
            return ['status' => 'error', 'message' => 'Données incomplètes'];
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO interims (user_id, agence_id, date_debut, date_fin, actif) VALUES (?, ?, ?, ?, TRUE)");
        $stmt->execute([$data['user_id'], $data['agence_id'], $data['date_debut'], $data['date_fin']]);
        Audit::log(null, 'admin_action', "Configuration intérim créée pour l'utilisateur ID: {$data['user_id']}");
        return ['status' => 'success', 'message' => 'Intérim créé avec succès'];
    }

    public function delete($id) {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM interims WHERE id = ?");
        $stmt->execute([$id]);
        Audit::log(null, 'admin_action', "Intérim supprimé (ID: $id)");
        return ['status' => 'success', 'message' => 'Intérim supprimé'];
    }

    public function toggleStatus($id) {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE interims SET actif = NOT actif WHERE id = ?");
        $stmt->execute([$id]);
        Audit::log(null, 'admin_action', "Statut intérim basculé (ID: $id)");
        return ['status' => 'success', 'message' => 'Statut mis à jour'];
    }
}
