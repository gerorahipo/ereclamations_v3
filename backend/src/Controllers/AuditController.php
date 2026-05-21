<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;

class AuditController {
    public function list() {
        Auth::requireRole(['administrateur', 'superviseur']);
        
        $db = Database::getConnection();
        $params = [];
        $sql = "
            SELECT h.*, r.numero_ticket 
            FROM historique h
            LEFT JOIN reclamations r ON h.reclamation_id = r.id
            WHERE 1=1
        ";

        if (!empty($_GET['type'])) {
            $sql .= " AND h.action_type = :type";
            $params[':type'] = $_GET['type'];
        }

        if (!empty($_GET['reclamation_id'])) {
            $sql .= " AND h.reclamation_id = :rid";
            $params[':rid'] = (int)$_GET['reclamation_id'];
        }

        $sql .= " ORDER BY h.date_action DESC LIMIT 500";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
