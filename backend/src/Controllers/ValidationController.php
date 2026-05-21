<?php
// ============================================================
// Controllers/ValidationController.php
// POST /api/reclamations/{id}/valider   → Coordonnateur valide
// POST /api/reclamations/{id}/retourner → Coordonnateur retourne
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;
use App\Services\MailService;
use App\Models\UtilisateurModel;

class ValidationController
{
    // ─── POST /api/reclamations/{id}/valider ─────────────────
    public function valider(int $id): void
    {
        Auth::requireRole(['coordonnateur', 'superviseur']);

        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $rec  = $this->getReclamation($pdo, $id);
        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        // Scoping coordonnateur
        $isDigitalAgency = $this->isDigitalAgency($pdo, $user);
        if (!$isDigitalAgency && $user['role'] === 'coordonnateur' && $rec['agence_id'] != $user['agence_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Non autorisé pour cette agence']);
            return;
        }

        if ($rec['statut'] !== 'a_valider') {
            http_response_code(400);
            echo json_encode(['error' => 'La réclamation doit être au statut "À Valider"']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $pdo->prepare("
            UPDATE reclamations
            SET statut = 'resolu', date_resolution = NOW()
            WHERE id = :id
        ")->execute([':id' => $id]);

        Audit::log($id, 'validation', $data['commentaire'] ?? 'Dossier validé et résolu.');

        echo json_encode(['message' => 'Réclamation validée et résolue']);
    }

    // ─── POST /api/reclamations/{id}/retourner ───────────────
    public function retourner(int $id): void
    {
        Auth::requireRole(['coordonnateur', 'superviseur']);

        $data       = json_decode(file_get_contents('php://input'), true);
        $commentaire = trim($data['commentaire'] ?? '');

        if (empty($commentaire)) {
            http_response_code(400);
            echo json_encode(['error' => 'Un commentaire est obligatoire pour retourner au pilote']);
            return;
        }

        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $rec = $this->getReclamation($pdo, $id);
        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        $isDigitalAgency = $this->isDigitalAgency($pdo, $user);
        if (!$isDigitalAgency && $user['role'] === 'coordonnateur' && $rec['agence_id'] != $user['agence_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Non autorisé pour cette agence']);
            return;
        }

        if ($rec['statut'] !== 'a_valider') {
            http_response_code(400);
            echo json_encode(['error' => 'La réclamation doit être au statut "À Valider"']);
            return;
        }

        $pdo->prepare("
            UPDATE reclamations SET statut = 'en_cours', remarques_coordination = :commentaire WHERE id = :id
        ")->execute([':commentaire' => $commentaire, ':id' => $id]);

        Audit::log(
            $id, 'retour_pilote',
            "Retourné au pilote. Motif : {$commentaire}"
        );

        echo json_encode(['message' => 'Réclamation retournée au pilote']);
    }

    // ─── POST /api/reclamations/{id}/soumettre ───────────────
    // Pilote soumet à la validation
    public function soumettre(int $id): void
    {
        Auth::requireRole(['pilote']);

        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $rec = $this->getReclamation($pdo, $id);
        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        $isDigitalAgency = $this->isDigitalAgency($pdo, $user);
        if (!$isDigitalAgency && $rec['agence_id'] != $user['agence_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Non autorisé pour cette agence']);
            return;
        }

        $currentStatut = strtolower(trim($rec['statut']));
        if (!in_array($currentStatut, ['en_cours', 'nouveau'])) {
            http_response_code(400);
            $hex = bin2hex($rec['statut']);
            echo json_encode([
                'error' => "Statut incompatible pour soumission. Statut actuel: '{$rec['statut']}' (Hex: {$hex}). Les dossiers doivent être 'en_cours' ou 'nouveau'."
            ]);
            return;
        }

        $piloteEscaladeurId = $rec['pilote_escaladeur_id'] ?? null;

        if ($piloteEscaladeurId && $rec['agence_id'] != $rec['agence_origine_id']) {
            // C'est une réclamation escaladée qui a été traitée !
            // Elle doit revenir à son agence d'origine, chez le pilote qui l'a escaladée.
            // Son statut repasse à 'en_cours'.
            // REMARQUE : On conserve pilote_escaladeur_id intact pour maintenir le dossier dans la corbeille des escaladées.
            $pdo->prepare("
                UPDATE reclamations
                SET statut = 'en_cours', 
                    pilote_id = :pilote_escaladeur_id,
                    agence_id = :agence_origine_id,
                    remarques_coordination = NULL
                WHERE id = :id
            ")->execute([
                ':pilote_escaladeur_id' => $piloteEscaladeurId,
                ':agence_origine_id' => $rec['agence_origine_id'],
                ':id' => $id
            ]);

            // Récupérer le nom de l'agence cible (qui traite actuellement)
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$rec['agence_id']]);
            $agenceCibleNom = $stmtA->fetchColumn() ?: 'l\'agence destinatrice';

