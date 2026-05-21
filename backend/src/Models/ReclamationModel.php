<?php
// ============================================================
// Models/ReclamationModel.php
// Requêtes réclamations avec scoping centralisé
// ============================================================

namespace App\Models;

use App\Config\Database;
use PDO;

class ReclamationModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function checkAccess(int $recId, array $user): bool
    {
        $rec = $this->findById($recId);
        if (!$rec) return false;

        return match($user['role']) {
            'agent'                     => (int)$rec['agent_createur_id'] === (int)$user['id'],
            'pilote', 'coordonnateur'   => (int)$rec['agence_id'] === (int)$user['agence_id'] || (int)$rec['agence_origine_id'] === (int)$user['agence_id'],
            'superviseur'               => true,
            default                     => false,
        };
    }

    /**
     * Compte les tickets par statut pour les KPIs
     */
    public function countByStatut(int $agenceId = 0): array
    {
        $filter = $agenceId ? 'WHERE agence_id = :agence_id' : '';
        $params = $agenceId ? [':agence_id' => $agenceId] : [];

        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) FILTER (WHERE statut = 'nouveau')   AS nouveau,
                COUNT(*) FILTER (WHERE statut = 'en_cours')  AS en_cours,
                COUNT(*) FILTER (WHERE statut = 'a_valider') AS a_valider,
                COUNT(*) FILTER (WHERE statut = 'resolu')    AS resolu,
                COUNT(*) FILTER (WHERE hors_sla = TRUE AND statut NOT IN ('resolu','rejete')) AS hors_sla,
                COUNT(*)                                     AS total
            FROM reclamations {$filter}
        ");
        $stmt->execute($params);
        return $stmt->fetch();
    }

    /**
     * Marque automatiquement les tickets hors SLA
     */
    public function updateHorsSla(): int
    {
        $stmt = $this->pdo->prepare("
            UPDATE reclamations
            SET hors_sla = TRUE
            WHERE date_echeance_sla < NOW()
              AND statut NOT IN ('resolu', 'rejete')
              AND hors_sla = FALSE
        ");
        $stmt->execute();
        return $stmt->rowCount();
    }

    /**
     * Trouve une réclamation par ID avec jointures
     */
    public function findById(int $id): array|false
    {
        $stmt = $this->pdo->prepare("
            SELECT r.*,
                   m.objet AS motif_objet, m.delai_sla_jours, m.categorie AS motif_categorie,
                   p.libelle AS processus_libelle, p.code AS processus_code,
                   a.nom AS agence_nom, a.code AS agence_code, a.type AS agence_type
            FROM reclamations r
            JOIN motifs m    ON m.id = r.motif_id
            JOIN processus p ON p.id = m.processus_id
            JOIN agences a   ON a.id = r.agence_id
            WHERE r.id = :id
        ");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

}
