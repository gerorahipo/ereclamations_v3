<?php
require_once __DIR__ . '/../backend/src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    echo "--- DETAILS DU TICKET CREE ---\n";
    $stmt = $pdo->prepare("
        SELECT r.id, r.numero_ticket, r.agence_id, a.nom as agence_nom, r.processus_id, p.libelle as processus_libelle, r.motif_id, r.sous_motif_id, r.statut
        FROM reclamations r
        JOIN agences a ON a.id = r.agence_id
        JOIN processus p ON p.id = r.processus_id
        WHERE r.id = :id
    ");
    $stmt->execute([':id' => 37]);
    print_r($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