            Audit::log($id, 'retour_pilote', "Dossier traité par l'agence : {$agenceCibleNom} et retourné au pilote d'origine.");

            // Notifier le pilote qui a escaladé le dossier par email
            $stmtUser = $pdo->prepare("
                SELECT u.email, r.nom, r.prenoms 
                FROM utilisateurs u
                JOIN ressources r ON r.id = u.ressource_id
                WHERE u.id = ?
            ");
            $stmtUser->execute([$piloteEscaladeurId]);
            $escaladeur = $stmtUser->fetch();
            if ($escaladeur) {
                try {
                    MailService::getInstance()->notifyTicketRetourEscalade([
                        'id' => $id,
                        'numero_ticket' => $rec['numero_ticket'],
                        'agence_cible_nom' => $agenceCibleNom,
                        'pilote_cible_nom' => $user['prenoms'] . ' ' . $user['nom']
                    ], $escaladeur);
                } catch (\Exception $e) {
                    error_log("Erreur lors de l'envoi de notification de retour d'escalade: " . $e->getMessage());
                }
            }

            echo json_encode(['message' => 'Réclamation traitée et retournée au pilote d\'origine']);
            return;
        }

        // Sinon, soumission standard
        $pdo->prepare("
            UPDATE reclamations
            SET statut = 'a_valider', 
                pilote_id = :pid,
                agence_id = agence_origine_id,
                pilote_escaladeur_id = NULL, -- Réinitialisé une fois soumis par le pilote d'origine
                remarques_coordination = NULL
            WHERE id = :id
        ")->execute([':pid' => $user['id'], ':id' => $id]);

        Audit::log($id, 'soumission_validation', 'Dossier soumis à la validation du coordonnateur.');

        // Notification Coordonnateur de l'AGENCE D'ORIGINE
        $userModel = new UtilisateurModel();
        $coordinators = $userModel->getCoordonnateursByAgence($rec['agence_origine_id']);

        try {
            foreach ($coordinators as $coord) {
                MailService::getInstance()->notifyValidationPending([
                    'id' => $id,
                    'numero_ticket' => $rec['numero_ticket'],
                    'pilote_nom' => $user['prenoms'] . ' ' . $user['nom']
                ], $coord);
            }
        } catch (\Exception $e) {
            error_log("Erreur lors de l'envoi des notifications de soumission: " . $e->getMessage());
        }

        echo json_encode(['message' => 'Réclamation soumise à validation']);
    }

    // ─── Helper: récupérer réclamation ──────────────────────
    private function getReclamation($pdo, int $id): array|false
    {
        $stmt = $pdo->prepare("SELECT id, numero_ticket, statut, agence_id, agence_origine_id, pilote_escaladeur_id FROM reclamations WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    // ─── Helper: vérifier agence digitale ───────────────────
    private function isDigitalAgency($pdo, array $user): bool
    {
        if (empty($user['agence_id'])) return false;
        $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
        $stmtA->execute([$user['agence_id']]);
        $userAgenceNom = $stmtA->fetchColumn() ?: '';
        return (stripos($userAgenceNom, 'digitale') !== false);
    }

}
