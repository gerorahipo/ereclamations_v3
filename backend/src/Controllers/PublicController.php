<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class PublicController
{
    /**
     * GET /api/public/tracking/{numero}
     * Permet au client de suivre sa réclamation sans authentification.
     */
    public function track(string $numero): void
    {
        try {
            $pdo = Database::getConnection();
            
            $sql = "
                SELECT 
                    r.id,
                    r.numero_ticket,
                    r.statut,
                    r.date_creation,
                    r.date_echeance_sla,
                    r.date_resolution,
                    COALESCE(m.libelle, 'Motif non spécifié') as motif,
                    COALESCE(a.nom, 'Agence non spécifiée') as agence,
                    (SELECT COUNT(*) FROM actions_traitement WHERE reclamation_id = r.id) as actions_count
                FROM reclamations r
                LEFT JOIN motifs m ON m.id = r.motif_id
                LEFT JOIN agences a ON a.id = r.agence_id
                WHERE r.numero_ticket ILIKE :numero OR r.numero_ticket ILIKE :numero_full
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':numero' => '%' . trim($numero) . '%',
                ':numero_full' => trim($numero)
            ]);
            $tickets = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            if (empty($tickets)) {
                http_response_code(404);
                echo json_encode(['error' => "Aucun dossier ne correspond à la recherche '{$numero}'."]);
                return;
            }

            $statutsClient = [
                'nouveau'    => 'Réceptionnée',
                'en_cours'   => 'En cours de traitement',
                'a_valider'  => 'En cours de finalisation',
                'resolu'     => 'Traitée / Résolue',
                'rejete'     => 'Clôturée (Rejetée)'
            ];

            foreach ($tickets as &$ticket) {
                $ticket['statut_libelle'] = $statutsClient[$ticket['statut']] ?? $ticket['statut'];
                
                // Calcul de progression
                $progression = 10;
                if ($ticket['statut'] === 'en_cours')   $progression = 40;
                if ($ticket['statut'] === 'a_valider')  $progression = 80;
                if ($ticket['statut'] === 'resolu' || $ticket['statut'] === 'rejete') $progression = 100;
                
                $ticket['progression'] = $progression;
            }

            echo json_encode(['data' => $tickets]);
        } catch (\Throwable $e) {
            error_log("PublicController::track error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue. Veuillez réessayer plus tard.']);
        }
    }

    /**
     * GET /api/public/init
     * Récupère les données nécessaires pour le formulaire de déclaration (Régimes, Agences, etc.)
     */
    public function init(): void
    {
        try {
            $pdo = Database::getConnection();
            
            $regimes = $pdo->query("SELECT id, libelle FROM regimes WHERE actif = TRUE ORDER BY libelle")->fetchAll(\PDO::FETCH_ASSOC);
            $modesSaisine = $pdo->query("SELECT id, libelle FROM modes_saisine WHERE actif = TRUE ORDER BY libelle")->fetchAll(\PDO::FETCH_ASSOC);
            $processus = $pdo->query("SELECT id, code, libelle FROM processus WHERE actif = TRUE ORDER BY code")->fetchAll(\PDO::FETCH_ASSOC);
            $agences = $pdo->query("SELECT id, nom FROM agences WHERE actif = TRUE AND type = 'agence' ORDER BY nom")->fetchAll(\PDO::FETCH_ASSOC);
            
            echo json_encode([
                'regimes' => $regimes,
                'modes_saisine' => $modesSaisine,
                'processus' => $processus,
                'agences' => $agences
            ]);
        } catch (\Throwable $e) {
            error_log("PublicController::init error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue. Veuillez réessayer plus tard.']);
        }
    }

    /**
     * POST /api/public/declare
     * Permet au client de soumettre une nouvelle réclamation.
     */
    public function submit(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                $data = $_POST;
            }
            $pdo = Database::getConnection();

            // Validation minimale
            if (empty($data['partenaire_nom_prenoms']) && empty($data['partenaire_raison_sociale'])) {
                http_response_code(400);
                echo json_encode(['error' => "Le nom ou la raison sociale est obligatoire."]);
                return;
            }

            $required = ['partenaire_telephone', 'regime_id', 'type_client_id', 'motif_id', 'sous_motif_id', 'description'];
            foreach ($required as $f) {
                if (empty($data[$f])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Le champ {$f} est obligatoire."]);
                    return;
                }
            }

            // Chercher l'ID de l'agence digitale par son nom '%digitale%'
            $stmtAgence = $pdo->prepare("SELECT id FROM agences WHERE nom ILIKE :nom LIMIT 1");
            $stmtAgence->execute([':nom' => '%digitale%']);
            $agenceId = $stmtAgence->fetchColumn();
            if (!$agenceId) {
                $agenceId = $pdo->query("SELECT id FROM agences WHERE actif = TRUE ORDER BY id LIMIT 1")->fetchColumn() ?: 6;
            }

            // Chercher l'ID du processus 'Non Qualifié' par son code 'NQ'
            $stmtProc = $pdo->prepare("SELECT id FROM processus WHERE code = ? LIMIT 1");
            $stmtProc->execute(['NQ']);
            $processusId = $stmtProc->fetchColumn();
            if (!$processusId) {
                http_response_code(500);
                echo json_encode(['error' => "Le processus de repli 'Non Qualifié' est introuvable."]);
                return;
            }

            // On cherche un utilisateur "Système" ou le premier agent de l'agence sélectionnée
            $stmtUser = $pdo->prepare("
                SELECT u.id 
                FROM utilisateurs u
                JOIN ressources r ON r.id = u.ressource_id
                WHERE r.agence_id = :agence_id
                ORDER BY CASE WHEN u.role = 'agent' THEN 0 ELSE 1 END
                LIMIT 1
            ");
            $stmtUser->execute([':agence_id' => $agenceId]);
            $agentId = $stmtUser->fetchColumn();

            if (!$agentId) {
                $agentId = $pdo->query("SELECT id FROM utilisateurs LIMIT 1")->fetchColumn();
            }

            if (!$agentId) {
                http_response_code(500);
                echo json_encode(['error' => "Aucun agent disponible pour enregistrer la réclamation."]);
                return;
            }

            // Mode de saisine par défaut : Portail Client (on cherche l'ID)
            $stmtMode = $pdo->prepare("SELECT id FROM modes_saisine WHERE libelle ILIKE '%Portail%' OR libelle ILIKE '%Web%' LIMIT 1");
            $stmtMode->execute();
            $modeId = $stmtMode->fetchColumn() ?: ($data['mode_saisine_id'] ?? null);

            // Génération numéro de ticket
            $ticketPrefix = "REC-" . date('Ym');
            $stmtTicket = $pdo->prepare("SELECT COUNT(*) FROM reclamations WHERE numero_ticket LIKE :prefix");
            $stmtTicket->execute([':prefix' => $ticketPrefix . '%']);
            $count = $stmtTicket->fetchColumn() + 1;
            $numeroTicket = $ticketPrefix . str_pad($count, 4, '0', STR_PAD_LEFT);

            // Insertion
            $stmt = $pdo->prepare("
                INSERT INTO reclamations (
                    numero_ticket, partenaire_type, partenaire_nom_prenoms, partenaire_raison_sociale, 
                    partenaire_identifiant, partenaire_sexe, partenaire_telephone, partenaire_email, 
                    partenaire_employeur, regime_id, type_client_id, mode_saisine_id, 
                    processus_id, motif_id, sous_motif_id, agence_id, agence_origine_id,
                    description, statut, agent_createur_id, date_creation
                ) VALUES (
                    :numero, :type, :nom, :raison, :identifiant, :sexe, :tel, :email, :employeur, :regime, :type_client, :mode, :processus, :motif, :sous_motif, :agence, :agence, :desc, 'nouveau', :user, NOW()
                ) RETURNING id, numero_ticket
            ");

            $stmt->execute([
                ':numero'      => $numeroTicket,
                ':type'        => !empty($data['partenaire_raison_sociale']) ? 'entreprise' : 'travailleur',
                ':nom'         => $data['partenaire_nom_prenoms'] ?? null,
                ':raison'      => $data['partenaire_raison_sociale'] ?? null,
                ':identifiant' => $data['partenaire_identifiant'] ?? null,
                ':sexe'        => $data['partenaire_sexe'] ?? 'M',
                ':tel'         => $data['partenaire_telephone'],
                ':email'       => $data['partenaire_email'] ?? null,
                ':employeur'   => $data['partenaire_employeur'] ?? null,
                ':regime'      => (int)$data['regime_id'],
                ':type_client' => (int)$data['type_client_id'],
                ':mode'        => $modeId ? (int)$modeId : null,
                ':processus'   => (int)$processusId,
                ':motif'       => (int)$data['motif_id'],
                ':sous_motif'  => (int)$data['sous_motif_id'],
                ':agence'      => (int)$agenceId,
                ':desc'        => $data['description'],
                ':user'        => (int)$agentId
            ]);

            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Gérer l'upload de fichiers
            if (!empty($_FILES['files'])) {
                $files = $_FILES['files'];
                $uploadDir = __DIR__ . '/../../storage/attachments/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                
                $fileCount = is_array($files['name']) ? count($files['name']) : 1;
                $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
                $allowedMimes = [
                    'application/pdf', 
                    'application/msword', 
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'image/jpeg', 
                    'image/png', 
                    'text/plain'
                ];
                
                for ($i = 0; $i < $fileCount; $i++) {
                    $name     = is_array($files['name']) ? $files['name'][$i] : $files['name'];
                    $tmpPath  = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
                    $error    = is_array($files['error']) ? $files['error'][$i] : $files['error'];

                    if ($error !== UPLOAD_ERR_OK) continue;

                    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                    if (!in_array($extension, $allowedExtensions)) continue;

                    $finfo = new \finfo(FILEINFO_MIME_TYPE);
                    $mime = $finfo->file($tmpPath);
                    if (!in_array($mime, $allowedMimes)) continue;

                    $storageName = bin2hex(random_bytes(16)) . '.' . $extension;
                    $destPath = $uploadDir . $storageName;

                    if (move_uploaded_file($tmpPath, $destPath)) {
                        $stmtF = $pdo->prepare("
                            INSERT INTO pieces_jointes 
                                (reclamation_id, nom_original, nom_stockage, type_mime, taille, chemin, cree_par)
                            VALUES 
                                (:rid, :orig, :stock, :mime, :size, :path, :uid)
                        ");
                        $stmtF->execute([
                            ':rid'   => $result['id'],
                            ':orig'  => $name,
                            ':stock' => $storageName,
                            ':mime'  => $mime,
                            ':size'  => filesize($destPath),
                            ':path'  => 'storage/attachments/' . $storageName,
                            ':uid'   => (int)$agentId
                        ]);
                        
                        \App\Utils\Audit::log($result['id'], 'document', "Fichier joint ajouté depuis le portail public : {$name}");
                    }
                }
            }

            echo json_encode([
                'message' => 'Réclamation enregistrée avec succès',
                'id' => $result['id'],
                'numero_ticket' => $result['numero_ticket']
            ]);

        } catch (\Throwable $e) {
            error_log("PublicController::submit error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue lors de la soumission. Veuillez réessayer plus tard.']);
        }
    }

    /**
     * GET /api/public/types-clients?regime_id=X
     */
    public function typesClients(): void
    {
        try {
            $regimeId = (int)($_GET['regime_id'] ?? 0);
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, libelle FROM types_clients WHERE actif = TRUE AND regime_id = :rid ORDER BY libelle");
            $stmt->execute([':rid' => $regimeId]);
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            error_log("PublicController::typesClients error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue.']);
        }
    }

    /**
     * GET /api/public/motifs?regime_id=X&type_client_id=Y
     */
    public function motifs(): void
    {
        try {
            $regimeId = (int)($_GET['regime_id'] ?? 0);
            $typeClientId = (int)($_GET['type_client_id'] ?? 0);
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, libelle as objet FROM motifs WHERE regime_id = :rid AND type_client_id = :tcid ORDER BY libelle");
            $stmt->execute([':rid' => $regimeId, ':tcid' => $typeClientId]);
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            error_log("PublicController::motifs error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue.']);
        }
    }

    /**
     * GET /api/public/sous-motifs?motif_id=X
     */
    public function sousMotifs(): void
    {
        try {
            $motifId = (int)($_GET['motif_id'] ?? 0);
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, libelle FROM sous_motifs WHERE actif = TRUE AND motif_id = :mid ORDER BY libelle");
            $stmt->execute([':mid' => $motifId]);
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) {
            error_log("PublicController::sousMotifs error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue.']);
        }
    }

    /**
     * GET /api/public/check-identifier?id=X&type_client_id=Y
     */
    public function checkIdentifier(): void
    {
        try {
            $identifier = $_GET['id'] ?? '';
            $typeClientId = (int)($_GET['type_client_id'] ?? 0);
            
            if (empty($identifier)) {
                echo json_encode(['found' => false]);
                return;
            }

            $pdo = Database::getConnection();

            // 1. Identifier le type de client (Entreprise vs Individu)
            $stmtType = $pdo->prepare("
                SELECT tc.libelle, r.libelle as regime 
                FROM types_clients tc
                JOIN regimes r ON r.id = tc.regime_id
                WHERE tc.id = :id
            ");
            $stmtType->execute([':id' => $typeClientId]);
            $typeInfo = $stmtType->fetch(\PDO::FETCH_ASSOC);

            $isCompany = false;
            if ($typeInfo) {
                $lib = strtolower($typeInfo['libelle']);
                if (strpos($lib, 'entreprise') !== false || strpos($lib, 'employeur') !== false) {
                    $isCompany = true;
                }
            }

            $foundData = null;

            if ($isCompany) {
                // Recherche dans employeurs
                $stmt = $pdo->prepare("SELECT numero_cnps as id, raison_sociale, nom_employeur, telephone, email FROM employeurs WHERE numero_cnps = :id");
                $stmt->execute([':id' => $identifier]);
                $foundData = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($foundData) $foundData['type'] = 'entreprise';
            } else {
                // Recherche dans travailleurs puis sinistres
                $stmt = $pdo->prepare("SELECT numero_cnps as id, nom, prenoms, telephone, email FROM travailleurs WHERE numero_cnps = :id");
                $stmt->execute([':id' => $identifier]);
                $foundData = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($foundData) {
                    $foundData['type'] = 'travailleur';
                } else {
                    $stmt = $pdo->prepare("SELECT numero_sinistre as id, nom, prenoms, telephone, email FROM sinistres WHERE numero_sinistre = :id");
                    $stmt->execute([':id' => $identifier]);
                    $foundData = $stmt->fetch(\PDO::FETCH_ASSOC);
                    if ($foundData) $foundData['type'] = 'sinistre';
                }
            }

            if ($foundData) {
                echo json_encode([
                    'found' => true,
                    'data'  => $foundData
                ]);
            } else {
                echo json_encode([
                    'found' => false,
                    'error' => "Le numéro saisi n'est pas trouvé dans notre base."
                ]);
            }

        } catch (\Throwable $e) {
            error_log("PublicController::checkIdentifier error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Une erreur technique est survenue.']);
        }
    }
}
