<?php
// ============================================================
// Controllers/ReclamationController.php
// GET    /api/reclamations         → liste (scopée)
// POST   /api/reclamations         → créer
// GET    /api/reclamations/{id}    → détail
// PUT    /api/reclamations/{id}    → modifier
// PUT    /api/reclamations/{id}/statut → changer statut
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;
use App\Services\MailService;
use App\Models\UtilisateurModel;

class ReclamationController
{
    // ─── GET /api/reclamations ───────────────────────────────
    public function index(): void
    {
        Auth::require();

        $pdo    = Database::getConnection();
        $user   = Auth::$user;
        $params = [];

        $sql = "
            SELECT r.id, r.numero_ticket, r.partenaire_type, r.partenaire_nom,
                   r.partenaire_nom_prenoms, r.partenaire_raison_sociale, r.partenaire_employeur_numero_cnps,
                   r.statut, r.hors_sla, r.date_creation, r.date_echeance_sla, r.date_resolution,
                   r.pilote_id, r.agence_id, r.agence_origine_id, r.pilote_escaladeur_id, r.updated_at, r.remarques_coordination,
                   sm.libelle AS sous_motif_libelle, sm.delai_traitement_jours,
                   m.libelle    AS motif_libelle,
                   p.libelle  AS processus_libelle, p.code AS processus_code,
                   a.nom      AS agence_nom, a.code AS agence_code,
                   ao.nom     AS agence_origine_nom,
                   CONCAT(rc.prenoms, ' ', rc.nom) AS agent_nom,
                   CONCAT(rp.prenoms, ' ', rp.nom) AS pilote_nom
            FROM reclamations r
            JOIN sous_motifs  sm  ON sm.id = r.sous_motif_id
            JOIN motifs       m   ON m.id = r.motif_id
            JOIN processus    p   ON p.id = r.processus_id
            JOIN agences      a   ON a.id = r.agence_id
            JOIN agences      ao  ON ao.id = r.agence_origine_id
            LEFT JOIN utilisateurs uc  ON uc.id = r.agent_createur_id
            LEFT JOIN ressources   rc  ON rc.id = uc.ressource_id
            LEFT JOIN utilisateurs up ON up.id = r.pilote_id
            LEFT JOIN ressources   rp ON rp.id = up.ressource_id
            WHERE 1=1
        ";

        $isEscaladees = !empty($_GET['queue']) && $_GET['queue'] === 'escaladees';
        $isNonQualifiees = !empty($_GET['queue']) && $_GET['queue'] === 'non_qualifiees';

        $isDigitalAgency = false;
        if (!empty($user['agence_id'])) {
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$user['agence_id']]);
            $userAgenceNom = $stmtA->fetchColumn() ?: '';
            $isDigitalAgency = (stripos($userAgenceNom, 'digitale') !== false);
        }

        if ($isNonQualifiees) {
            if ($user['role'] !== 'administrateur' && !$isDigitalAgency) {
                http_response_code(403);
                echo json_encode(['error' => 'Accès non autorisé à la corbeille des réclamations non qualifiées']);
                return;
            }
        }

        // ─── Scoping par rôle ─────────────────────────────────
        if ($isNonQualifiees) {
            $sql .= " AND p.code = 'NQ'";
            if ($user['role'] !== 'administrateur' && !$isDigitalAgency) {
                $sql .= " AND r.agence_id = :user_agence_id";
                $params[':user_agence_id'] = $user['agence_id'];
            }
        } elseif ($user['role'] === 'agent') {
            if ($isDigitalAgency) {
                // L'agent de l'agence digitale peut voir toutes les réclamations de toutes les agences
            } else {
                $sql .= " AND r.agent_createur_id = :uid";
                $params[':uid'] = $user['id'];
            }
        } elseif ($user['role'] === 'coordonnateur') {
            if ($isDigitalAgency) {
                if ($isEscaladees) {
                    $sql .= " AND r.pilote_escaladeur_id IS NOT NULL";
                }
            } else {
                if ($isEscaladees) {
                    $sql .= " AND r.agence_origine_id = :agence_id AND r.pilote_escaladeur_id IS NOT NULL";
                } else {
                    $sql .= " AND r.agence_id = :agence_id";
                }
                $params[':agence_id'] = $user['agence_id'];
            }
        } elseif ($user['role'] === 'pilote') {
            if ($isDigitalAgency) {
                if ($isEscaladees) {
                    $sql .= " AND r.pilote_escaladeur_id IS NOT NULL";
                }
            } else {
                if ($isEscaladees) {
                    $sql .= " AND r.agence_origine_id = :agence_id AND r.pilote_escaladeur_id IS NOT NULL";
                } else {
                    $sql .= " AND r.agence_id = :agence_id";
                    
                    // Un pilote ne voit les nouvelles réclamations que si :
                    // - il est affecté au processus
                    // - OU personne n'est affecté à ce processus dans l'agence
                    $sql .= " AND (
                        r.statut != 'nouveau' 
                        OR r.processus_id IN (SELECT processus_id FROM affectations_pilotes WHERE pilote_id = :uid AND agence_id = :agence_id)
                        OR r.processus_id NOT IN (SELECT processus_id FROM affectations_pilotes WHERE agence_id = :agence_id)
                    )";
                    $params[':uid'] = $user['id'];
                }
                $params[':agence_id'] = $user['agence_id'];
            }
        } elseif ($user['role'] === 'superviseur') {
            $switchAgence = $_GET['agence_id'] ?? null;
            if ($isEscaladees) {
                if ($switchAgence) {
                    $sql .= " AND r.agence_origine_id = :agence_id AND r.pilote_escaladeur_id IS NOT NULL";
                    $params[':agence_id'] = (int)$switchAgence;
                } else {
                    $sql .= " AND r.pilote_escaladeur_id IS NOT NULL";
                }
            } else {
                if ($switchAgence) {
                    $sql .= " AND r.agence_id = :agence_id";
                    $params[':agence_id'] = (int)$switchAgence;
                }
            }
        }

        // ─── Filtres optionnels ────────────────────────────────
        if (!empty($_GET['statut'])) {
            $sql .= " AND r.statut = :statut";
            $params[':statut'] = $_GET['statut'];
        }
        if (!empty($_GET['processus_id'])) {
            $sql .= " AND r.processus_id = :processus_id";
            $params[':processus_id'] = (int)$_GET['processus_id'];
        }
        if (!empty($_GET['hors_sla']) && $_GET['hors_sla'] === '1') {
            $sql .= " AND r.hors_sla = TRUE";
        }
        if (!empty($_GET['correction']) && $_GET['correction'] === '1') {
            $sql .= " AND r.statut = 'en_cours' AND r.remarques_coordination IS NOT NULL AND r.remarques_coordination <> ''";
        }
        if (!empty($_GET['q'])) {
            $sql .= " AND (r.numero_ticket ILIKE :q OR r.partenaire_nom ILIKE :q OR r.partenaire_nom_prenoms ILIKE :q OR r.partenaire_raison_sociale ILIKE :q)";
            $params[':q'] = '%' . $_GET['q'] . '%';
        }

        // Mise à jour automatique hors_sla
        $pdo->exec("
            UPDATE reclamations
            SET hors_sla = TRUE
            WHERE date_echeance_sla < NOW()
              AND statut NOT IN ('resolu', 'rejete')
              AND hors_sla = FALSE
        ");

        $sql .= " ORDER BY r.date_creation DESC LIMIT 200";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/reclamations ──────────────────────────────
    public function create(): void
    {
        Auth::requireRole(['agent', 'pilote', 'coordonnateur', 'superviseur']);

        $data = json_decode(file_get_contents('php://input'), true);

        $required = [
            'partenaire_type', 'regime_id', 
            'type_client_id', 'mode_saisine_id', 'processus_id', 
            'motif_id', 'sous_motif_id'
        ];
        
        foreach ($required as $field) {
            if (empty($data[$field])) {
                http_response_code(400);
                echo json_encode(['error' => "Champ requis : {$field}"]);
                return;
            }
        }

        if (empty($data['partenaire_nom_prenoms']) && empty($data['partenaire_raison_sociale'])) {
            http_response_code(400);
            echo json_encode(['error' => "Vous devez renseigner au moins le Nom et Prénoms ou la Raison sociale"]);
            return;
        }

        if (!empty($data['partenaire_nom_prenoms']) && !empty($data['partenaire_raison_sociale'])) {
            http_response_code(400);
            echo json_encode(['error' => "Vous ne pouvez pas renseigner à la fois le Nom/Prénoms et la Raison sociale"]);
            return;
        }

        $user = Auth::$user;
        $pdo  = Database::getConnection();
        $agenceId = $user['agence_id'];

        // 1. Détermination automatique du pilote
        // Affectation automatique si un seul pilote gère ce processus dans l'agence
        $processusId = (int)$data['processus_id'];
        $piloteId = $this->findUniquePiloteForProcessus($pdo, $agenceId, $processusId);
        $statut   = $piloteId ? 'en_cours' : 'nouveau';

        // 2. Insertion de la réclamation
        // Note: numero_ticket et date_echeance_sla sont gérés par le trigger
        $stmt = $pdo->prepare("
            INSERT INTO reclamations
                (partenaire_type, partenaire_id, partenaire_nom, 
                 partenaire_nom_prenoms, partenaire_raison_sociale, partenaire_employeur_numero_cnps,
                 partenaire_identifiant, partenaire_sexe, partenaire_telephone,
                 partenaire_email, partenaire_employeur, date_reception,
                 regime_id, type_client_id, mode_saisine_id, 
                 processus_id, motif_id, sous_motif_id,
                 description, statut, agent_createur_id, pilote_id, agence_id, agence_origine_id, date_creation)
            VALUES
                (:ptype, :pid, :pnom, 
                 :pnom_prenoms, :praison_sociale, :pemployeur_cnps,
                 :pidentifiant, :psexe, :ptele, :pemail, :pemployeur, :date_reception,
                 :regime_id, :type_client_id, :mode_id,
                 :proc_id, :motif_id, :sous_motif_id,
                 :description, :statut, :agent_id, :pilote_id, :agence_id, :agence_id, NOW())
            RETURNING id, numero_ticket
        ");

        $stmt->execute([
            ':ptype'          => $data['partenaire_type'],
            ':pid'            => null,
            ':pnom'           => trim(($data['partenaire_nom_prenoms'] ?? '') . ' ' . ($data['partenaire_raison_sociale'] ?? '')),
            ':pnom_prenoms'   => $data['partenaire_nom_prenoms'] ?? null,
            ':praison_sociale'=> $data['partenaire_raison_sociale'] ?? null,
            ':pemployeur_cnps'=> $data['partenaire_employeur_numero_cnps'] ?? null,
            ':pidentifiant'   => $data['partenaire_identifiant'] ?? null,
            ':psexe'          => $data['partenaire_sexe'] ?? null,
            ':ptele'          => $data['partenaire_telephone'] ?? null,
            ':pemail'         => $data['partenaire_email'] ?? null,
            ':pemployeur'     => $data['partenaire_employeur'] ?? null,
            ':date_reception' => $data['date_reception'] ?? date('Y-m-d'),
            ':regime_id'      => (int)$data['regime_id'],
            ':type_client_id' => (int)$data['type_client_id'],
            ':mode_id'        => (int)$data['mode_saisine_id'],
            ':proc_id'        => (int)$data['processus_id'],
            ':motif_id'       => (int)$data['motif_id'],
            ':sous_motif_id'  => (int)$data['sous_motif_id'],
            ':description'    => $data['description'] ?? '',
            ':statut'         => $statut,
            ':agent_id'       => $user['id'],
            ':pilote_id'      => $piloteId,
            ':agence_id'      => $agenceId
        ]);

        $result = $stmt->fetch();
        $recId  = (int)$result['id'];
        
        $msg = "Réclamation créée par " . $user['nom'];
        if ($piloteId) $msg .= ". Affectation automatique effectuée.";
        
        Audit::log($recId, 'creation', $msg . " (Ticket: " . $result['numero_ticket'] . ")");

        // 3. Notification Email au pilote si affecté
        if ($piloteId) {
            $userModel = new UtilisateurModel();
            $pilot = $userModel->findById($piloteId);
            if ($pilot) {
                try {
                    MailService::getInstance()->notifyNewReclamation([
                        'id' => $recId,
                        'numero_ticket' => $result['numero_ticket'],
                        'objet' => ($data['partenaire_nom_prenoms'] ?? $data['partenaire_raison_sociale'] ?? 'Client') . ' - ' . ($data['description'] ?? ''),
                        'date_reception' => $data['date_reception'] ?? date('Y-m-d')
                    ], $pilot);
                } catch (\Exception $e) {
                    error_log("Erreur lors de la notification de nouvelle réclamation: " . $e->getMessage());
                }
            }
        }

        http_response_code(201);
        echo json_encode([
            'message'       => 'Réclamation créée', 
            'id'            => $recId, 
            'numero_ticket' => $result['numero_ticket'],
            'pilote_id'     => $piloteId,
            'statut'        => $statut
        ]);
    }

    private function findUniquePiloteForProcessus($pdo, int $agenceId, int $processusId): ?int
    {
        $stmt = $pdo->prepare("
            SELECT pilote_id 
            FROM affectations_pilotes 
            WHERE agence_id = :agence_id 
              AND processus_id = :processus_id
        ");
        $stmt->execute([':agence_id' => $agenceId, ':processus_id' => $processusId]);
        $affectations = $stmt->fetchAll();

        if (count($affectations) === 1) {
            $stmtActif = $pdo->prepare("SELECT id FROM utilisateurs WHERE id = :id AND actif = TRUE");
            $stmtActif->execute([':id' => $affectations[0]['pilote_id']]);
            if ($stmtActif->fetch()) {
                return (int)$affectations[0]['pilote_id'];
            }
        }
        return null;
    }

    // ─── GET /api/reclamations/{id} ──────────────────────────
    public function show(int $id): void
    {
        Auth::require();
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $stmt = $pdo->prepare("
            SELECT r.*,
                   reg.libelle AS regime_libelle, reg.has_employeur AS regime_has_employeur,
                   tc.libelle  AS type_client_libelle,
                   ms.libelle  AS mode_saisine_libelle,
                   p.libelle   AS processus_libelle, p.code AS processus_code,
                   m.libelle     AS motif_libelle,
                   sm.libelle  AS sous_motif_libelle, sm.delai_traitement_jours,
                   a.nom AS agence_nom, a.code AS agence_code, a.type AS agence_type,
                   ao.nom AS agence_origine_nom,
                   cc.libelle AS categorie_cause_libelle,
                   c.libelle AS cause_libelle,
                   CONCAT(rc.prenoms, ' ', rc.nom) AS agent_nom,
                   CONCAT(rp.prenoms, ' ', rp.nom) AS pilote_nom
            FROM reclamations r
            JOIN regimes      reg ON reg.id = r.regime_id
            JOIN types_clients tc ON tc.id = r.type_client_id
            JOIN modes_saisine ms ON ms.id = r.mode_saisine_id
            JOIN processus    p   ON p.id = r.processus_id
            JOIN motifs       m   ON m.id = r.motif_id
            JOIN sous_motifs  sm  ON sm.id = r.sous_motif_id
            JOIN agences      a   ON a.id = r.agence_id
            JOIN agences      ao  ON ao.id = r.agence_origine_id
            JOIN utilisateurs uc  ON uc.id = r.agent_createur_id
            JOIN ressources   rc  ON rc.id = uc.ressource_id
            LEFT JOIN categories_causes cc ON cc.id = r.categorie_cause_id
            LEFT JOIN causes            c  ON c.id = r.cause_id
            LEFT JOIN utilisateurs up ON up.id = r.pilote_id
            LEFT JOIN ressources   rp ON rp.id = up.ressource_id
            WHERE r.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $rec = $stmt->fetch();

        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        // Vérification scoping
        $isDigitalAgency = false;
        if (!empty($user['agence_id'])) {
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$user['agence_id']]);
            $userAgenceNom = $stmtA->fetchColumn() ?: '';
            $isDigitalAgency = (stripos($userAgenceNom, 'digitale') !== false);
        }

        /* 
        // Commenté pour permettre la consultation de l'historique inter-agences
        if (!$isDigitalAgency) {
            if ($user['role'] === 'agent') {
                $stmtDigital = $pdo->prepare("SELECT id FROM agences WHERE nom ILIKE :nom LIMIT 1");
                $stmtDigital->execute([':nom' => '%digitale%']);
                $digitalAgencyId = (int)$stmtDigital->fetchColumn();

                if ((int)$user['agence_id'] === $digitalAgencyId) {
                    if ((int)$rec['agence_id'] !== (int)$user['agence_id']) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Accès non autorisé pour cette agence']);
                        return;
                    }
                } else {
                    if ($rec['agent_createur_id'] != $user['id']) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Accès non autorisé']);
                        return;
                    }
                }
            }
            
            if ($user['role'] === 'pilote') {
                if ($rec['pilote_id'] != $user['id'] && $rec['agence_id'] != $user['agence_id'] && $rec['agence_origine_id'] != $user['agence_id']) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Accès non autorisé']);
                    return;
                }
            } elseif ($user['role'] === 'coordonnateur') {
                if ($rec['agence_id'] != $user['agence_id'] && $rec['agence_origine_id'] != $user['agence_id']) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Accès non autorisé']);
                    return;
                }
            }
        }
        */

        // Actions de traitement
        $actStmt = $pdo->prepare("
            SELECT at.*, CONCAT(r.prenoms, ' ', r.nom) AS ressource_nom
            FROM actions_traitement at
            LEFT JOIN ressources r ON r.id = at.ressource_id
            WHERE at.reclamation_id = :id
            ORDER BY at.created_at
        ");
        $actStmt->execute([':id' => $id]);

        // Historique
        $histStmt = $pdo->prepare("
            SELECT * FROM historique WHERE reclamation_id = :id ORDER BY date_action ASC
        ");
        $histStmt->execute([':id' => $id]);

        echo json_encode([
            'data'     => $rec,
            'actions'  => $actStmt->fetchAll(),
            'historique' => $histStmt->fetchAll(),
        ]);
    }

    // ─── PUT /api/reclamations/{id}/statut ───────────────────
    public function updateStatut(int $id): void
    {
        Auth::requireRole(['pilote', 'coordonnateur', 'superviseur']);

        $data   = json_decode(file_get_contents('php://input'), true);
        $statut = $data['statut'] ?? '';
        $valid  = ['nouveau', 'en_cours', 'a_valider', 'resolu', 'rejete'];

        if (!in_array($statut, $valid)) {
            http_response_code(400);
            echo json_encode(['error' => 'Statut invalide']);
            return;
        }

        $pdo  = Database::getConnection();
        $user = Auth::$user;

        // Scoping Check
        if (!$this->checkAccess($pdo, $id, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé pour cette réclamation']);
            return;
        }

        $dateResolution = $statut === 'resolu' ? 'NOW()' : 'NULL';

        $stmt = $pdo->prepare("
            UPDATE reclamations
            SET statut = :statut, pilote_id = COALESCE(:pilote_id, pilote_id),
                date_resolution = " . (in_array($statut, ['resolu', 'rejete']) ? 'NOW()' : 'date_resolution') . "
            WHERE id = :id
            RETURNING id
        ");
        $stmt->execute([
            ':statut'   => $statut,
            ':pilote_id'=> $user['role'] === 'pilote' ? $user['id'] : null,
            ':id'       => $id,
        ]);

        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        Audit::log($id, 'prise_en_charge', $data['commentaire'] ?? "Statut changé en : {$statut}");

        // Notification Coordonnateur si passage en 'a_valider'
        if ($statut === 'a_valider') {
            $userModel = new UtilisateurModel();
            $coordinators = $userModel->getCoordonnateursByAgence($user['agence_id']);
            
            // On récupère les infos du ticket pour l'email
            $stmtTicket = $pdo->prepare("SELECT numero_ticket FROM reclamations WHERE id = ?");
            $stmtTicket->execute([$id]);
            $ticketNum = $stmtTicket->fetchColumn();

            foreach ($coordinators as $coord) {
                MailService::getInstance()->notifyValidationPending([
                    'id' => $id,
                    'numero_ticket' => $ticketNum,
                    'pilote_nom' => $user['prenoms'] . ' ' . $user['nom']
                ], $coord);
            }
        }

        echo json_encode(['message' => 'Statut mis à jour']);
    }

    // ─── PUT /api/reclamations/{id}/analyse ─────────────────
    public function updateAnalyse(int $id): void
    {
        Auth::requireRole(['pilote', 'superviseur']);

        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        // Scoping Check
        if (!$this->checkAccess($pdo, $id, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé pour cette réclamation']);
            return;
        }

        $stmt = $pdo->prepare("
            UPDATE reclamations
            SET categorie_cause_id = :ccid,
                cause_id           = :cid,
                analyse_commentaire = :commentaire
            WHERE id = :id
            RETURNING id
        ");
        $stmt->execute([
            ':ccid'        => !empty($data['categorie_cause_id']) ? (int)$data['categorie_cause_id'] : null,
            ':cid'         => !empty($data['cause_id']) ? (int)$data['cause_id'] : null,
            ':commentaire' => !empty($data['analyse_commentaire']) ? $data['analyse_commentaire'] : null,
            ':id'          => $id,
        ]);

        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        // Récupérer les libellés pour l'historique
        $ccLabel = 'N/A';
        $cLabel  = 'N/A';
        if (!empty($data['categorie_cause_id'])) {
            $st = $pdo->prepare("SELECT libelle FROM categories_causes WHERE id = ?");
            $st->execute([$data['categorie_cause_id']]);
            $ccLabel = $st->fetchColumn();
        }
        if (!empty($data['cause_id'])) {
            $st = $pdo->prepare("SELECT libelle FROM causes WHERE id = ?");
            $st->execute([$data['cause_id']]);
            $cLabel = $st->fetchColumn();
        }

        $logMsg = "Analyse mise à jour. Cause : {$ccLabel} > {$cLabel}";
        $metadata = [
            'categorie' => $ccLabel,
            'cause'     => $cLabel,
            'analyse_commentaire' => $data['analyse_commentaire'] ?? ''
        ];

        Audit::log($id, 'analyse', $logMsg, $metadata);

        echo json_encode(['message' => 'Analyse mise à jour']);
    }

    public function updateRemarques(int $id): void
    {
        Auth::requireRole(['coordonnateur', 'superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        // Scoping Check
        if (!$this->checkAccess($pdo, $id, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé pour cette réclamation']);
            return;
        }

        // Vérification du statut
        $stmtStatus = $pdo->prepare("SELECT statut FROM reclamations WHERE id = :id");
        $stmtStatus->execute([':id' => $id]);
        $statut = $stmtStatus->fetchColumn();

        if ($statut !== 'a_valider') {
            http_response_code(403);
            echo json_encode(['error' => "Modification impossible : le dossier est en statut '{$statut}'"]);
            return;
        }

        $stmt = $pdo->prepare("UPDATE reclamations SET remarques_coordination = :rem WHERE id = :id RETURNING id");
        $stmt->execute([
            ':rem' => $data['remarques_coordination'] ?? '',
            ':id'  => $id
        ]);

        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        Audit::log($id, 'commentaire', "Remarques de coordination ajoutées/modifiées");
        echo json_encode(['message' => 'Remarques enregistrées']);
    }

    // ─── PUT /api/reclamations/{id}/escalader ────────────────
    public function escalader(int $id): void
    {
        Auth::requireRole(['pilote', 'superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $agenceCibleId = (int)($data['agence_cible_id'] ?? 0);
        $commentaire   = trim($data['commentaire'] ?? '');

        if (!$agenceCibleId) {
            http_response_code(400);
            echo json_encode(['error' => 'Agence cible requise']);
            return;
        }

        // Vérification access
        if (!$this->checkAccess($pdo, $id, $user)) {
            http_response_code(403);
            echo json_encode(['error' => 'Accès non autorisé']);
            return;
        }

        // Récupérer infos agence cible pour le log
        $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
        $stmtA->execute([$agenceCibleId]);
        $agenceNom = $stmtA->fetchColumn();

        if (!$agenceNom) {
            http_response_code(400);
            echo json_encode(['error' => 'Agence cible invalide']);
            return;
        }

        // Update de la réclamation
        $stmtP = $pdo->prepare("SELECT processus_id FROM reclamations WHERE id = ?");
        $stmtP->execute([$id]);
        $processusId = (int)$stmtP->fetchColumn();

        // Affectation automatique si agence cible a un seul pilote pour ce processus
        $piloteIdCible = $this->findUniquePiloteForProcessus($pdo, $agenceCibleId, $processusId);
        $statutCible   = $piloteIdCible ? 'en_cours' : 'nouveau';

        $stmt = $pdo->prepare("
            UPDATE reclamations
            SET agence_id = :agence_id,
                pilote_id = :pilote_id,
                statut    = :statut,
                pilote_escaladeur_id = :escaladeur_id,
                updated_at = NOW()
            WHERE id = :id
            RETURNING id
        ");
        $stmt->execute([
            ':agence_id' => $agenceCibleId,
            ':pilote_id' => $piloteIdCible,
            ':statut'    => $statutCible,
            ':escaladeur_id' => $user['id'],
            ':id'        => $id
        ]);

        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Réclamation introuvable']);
            return;
        }

        // Log de l'escalade
        $logMsg = "Dossier escaladé vers l'agence : {$agenceNom}. Motif : {$commentaire}";
        if ($piloteIdCible) $logMsg .= " (Affectation automatique effectuée).";

        Audit::log($id, 'escalade', $logMsg, [
            'agence_cible_id' => $agenceCibleId,
            'agence_cible_nom' => $agenceNom,
            'motif_escalade' => $commentaire,
            'auto_assigned_pilote_id' => $piloteIdCible
        ]);

        echo json_encode(['message' => 'Dossier escaladé avec succès']);
    }

    // ─── PUT /api/reclamations/{id}/qualify ───────────────────
    public function history()
    {
        Auth::require();
        $identifiant = $_GET['identifiant'] ?? '';
        if (!$identifiant) {
            echo json_encode([]);
            return;
        }
        
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("
                SELECT r.id, r.numero_ticket, r.statut, r.date_creation as created_at, 
                       p.libelle as processus_libelle, m.libelle as motif_libelle
                FROM reclamations r
                LEFT JOIN processus p ON r.processus_id = p.id
                LEFT JOIN motifs m ON r.motif_id = m.id
                WHERE r.partenaire_identifiant = :identifiant
                ORDER BY r.date_creation DESC
            ");
            $stmt->execute([':identifiant' => $identifiant]);
            echo json_encode($stmt->fetchAll(\PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {
            error_log("History error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération de l\'historique']);
        }
    }

    public function qualify(int $id): void
    {
        Auth::require();
        $pdo = Database::getConnection();
        $user = Auth::$user;

        // On vérifie que l'utilisateur appartient bien à l'agence digitale (nom LIKE %digitale%) ou est superviseur/administrateur
        $stmtDigital = $pdo->prepare("SELECT id FROM agences WHERE nom ILIKE :nom LIMIT 1");
        $stmtDigital->execute([':nom' => '%digitale%']);
        $digitalAgencyId = (int)$stmtDigital->fetchColumn();

        if ($user['role'] !== 'superviseur' && $user['role'] !== 'administrateur' && (int)$user['agence_id'] !== $digitalAgencyId) {
            http_response_code(403);
            echo json_encode(['error' => "Seuls les agents de l'Agence Digitale peuvent qualifier ces réclamations."]);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $processusId = isset($data['processus_id']) ? (int)$data['processus_id'] : null;
        $motifId     = isset($data['motif_id']) ? (int)$data['motif_id'] : null;
        $sousMotifId = isset($data['sous_motif_id']) ? (int)$data['sous_motif_id'] : null;
        $commentaireAgent = isset($data['commentaire_agent']) ? trim($data['commentaire_agent']) : null;

        if (!$processusId || !$motifId || !$sousMotifId) {
            http_response_code(400);
            echo json_encode(['error' => "Les champs processus_id, motif_id et sous_motif_id sont obligatoires."]);
            return;
        }

        // On vérifie que la réclamation existe
        $stmtCheck = $pdo->prepare("SELECT agence_id, statut, numero_ticket FROM reclamations WHERE id = ?");
        $stmtCheck->execute([$id]);
        $rec = $stmtCheck->fetch();

        if (!$rec) {
            http_response_code(404);
            echo json_encode(['error' => "Réclamation introuvable."]);
            return;
        }

        // 1. Détermination automatique du pilote si le processus a changé
        $piloteId = $this->findUniquePiloteForProcessus($pdo, (int)$rec['agence_id'], $processusId);
        $statut = $piloteId ? 'en_cours' : 'nouveau';

        // 2. Mise à jour de la réclamation
        $stmtUpdate = $pdo->prepare("
            UPDATE reclamations
            SET processus_id = :processus_id,
                motif_id = :motif_id,
                sous_motif_id = :sous_motif_id,
                commentaire_agent = :commentaire_agent,
                pilote_id = COALESCE(:pilote_id, pilote_id),
                statut = CASE WHEN statut = 'nouveau' THEN :statut ELSE statut END,
                updated_at = NOW()
            WHERE id = :id
            RETURNING id
        ");

        $stmtUpdate->execute([
            ':processus_id' => $processusId,
            ':motif_id' => $motifId,
            ':sous_motif_id' => $sousMotifId,
            ':commentaire_agent' => $commentaireAgent,
            ':pilote_id' => $piloteId,
            ':statut' => $statut,
            ':id' => $id
        ]);

        // Récupérer les libellés pour l'historique
        $stmtP = $pdo->prepare("SELECT libelle FROM processus WHERE id = ?");
        $stmtP->execute([$processusId]);
        $procLabel = $stmtP->fetchColumn();

        $stmtM = $pdo->prepare("SELECT libelle FROM motifs WHERE id = ?");
        $stmtM->execute([$motifId]);
        $motifLabel = $stmtM->fetchColumn();

        $stmtS = $pdo->prepare("SELECT libelle FROM sous_motifs WHERE id = ?");
        $stmtS->execute([$sousMotifId]);
        $sousMotifLabel = $stmtS->fetchColumn();

        $logMsg = "Réclamation qualifiée par " . $user['nom'] . " " . $user['prenoms'] . ". Processus : {$procLabel}, Motif : {$motifLabel}, Précision : {$sousMotifLabel}.";
        if ($piloteId) {
            $logMsg .= " Prise en charge automatique du pilote.";
        }

        Audit::log($id, 'qualification', $logMsg, [
            'processus' => $procLabel,
            'motif' => $motifLabel,
            'precision' => $sousMotifLabel,
            'commentaire_agent' => $commentaireAgent
        ]);

        echo json_encode([
            'message' => "Réclamation qualifiée avec succès.",
            'statut' => $rec['statut'] === 'nouveau' ? $statut : $rec['statut'],
            'pilote_id' => $piloteId
        ]);
    }

    // ─── Helper: vérification des droits sur la réclamation ──
    private function checkAccess($pdo, int $reclamationId, array $user): bool
    {
        if ($user['role'] === 'administrateur' || $user['role'] === 'superviseur') {
            return true;
        }

        $isDigitalAgency = false;
        if (!empty($user['agence_id'])) {
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$user['agence_id']]);
            $userAgenceNom = $stmtA->fetchColumn() ?: '';
            $isDigitalAgency = (stripos($userAgenceNom, 'digitale') !== false);
        }

        if ($isDigitalAgency) {
            return true;
        }

        $stmt = $pdo->prepare("SELECT agent_createur_id, agence_id, agence_origine_id FROM reclamations WHERE id = :id");
        $stmt->execute([':id' => $reclamationId]);
        $rec = $stmt->fetch();

        if (!$rec) return false;

        if ($user['role'] === 'agent') {
            return (int)$rec['agent_createur_id'] === (int)$user['id'];
        }

        if (in_array($user['role'], ['pilote', 'coordonnateur', 'manager'])) {
            return (int)$rec['agence_id'] === (int)$user['agence_id'] || (int)$rec['agence_origine_id'] === (int)$user['agence_id'];
        }

        return false;
    }


}
