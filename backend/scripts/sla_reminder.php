<?php
// ============================================================
// scripts/sla_reminder.php
// À exécuter par une tâche CRON (ex: toutes les heures)
// ============================================================

require_once __DIR__ . '/../src/Config/Database.php';
// Autoload PSR-4 simplifié
spl_autoload_register(function ($class) {
    $file = __DIR__ . '/../src/' . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Config\Database;
use App\Services\MailService;

$pdo = Database::getConnection();

// On cherche les réclamations non résolues qui arrivent à échéance dans moins de 24h
// Et qui n'ont pas encore été notifiées pour ce rappel (on pourrait ajouter une colonne last_sla_reminder_at)
$sql = "
    SELECT r.id, r.numero_ticket, r.date_echeance_sla, r.pilote_id,
           u.email, r_u.nom, r_u.prenoms
    FROM reclamations r
    JOIN utilisateurs u ON u.id = r.pilote_id
    JOIN ressources r_u ON r_u.id = u.ressource_id
    WHERE r.statut NOT IN ('resolu', 'rejete')
      AND r.date_echeance_sla > NOW()
      AND r.date_echeance_sla < (NOW() + INTERVAL '24 hours')
";

$stmt = $pdo->query($sql);
$toNotify = $stmt->fetchAll();

echo "Vérification des échéances SLA...\n";
echo count($toNotify) . " ticket(s) proche(s) de l'échéance trouvé(s).\n";

$mailService = MailService::getInstance();

foreach ($toNotify as $row) {
    echo "Notification pour le ticket {$row['numero_ticket']} envoyée à {$row['email']}\n";
    $mailService->notifySLABreaching([
        'numero_ticket' => $row['numero_ticket'],
        'date_echeance' => $row['date_echeance_sla']
    ], [
        'email' => $row['email'],
        'nom' => $row['nom'],
        'prenoms' => $row['prenoms']
    ]);
}

echo "Terminé.\n";
