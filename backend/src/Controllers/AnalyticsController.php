<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use PDO;

class AnalyticsController {
    
    /**
     * Retourne les KPIs comparatifs par agence
     */
    public function getComparativeStats(): void
    {
        Auth::requireRole(['administrateur', 'superviseur']);
        $db = Database::getConnection();

        // 1. Performance par agence
        $sqlAgences = "
            SELECT 
                a.id,
                a.nom,
                a.code,
                COUNT(r.id) as total_tickets,
                COUNT(r.id) FILTER (WHERE r.statut = 'resolu') as resolu_count,
                AVG(CASE 
                    WHEN r.statut IN ('resolu', 'rejete') AND r.date_resolution IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (r.date_resolution - r.date_creation))/3600 
                END) as avg_resolution_time,
                (COUNT(r.id) FILTER (WHERE r.statut IN ('resolu', 'rejete') AND r.date_resolution <= r.date_echeance_sla) * 100.0 / 
                 NULLIF(COUNT(r.id) FILTER (WHERE r.statut IN ('resolu', 'rejete') OR (r.hors_sla = TRUE AND r.statut NOT IN ('resolu', 'rejete'))), 0)) as sla_rate,
                COUNT(r.id) FILTER (WHERE r.hors_sla = TRUE AND r.statut NOT IN ('resolu', 'rejete')) as current_hors_sla
            FROM agences a
            LEFT JOIN reclamations r ON a.id = r.agence_id
            GROUP BY a.id, a.nom, a.code
            ORDER BY total_tickets DESC
        ";
        $stmtAgences = $db->query($sqlAgences);
        $agencesData = $stmtAgences->fetchAll(\PDO::FETCH_ASSOC);

        // 2. Répartition par processus (Global)
        $sqlProcessus = "
            SELECT p.libelle, p.code, COUNT(r.id) as count
            FROM processus p
            JOIN reclamations r ON r.processus_id = p.id
            GROUP BY p.id, p.libelle, p.code
            ORDER BY count DESC
        ";
        $stmtProc = $db->query($sqlProcessus);
        $processusData = $stmtProc->fetchAll(\PDO::FETCH_ASSOC);

        // 3. Évolution mensuelle (6 derniers mois)
        $sqlEvolution = "
            SELECT 
                TO_CHAR(date_trunc('month', date_creation), 'YYYY-MM') as month,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE statut = 'resolu') as resolu
            FROM reclamations
            WHERE date_creation > NOW() - INTERVAL '6 months'
            GROUP BY 1
            ORDER BY 1 ASC
        ";
        $stmtEvol = $db->query($sqlEvolution);
        $evolutionData = $stmtEvol->fetchAll(\PDO::FETCH_ASSOC);

        echo json_encode([
            'status' => 'success',
            'data' => [
                'agences'   => $agencesData,
                'processus' => $processusData,
                'evolution' => $evolutionData
            ]
        ]);
    }
}
