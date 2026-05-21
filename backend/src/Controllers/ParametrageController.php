<?php
// ============================================================
// Controllers/ParametrageController.php
// GET /api/motifs, /api/processus, /api/agences, /api/ressources
// CRUD admin: POST/PUT/DELETE pour motifs, agences, utilisateurs
// ============================================================

namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Utils\Audit;

class ParametrageController
{
    // ─── GET /api/ressources ────────────────────────────────
    public function listRessources(): void
    {
        Auth::require();
        $pdo = Database::getConnection();
        $stmt = $pdo->query("
            SELECT r.*, a.nom as agence_nom, 
                   (SELECT u.id FROM utilisateurs u WHERE u.ressource_id = r.id LIMIT 1) as linked_user_id
            FROM ressources r 
            JOIN agences a ON a.id = r.agence_id 
            ORDER BY r.nom, r.prenoms
        ");
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/ressources ───────────────────────────────
    public function createRessource(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif) VALUES (:mat, :nom, :pre, :aid, :act) RETURNING id");
        $stmt->execute([
            ':mat' => $data['matricule'],
            ':nom' => $data['nom'],
            ':pre' => $data['prenoms'],
            ':aid' => $data['agence_id'],
            ':act' => $data['actif'] ? 'true' : 'false'
        ]);

        $resId = $stmt->fetch()['id'];
        Audit::log(null, 'admin_action', "Ressource créée: {$data['nom']} {$data['prenoms']} ({$data['matricule']})");
        echo json_encode(['message' => 'Ressource créée', 'id' => $resId]);
    }

    // ─── PUT /api/ressources/{id} ───────────────────────────
    public function updateRessource(int $id): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $actif = $data['actif'] ? 'true' : 'false';
            
            // Mise à jour de la ressource
            $stmt = $pdo->prepare("UPDATE ressources SET matricule = :mat, nom = :nom, prenoms = :pre, agence_id = :aid, actif = :act WHERE id = :id");
            $stmt->execute([
                ':mat' => $data['matricule'],
                ':nom' => $data['nom'],
                ':pre' => $data['prenoms'],
                ':aid' => $data['agence_id'],
                ':act' => $actif,
                ':id'  => $id
            ]);

            // Cascade vers l'utilisateur si désactivation
            if (!$data['actif']) {
                $stmt = $pdo->prepare("UPDATE utilisateurs SET actif = FALSE WHERE ressource_id = :rid");
                $stmt->execute([':rid' => $id]);
            }

            $pdo->commit();
            Audit::log(null, 'admin_action', "Ressource mise à jour: {$data['nom']} {$data['prenoms']} (Actif: $actif)");
            echo json_encode(['message' => 'Ressource mise à jour' . (!$data['actif'] ? ' (Compte utilisateur désactivé si existant)' : '')]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ─── GET /api/regimes ────────────────────────────────────
    public function regimes(): void
    {
        Auth::require();
        $stmt = Database::getConnection()->query("SELECT * FROM regimes WHERE actif = TRUE ORDER BY libelle");
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/types-clients?regime_id=X ──────────────────
    public function typesClients(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $params = [];
        $sql    = "SELECT * FROM types_clients WHERE actif = TRUE";
        
        if (!empty($_GET['regime_id'])) {
            $sql .= " AND regime_id = :rid";
            $params[':rid'] = (int)$_GET['regime_id'];
        }
        
        $stmt = $pdo->prepare($sql . " ORDER BY libelle");
        $stmt->execute($params);
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/modes-saisine ──────────────────────────────
    public function modesSaisine(): void
    {
        Auth::require();
        $stmt = Database::getConnection()->query("SELECT * FROM modes_saisine ORDER BY libelle");
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    public function createModeSaisine(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("INSERT INTO modes_saisine (libelle) VALUES (:lib)");
        $stmt->execute([':lib' => $data['libelle']]);
        echo json_encode(['message' => 'Mode de saisine créé']);
    }

    public function updateModeSaisine(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE modes_saisine SET libelle = :lib WHERE id = :id");
        $stmt->execute([':lib' => $data['libelle'], ':id' => $id]);
        echo json_encode(['message' => 'Mode de saisine mis à jour']);
    }

    // ─── GET /api/processus ──────────────────────────────────
    public function processus(): void
    {
        Auth::require();
        $stmt = Database::getConnection()->query("SELECT * FROM processus WHERE actif = TRUE ORDER BY libelle");
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/motifs?processus_id=X ─────────────────────
    public function motifs(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $params = [];

        $sql = "
            SELECT m.*, 
                   r.libelle AS regime_libelle,
                   tc.libelle AS type_client_libelle,
                   (SELECT json_agg(sm.*) FROM sous_motifs sm WHERE sm.motif_id = m.id) AS sous_motifs
            FROM motifs m
            LEFT JOIN regimes r ON r.id = m.regime_id
            LEFT JOIN types_clients tc ON tc.id = m.type_client_id
            WHERE 1=1
        ";

        if (!empty($_GET['regime_id'])) {
            $sql .= " AND m.regime_id = :rid";
            $params[':rid'] = (int)$_GET['regime_id'];
        }
        
        if (!empty($_GET['type_client_id'])) {
            $sql .= " AND m.type_client_id = :tcid";
            $params[':tcid'] = (int)$_GET['type_client_id'];
        }

        $sql .= " ORDER BY r.libelle, tc.libelle, m.libelle";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/sous-motifs?motif_id=X ────────────────────
    public function sousMotifs(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $params = [];
        $sql    = "SELECT * FROM sous_motifs WHERE actif = TRUE";
        
        if (!empty($_GET['motif_id'])) {
            $sql .= " AND motif_id = :mid";
            $params[':mid'] = (int)$_GET['motif_id'];
        }
        
        $stmt = $pdo->prepare($sql . " ORDER BY libelle");
        $stmt->execute($params);
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/categories-causes?processus_id=X ──────────
    public function categoriesCauses(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $params = [];
        $sql    = "SELECT * FROM categories_causes WHERE 1=1";
        
        if (!empty($_GET['processus_id'])) {
            $sql .= " AND processus_id = :pid";
            $params[':pid'] = (int)$_GET['processus_id'];
        }
        
        $stmt = $pdo->prepare($sql . " ORDER BY libelle");
        $stmt->execute($params);
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/causes?categorie_id=X ─────────────────────
    public function causes(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $params = [];
        $sql    = "
            SELECT c.*, cat.libelle AS categorie_libelle, p.libelle AS processus_libelle
            FROM causes c
            JOIN categories_causes cat ON cat.id = c.categorie_id
            JOIN processus p ON p.id = cat.processus_id
            WHERE 1=1
        ";
        
        if (!empty($_GET['categorie_id'])) {
            $sql .= " AND c.categorie_id = :cid";
            $params[':cid'] = (int)$_GET['categorie_id'];
        }

        if (!empty($_GET['processus_id'])) {
            $sql .= " AND cat.processus_id = :pid";
            $params[':pid'] = (int)$_GET['processus_id'];
        }
        
        $stmt = $pdo->prepare($sql . " ORDER BY p.libelle, cat.libelle, c.libelle");
        $stmt->execute($params);
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/affectations ───────────────────────────────
    public function affectations(): void
    {
        Auth::requireRole(['superviseur']);
        $sql = "
            SELECT af.*, a.nom AS agence_nom, p.libelle AS processus_libelle,
                   CONCAT(r.prenoms, ' ', r.nom) AS pilote_nom
            FROM affectations_pilotes af
            JOIN agences      a ON a.id = af.agence_id
            JOIN processus    p ON p.id = af.processus_id
            JOIN utilisateurs u ON u.id = af.pilote_id
            JOIN ressources   r ON r.id = u.ressource_id
            ORDER BY a.nom, p.libelle
        ";
        $stmt = Database::getConnection()->query($sql);
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/affectations ──────────────────────────────
    public function createAffectation(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO affectations_pilotes (agence_id, processus_id, pilote_id)
            VALUES (:aid, :prid, :pid)
            ON CONFLICT (agence_id, processus_id, pilote_id) DO NOTHING
        ");
        $stmt->execute([
            ':aid'  => $data['agence_id'],
            ':prid' => $data['processus_id'],
            ':pid'  => $data['pilote_id']
        ]);

        echo json_encode(['message' => 'Affectation créée']);
    }

    // ─── GET /api/agences ────────────────────────────────────
    public function agences(): void
    {
        Auth::require();
        $stmt = Database::getConnection()->query("SELECT * FROM agences WHERE actif = TRUE ORDER BY nom");
        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/ressources?agence_id=X ────────────────────
    public function ressources(): void
    {
        Auth::require();
        $pdo    = Database::getConnection();
        $user   = Auth::$user;
        $params = [];

        $sql = "
            SELECT r.*, a.nom AS agence_nom, a.code AS agence_code
            FROM ressources r
            JOIN agences a ON a.id = r.agence_id
            WHERE r.actif = TRUE
        ";

        // Scoping: pilote/coordonnateur voient uniquement leur agence
        if (in_array($user['role'], ['pilote', 'coordonnateur', 'agent'])) {
            $sql .= " AND r.agence_id = :agence_id";
            $params[':agence_id'] = $user['agence_id'];
        } elseif (!empty($_GET['agence_id'])) {
            $sql .= " AND r.agence_id = :agence_id";
            $params[':agence_id'] = (int)$_GET['agence_id'];
        }

        // Filtrer par rôle utilisateur (pour dropdown affectation pilotes)
        if (!empty($_GET['role'])) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM utilisateurs u WHERE u.ressource_id = r.id AND u.role = :role AND u.actif = TRUE
            )";
            $params[':role'] = $_GET['role'];
        }

        $sql .= " ORDER BY r.nom, r.prenoms";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── GET /api/utilisateurs ───────────────────────────────
    public function utilisateurs(): void
    {
        Auth::requireRole(['administrateur', 'superviseur', 'coordonnateur']);
        $pdo    = Database::getConnection();
        $user   = Auth::$user;

        $sql = "
            SELECT u.id, u.email, u.role, u.actif, u.last_login,
                   r.id as ressource_id, r.matricule, r.nom, r.prenoms,
                   r.agence_id, a.nom AS agence_nom, a.code AS agence_code
            FROM utilisateurs u
            JOIN ressources r ON r.id = u.ressource_id
            JOIN agences    a ON a.id = r.agence_id
            WHERE 1=1
        ";
        $params = [];
        if (!empty($_GET['role'])) {
            $roles = explode(',', $_GET['role']);
            $placeholders = [];
            foreach ($roles as $i => $r) {
                $p = ":role" . $i;
                $placeholders[] = $p;
                $params[$p] = $r;
            }
            $sql .= " AND u.role IN (" . implode(',', $placeholders) . ")";
        }

        if ($user['role'] === 'coordonnateur') {
            $sql .= " AND r.agence_id = :agence_id";
            $params[':agence_id'] = $user['agence_id'];
        }

        $stmt = $pdo->prepare($sql . " ORDER BY r.nom");
        $stmt->execute($params);

        echo json_encode(['data' => $stmt->fetchAll()]);
    }

    // ─── POST /api/admin/motifs ──────────────────────────────
    public function createMotif(): void
    {
        Auth::requireRole(['superviseur']);

        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO motifs (regime_id, type_client_id, libelle)
            VALUES (:rid, :tcid, :lib)
            RETURNING id
        ");
        $stmt->execute([
            ':rid'  => $data['regime_id'] ?? null,
            ':tcid' => $data['type_client_id'] ?? null,
            ':lib'  => $data['libelle']
        ]);

        http_response_code(201);
        echo json_encode(['message' => 'Motif créé', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/admin/motifs/{id} ──────────────────────────
    public function updateMotif(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE motifs SET regime_id = :rid, type_client_id = :tcid, libelle = :lib WHERE id = :id");
        $stmt->execute([
            ':rid'  => $data['regime_id'] ?? null,
            ':tcid' => $data['type_client_id'] ?? null,
            ':lib'  => $data['libelle'],
            ':id'   => $id
        ]);

        echo json_encode(['message' => 'Motif mis à jour']);
    }

    // ─── POST /api/admin/sous-motifs ──────────────────────────
    public function createSousMotif(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("
            INSERT INTO sous_motifs (motif_id, libelle, delai_traitement_jours)
            VALUES (:mid, :lib, :delai)
            RETURNING id
        ");
        $stmt->execute([
            ':mid'   => $data['motif_id'],
            ':lib'   => $data['libelle'],
            ':delai' => $data['delai_traitement_jours'] ?? 5
        ]);

        http_response_code(201);
        echo json_encode(['message' => 'Sous-motif créé', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/admin/sous-motifs/{id} ──────────────────────
    public function updateSousMotif(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE sous_motifs SET motif_id = :mid, libelle = :lib, delai_traitement_jours = :delai WHERE id = :id");
        $stmt->execute([
            ':mid'   => $data['motif_id'],
            ':lib'   => $data['libelle'],
            ':delai' => $data['delai_traitement_jours'] ?? 5,
            ':id'    => $id
        ]);

        echo json_encode(['message' => 'Sous-motif mis à jour']);
    }

    // ─── POST /api/admin/processus ──────────────────────────
    public function createProcessus(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO processus (libelle, code) VALUES (:lib, :code) RETURNING id");
        $stmt->execute([':lib' => $data['libelle'], ':code' => strtoupper($data['code'] ?? 'PROC')]);

        http_response_code(201);
        echo json_encode(['message' => 'Processus créé', 'id' => $stmt->fetch()['id']]);
    }

    // ─── POST /api/admin/agences ─────────────────────────────
    public function createAgence(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO agences (nom, code, type) VALUES (:nom, :code, :type) RETURNING id");
        $stmt->execute([
            ':nom'  => $data['nom'],
            ':code' => strtoupper($data['code']),
            ':type' => $data['type'] ?? 'agence'
        ]);

        $agenceId = $stmt->fetch()['id'];
        Audit::log(null, 'admin_action', "Agence créée: {$data['nom']} ({$data['code']})");
        http_response_code(201);
        echo json_encode(['message' => 'Agence créée', 'id' => $agenceId]);
    }

    // ─── POST /api/admin/utilisateurs ────────────────────────
    public function createUtilisateur(): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $pdo->beginTransaction();
        try {
            $resId = $data['ressource_id'] ?? null;

            if (!$resId) {
                // 1. Créer la ressource
                $stmtR = $pdo->prepare("
                    INSERT INTO ressources (matricule, nom, prenoms, agence_id)
                    VALUES (:mat, :nom, :pre, :aid)
                    RETURNING id
                ");
                $stmtR->execute([
                    ':mat' => $data['matricule'],
                    ':nom' => $data['nom'],
                    ':pre' => $data['prenoms'],
                    ':aid' => $data['agence_id']
                ]);
                $resId = $stmtR->fetchColumn();
            }

            // 2. Créer l'utilisateur
            $stmtU = $pdo->prepare("
                INSERT INTO utilisateurs (ressource_id, email, password, role)
                VALUES (:rid, :email, :pass, :role)
            ");
            $stmtU->execute([
                ':rid'   => $resId,
                ':email' => $data['email'],
                ':pass'  => password_hash($data['password'] ?? bin2hex(random_bytes(8)), PASSWORD_DEFAULT),
                ':role'  => $data['role']
            ]);

            $pdo->commit();
            Audit::log(null, 'admin_action', "Utilisateur créé: {$data['email']} (Rôle: {$data['role']})");
            http_response_code(201);
            echo json_encode(['message' => 'Utilisateur créé']);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ─── PUT /api/admin/utilisateurs/{id} ─────────────────────
    public function updateUtilisateur(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $pdo->beginTransaction();
        try {
            // 1. Trouver la ressource liée
            $stmt = $pdo->prepare("SELECT ressource_id FROM utilisateurs WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $rid = $stmt->fetchColumn();

            if ($rid) {
                // 2. Mettre à jour la ressource (nom, prénoms, agence)
                $sqlR = "UPDATE ressources SET nom = :nom, prenoms = :pre, agence_id = :aid";
                $paramsR = [
                    ':nom' => $data['nom'],
                    ':pre' => $data['prenoms'],
                    ':aid' => $data['agence_id'],
                    ':rid' => $rid
                ];
                
                // Si on active l'utilisateur, on active forcément la ressource
                if ($data['actif']) {
                    $sqlR .= ", actif = TRUE";
                }

                $sqlR .= " WHERE id = :rid";
                $stmtR = $pdo->prepare($sqlR);
                $stmtR->execute($paramsR);
            }

            // 3. Mettre à jour l'utilisateur
            $sql = "UPDATE utilisateurs SET email = :email, role = :role, actif = :act";
            $params = [
                ':email' => $data['email'],
                ':role'  => $data['role'],
                ':act'   => $data['actif'] ? 'true' : 'false',
                ':id'    => $id
            ];

            if (!empty($data['password'])) {
                $sql .= ", password = :pass";
                $params[':pass'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            $sql .= " WHERE id = :id";
            $stmtU = $pdo->prepare($sql);
            $stmtU->execute($params);

            $pdo->commit();
            Audit::log(null, 'admin_action', "Utilisateur mis à jour: {$data['email']} (ID: $id)");
            echo json_encode(['message' => 'Utilisateur mis à jour']);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ─── PUT /api/processus/{id} ─────────────────────────────
    public function updateProcessus(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE processus SET libelle = :lib, code = :code WHERE id = :id");
        $stmt->execute([':lib' => $data['libelle'], ':code' => strtoupper($data['code']), ':id' => $id]);

        echo json_encode(['message' => 'Processus mis à jour']);
    }




    // ─── PUT /api/agences/{id} ─────────────────────────────
    public function updateAgence(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE agences SET nom = :nom, code = :code, type = :type WHERE id = :id");
        $stmt->execute([':nom' => $data['nom'], ':code' => strtoupper($data['code']), ':type' => $data['type'], ':id' => $id]);

        echo json_encode(['message' => 'Agence mise à jour']);
    }

    // ─── POST /api/regimes ──────────────────────────────────
    public function createRegime(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $hasEmployeur = isset($data['has_employeur']) ? ($data['has_employeur'] ? 'true' : 'false') : 'true';

        $stmt = $pdo->prepare("INSERT INTO regimes (libelle, has_employeur) VALUES (:lib, :he) RETURNING id");
        $stmt->execute([':lib' => $data['libelle'], ':he' => $hasEmployeur]);

        http_response_code(201);
        echo json_encode(['message' => 'Régime créé', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/regimes/{id} ──────────────────────────────
    public function updateRegime(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $hasEmployeur = isset($data['has_employeur']) ? ($data['has_employeur'] ? 'true' : 'false') : 'true';

        $stmt = $pdo->prepare("UPDATE regimes SET libelle = :lib, has_employeur = :he WHERE id = :id");
        $stmt->execute([':lib' => $data['libelle'], ':he' => $hasEmployeur, ':id' => $id]);

        echo json_encode(['message' => 'Régime mis à jour']);
    }

    // ─── POST /api/types-clients ─────────────────────────────
    public function createTypeClient(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO types_clients (regime_id, libelle) VALUES (:rid, :lib) RETURNING id");
        $stmt->execute([':rid' => $data['regime_id'], ':lib' => $data['libelle']]);

        http_response_code(201);
        echo json_encode(['message' => 'Type client créé', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/types-clients/{id} ─────────────────────────
    public function updateTypeClient(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE types_clients SET regime_id = :rid, libelle = :lib WHERE id = :id");
        $stmt->execute([':rid' => $data['regime_id'], ':lib' => $data['libelle'], ':id' => $id]);

        echo json_encode(['message' => 'Type client mis à jour']);
    }

    // ─── POST /api/categories-causes ────────────────────────
    public function createCategoryCause(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO categories_causes (processus_id, libelle) VALUES (:pid, :lib) RETURNING id");
        $stmt->execute([':pid' => $data['processus_id'], ':lib' => $data['libelle']]);

        http_response_code(201);
        echo json_encode(['message' => 'Catégorie de cause créée', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/categories-causes/{id} ─────────────────────
    public function updateCategoryCause(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE categories_causes SET processus_id = :pid, libelle = :lib WHERE id = :id");
        $stmt->execute([':pid' => $data['processus_id'], ':lib' => $data['libelle'], ':id' => $id]);

        echo json_encode(['message' => 'Catégorie de cause mise à jour']);
    }

    // ─── POST /api/causes ────────────────────────────────────
    public function createCause(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("INSERT INTO causes (categorie_id, libelle) VALUES (:cid, :lib) RETURNING id");
        $stmt->execute([':cid' => $data['categorie_id'], ':lib' => $data['libelle']]);

        http_response_code(201);
        echo json_encode(['message' => 'Cause créée', 'id' => $stmt->fetch()['id']]);
    }

    // ─── PUT /api/causes/{id} ────────────────────────────────
    public function updateCause(int $id): void
    {
        Auth::requireRole(['superviseur', 'coordonnateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();

        $stmt = $pdo->prepare("UPDATE causes SET categorie_id = :cid, libelle = :lib, actif = :actif WHERE id = :id");
        $stmt->execute([
            ':cid'   => $data['categorie_id'],
            ':lib'   => $data['libelle'],
            ':actif' => $data['actif'] ?? true,
            ':id'    => $id
        ]);

        echo json_encode(['message' => 'Cause mise à jour']);
    }

    // ─── POST /api/causes/import ─────────────────────────────
    public function importCauses(): void
    {
        Auth::requireRole(['superviseur']);
        
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Fichier manquant']);
            return;
        }

        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");
        
        // Détecter le délimiteur (, ou ;)
        $header = fgets($handle);
        $delimiter = (strpos($header, ';') !== false) ? ';' : ',';
        rewind($handle);

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $rowCount = 0;
            $importCount = 0;
            
            // Sauter l'entête
            fgetcsv($handle, 0, $delimiter);

            while (($data = fgetcsv($handle, 0, $delimiter)) !== FALSE) {
                $rowCount++;
                if (count($data) < 3) continue;

                $procCode = trim($data[0]);
                $catLabel = trim($data[1]);
                $causeLib = trim($data[2]);

                if (empty($procCode) || empty($catLabel) || empty($causeLib)) continue;

                // 1. Trouver le processus
                $stmt = $pdo->prepare("SELECT id FROM processus WHERE code = :code");
                $stmt->execute([':code' => strtoupper($procCode)]);
                $proc = $stmt->fetch();
                
                if (!$proc) continue; // On passe si le processus n'existe pas

                // 2. Trouver ou créer la catégorie
                $stmt = $pdo->prepare("SELECT id FROM categories_causes WHERE processus_id = :pid AND libelle = :lib");
                $stmt->execute([':pid' => $proc['id'], ':lib' => $catLabel]);
                $cat = $stmt->fetch();

                if (!$cat) {
                    $stmt = $pdo->prepare("INSERT INTO categories_causes (processus_id, libelle) VALUES (:pid, :lib) RETURNING id");
                    $stmt->execute([':pid' => $proc['id'], ':lib' => $catLabel]);
                    $catId = $stmt->fetch()['id'];
                } else {
                    $catId = $cat['id'];
                }

                // 3. Créer la cause (éviter les doublons exacts)
                $stmt = $pdo->prepare("SELECT id FROM causes WHERE categorie_id = :cid AND libelle = :lib");
                $stmt->execute([':cid' => $catId, ':lib' => $causeLib]);
                if (!$stmt->fetch()) {
                    $stmt = $pdo->prepare("INSERT INTO causes (categorie_id, libelle) VALUES (:cid, :lib)");
                    $stmt->execute([':cid' => $catId, ':lib' => $causeLib]);
                    $importCount++;
                }
            }
            
            $pdo->commit();
            fclose($handle);
            echo json_encode(['message' => "Importation réussie : $importCount causes importées.", 'processed' => $rowCount]);
            
        } catch (\Exception $e) {
            $pdo->rollBack();
            fclose($handle);
            http_response_code(500);
            echo json_encode(['error' => "Erreur lors de l'importation : " . $e->getMessage()]);
        }
    }

    // ─── POST /api/causes/bulk ─────────────────────────────
    public function bulkCauses(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides, tableau attendu']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $importCount = 0;
            
            foreach ($data as $row) {
                // On attend ['processus', 'categorie', 'cause']
                $procCode = trim($row['processus'] ?? '');
                $catLabel = trim($row['categorie'] ?? '');
                $causeLib = trim($row['cause']     ?? '');

                if (empty($procCode) || empty($catLabel) || empty($causeLib)) continue;

                // 1. Trouver le processus
                $stmt = $pdo->prepare("SELECT id FROM processus WHERE code = :code");
                $stmt->execute([':code' => strtoupper($procCode)]);
                $proc = $stmt->fetch();
                if (!$proc) continue;

                // 2. Trouver ou créer la catégorie
                $stmt = $pdo->prepare("SELECT id FROM categories_causes WHERE processus_id = :pid AND libelle = :lib");
                $stmt->execute([':pid' => $proc['id'], ':lib' => $catLabel]);
                $cat = $stmt->fetch();

                if (!$cat) {
                    $stmt = $pdo->prepare("INSERT INTO categories_causes (processus_id, libelle) VALUES (:pid, :lib) RETURNING id");
                    $stmt->execute([':pid' => $proc['id'], ':lib' => $catLabel]);
                    $catId = $stmt->fetch()['id'];
                } else {
                    $catId = $cat['id'];
                }

                // 3. Créer la cause
                $stmt = $pdo->prepare("SELECT id FROM causes WHERE categorie_id = :cid AND libelle = :lib");
                $stmt->execute([':cid' => $catId, ':lib' => $causeLib]);
                if (!$stmt->fetch()) {
                    $stmt = $pdo->prepare("INSERT INTO causes (categorie_id, libelle) VALUES (:cid, :lib)");
                    $stmt->execute([':cid' => $catId, ':lib' => $causeLib]);
                    $importCount++;
                }
            }
            
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $importCount causes enregistrées."]);
            
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => "Erreur lors de l'importation : " . $e->getMessage()]);
        }
    }

    public function bulkRessources(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides, tableau attendu']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $importCount = 0;
            
            foreach ($data as $row) {
                $matricule = trim($row['matricule'] ?? '');
                $nom = trim($row['nom'] ?? '');
                $prenoms = trim($row['prenoms'] ?? '');
                $codeAgence = trim($row['code_agence'] ?? '');

                if (empty($matricule) || empty($nom) || empty($codeAgence)) continue;

                $stmt = $pdo->prepare("SELECT id FROM agences WHERE code = :code");
                $stmt->execute([':code' => strtoupper($codeAgence)]);
                $agence = $stmt->fetch();
                if (!$agence) continue;

                $stmt = $pdo->prepare("SELECT id FROM ressources WHERE matricule = :mat");
                $stmt->execute([':mat' => strtoupper($matricule)]);
                $ressource = $stmt->fetch();

                if ($ressource) {
                    $stmt = $pdo->prepare("UPDATE ressources SET nom = :nom, prenoms = :prenoms, agence_id = :aid WHERE id = :id");
                    $stmt->execute([':nom' => $nom, ':prenoms' => $prenoms, ':aid' => $agence['id'], ':id' => $ressource['id']]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO ressources (matricule, nom, prenoms, agence_id) VALUES (:mat, :nom, :prenoms, :aid)");
                    $stmt->execute([':mat' => strtoupper($matricule), ':nom' => $nom, ':prenoms' => $prenoms, ':aid' => $agence['id']]);
                    $importCount++;
                }
            }
            
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $importCount nouvelles ressources enregistrées."]);
            
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => "Erreur lors de l'importation : " . $e->getMessage()]);
        }
    }

    public function bulkMotifs(): void
    {
        Auth::requireRole(['superviseur']);
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides, tableau attendu']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            $importCount = 0;
            
            foreach ($data as $row) {
                $regimeLib = trim($row['regime'] ?? '');
                $typeClientLib = trim($row['type_client'] ?? '');
                $libelle = trim($row['libelle'] ?? '');
                $sousMotifLib = trim($row['sous_motif'] ?? '');
                $delai = (int)($row['delai'] ?? 5);

                if (empty($regimeLib) || empty($libelle) || empty($sousMotifLib)) continue;

                // 1. Régime
                $stmt = $pdo->prepare("SELECT id FROM regimes WHERE libelle ILIKE :lib");
                $stmt->execute([':lib' => $regimeLib]);
                $regime = $stmt->fetch();
                
                if (!$regime) {
                    $stmt = $pdo->prepare("INSERT INTO regimes (libelle) VALUES (:lib) RETURNING id");
                    $stmt->execute([':lib' => $regimeLib]);
                    $regimeId = $stmt->fetch()['id'];
                } else {
                    $regimeId = $regime['id'];
                }

                // 2. Type Client
                $typeClientId = null;
                if (!empty($typeClientLib) && $typeClientLib !== '-') {
                    $stmt = $pdo->prepare("SELECT id FROM types_clients WHERE libelle ILIKE :lib AND regime_id = :rid");
                    $stmt->execute([':lib' => $typeClientLib, ':rid' => $regimeId]);
                    $typeClient = $stmt->fetch();
                    
                    if (!$typeClient) {
                        $stmt = $pdo->prepare("INSERT INTO types_clients (regime_id, libelle) VALUES (:rid, :lib) RETURNING id");
                        $stmt->execute([':rid' => $regimeId, ':lib' => $typeClientLib]);
                        $typeClientId = $stmt->fetch()['id'];
                    } else {
                        $typeClientId = $typeClient['id'];
                    }
                }

                // 3. Motif
                $queryMotif = "SELECT id FROM motifs WHERE regime_id = :rid AND libelle ILIKE :lib";
                $paramsMotif = [':rid' => $regimeId, ':lib' => $libelle];
                
                if ($typeClientId) {
                    $queryMotif .= " AND type_client_id = :tcid";
                    $paramsMotif[':tcid'] = $typeClientId;
                } else {
                    $queryMotif .= " AND type_client_id IS NULL";
                }

                $stmt = $pdo->prepare($queryMotif);
                $stmt->execute($paramsMotif);
                $motif = $stmt->fetch();

                if (!$motif) {
                    $stmt = $pdo->prepare("INSERT INTO motifs (regime_id, type_client_id, libelle) VALUES (:rid, :tcid, :lib) RETURNING id");
                    $stmt->execute([':rid' => $regimeId, ':tcid' => $typeClientId, ':lib' => $libelle]);
                    $motifId = $stmt->fetch()['id'];
                } else {
                    $motifId = $motif['id'];
                }

                // 4. Sous-motif
                $stmt = $pdo->prepare("SELECT id FROM sous_motifs WHERE motif_id = :mid AND libelle ILIKE :lib");
                $stmt->execute([':mid' => $motifId, ':lib' => $sousMotifLib]);
                if (!$stmt->fetch()) {
                    $stmt = $pdo->prepare("INSERT INTO sous_motifs (motif_id, libelle, delai_traitement_jours) VALUES (:mid, :lib, :delai)");
                    $stmt->execute([':mid' => $motifId, ':lib' => $sousMotifLib, ':delai' => $delai > 0 ? $delai : 5]);
                    $importCount++;
                }
            }
            
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $importCount nouveaux sous-motifs créés."]);
            
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => "Erreur lors de l'importation : " . $e->getMessage()]);
        }
    }


    public function stats(): void
    {
        Auth::require();
        $pdo  = Database::getConnection();
        $user = Auth::$user;

        $isDigitalAgency = false;
        if (!empty($user['agence_id'])) {
            $stmtA = $pdo->prepare("SELECT nom FROM agences WHERE id = ?");
            $stmtA->execute([$user['agence_id']]);
            $userAgenceNom = $stmtA->fetchColumn() ?: '';
            $isDigitalAgency = (stripos($userAgenceNom, 'digitale') !== false);
        }

        $filter = 'WHERE 1=1';
        $params = [];

        if ($isDigitalAgency) {
            // Pas de restriction pour l'agence digitale, accès global
            $filter = 'WHERE 1=1';
        } elseif ($user['role'] === 'agent') {
            $filter = 'WHERE r.agent_createur_id = :uid';
            $params[':uid'] = $user['id'];
        } elseif (in_array($user['role'], ['pilote', 'coordonnateur'])) {
            $filter = 'WHERE r.agence_id = :agence_id';
            $params[':agence_id'] = $user['agence_id'];
        }

        // 1. Compteurs de base
        $stmtBase = $pdo->prepare("
            SELECT
                COUNT(*) FILTER (WHERE r.statut = 'nouveau')    AS nouveau,
                COUNT(*) FILTER (WHERE r.statut = 'en_cours')   AS en_cours,
                COUNT(*) FILTER (WHERE r.statut = 'a_valider')  AS a_valider,
                COUNT(*) FILTER (WHERE r.statut = 'resolu')     AS resolu,
                COUNT(*) FILTER (WHERE r.statut = 'rejete')     AS rejete,
                COUNT(*) FILTER (WHERE r.hors_sla = TRUE AND r.statut NOT IN ('resolu','rejete')) AS hors_sla,
                COUNT(*) FILTER (WHERE r.statut IN ('resolu', 'rejete') AND r.date_resolution <= r.date_echeance_sla) AS dans_sla,
                COUNT(*) FILTER (WHERE r.statut = 'en_cours' AND r.remarques_coordination IS NOT NULL AND r.remarques_coordination <> '') AS en_attente_correction,
                COUNT(*)                                         AS total
            FROM reclamations r
            $filter
        ");
        $stmtBase->execute($params);
        $base = $stmtBase->fetch();

        // Compteur des tickets escaladés hors de l'agence (actifs et retournés)
        $escaladeesCount = 0;
        if ($isDigitalAgency || $user['role'] === 'superviseur') {
            $escaladeesCount = (int)$pdo->query("
                SELECT COUNT(*) 
                FROM reclamations 
                WHERE pilote_escaladeur_id IS NOT NULL
            ")->fetchColumn();
        } elseif (in_array($user['role'], ['pilote', 'coordonnateur'])) {
            $stmtEsc = $pdo->prepare("
                SELECT COUNT(*) 
                FROM reclamations 
                WHERE agence_origine_id = :agence_id AND pilote_escaladeur_id IS NOT NULL
            ");
            $stmtEsc->execute([':agence_id' => $user['agence_id']]);
            $escaladeesCount = (int)$stmtEsc->fetchColumn();
        }

        $nonQualifieesCount = 0;
        if ($user['role'] === 'administrateur' || $isDigitalAgency) {
            $stmtNQ = $pdo->prepare("
                SELECT COUNT(*) 
                FROM reclamations r
                JOIN processus p ON r.processus_id = p.id
                WHERE p.code = 'NQ'
            ");
            $stmtNQ->execute();
            $nonQualifieesCount = (int)$stmtNQ->fetchColumn();
        }

        if ($base) {
            $base['escaladees'] = $escaladeesCount;
            $base['non_qualifiees'] = $nonQualifieesCount;
        }

        // 2. Répartition par Mode de saisine
        $stmtSaisine = $pdo->prepare("
            SELECT ms.libelle, COUNT(r.id) as count
            FROM modes_saisine ms
            LEFT JOIN reclamations r ON r.mode_saisine_id = ms.id " . str_replace('WHERE', 'AND', $filter) . "
            GROUP BY ms.libelle
            ORDER BY count DESC
        ");
        $stmtSaisine->execute($params);
        $saisine = $stmtSaisine->fetchAll();

        // 3. Répartition par Type de Client
        $stmtClient = $pdo->prepare("
            SELECT tc.libelle, COUNT(r.id) as count
            FROM types_clients tc
            LEFT JOIN reclamations r ON r.type_client_id = tc.id " . str_replace('WHERE', 'AND', $filter) . "
            GROUP BY tc.libelle
            ORDER BY count DESC
        ");
        $stmtClient->execute($params);
        $clients = $stmtClient->fetchAll();

        // 4. Top 5 Motifs
        $stmtMotifs = $pdo->prepare("
            SELECT m.libelle, COUNT(r.id) as count
            FROM motifs m
            JOIN reclamations r ON r.motif_id = m.id " . str_replace('WHERE', 'AND', $filter) . "
            GROUP BY m.libelle
            ORDER BY count DESC
            LIMIT 5
        ");
        $stmtMotifs->execute($params);
        $motifs = $stmtMotifs->fetchAll();

        // 5. Évolution Mensuelle (12 derniers mois)
        $stmtEvolution = $pdo->prepare("
            SELECT 
                TO_CHAR(r.date_creation, 'MM/YYYY') as mois,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE r.statut = 'resolu') as resolu
            FROM reclamations r
            $filter
            AND r.date_creation >= NOW() - INTERVAL '12 months'
            GROUP BY mois
            ORDER BY MIN(r.date_creation)
        ");
        $stmtEvolution->execute($params);
        $evolution = $stmtEvolution->fetchAll();

        echo json_encode([
            'data' => [
                'counters' => $base,
                'saisine'  => $saisine,
                'clients'  => $clients,
                'motifs'   => $motifs,
                'evolution'=> $evolution
            ]
        ]);
    }

    public function deleteEntity(string $table, int $id): void
    {
        Auth::requireRole(['superviseur']);
        $pdo = Database::getConnection();
        
        $allowedTables = ['processus', 'motifs', 'sous_motifs', 'regimes', 'types_clients', 'agences', 'ressources', 'utilisateurs', 'categories_causes', 'causes', 'affectations_pilotes', 'modes_saisine', 'travailleurs', 'employeurs', 'sinistres'];
        if (!in_array($table, $allowedTables)) {
            http_response_code(400);
            echo json_encode(['error' => 'Table non autorisée']);
            return;
        }
        if ($table === 'ressources') {
            $stmtCheck = $pdo->prepare("SELECT id FROM utilisateurs WHERE ressource_id = :id LIMIT 1");
            $stmtCheck->execute([':id' => $id]);
            if ($stmtCheck->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => "Impossible de supprimer cette ressource car un compte utilisateur y est rattaché. Veuillez d'abord supprimer le compte utilisateur."]);
                return;
            }
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM $table WHERE id = :id");
            $stmt->execute([':id' => $id]);
            Audit::log(null, 'admin_action', "Suppression dans la table {$table} (ID: {$id})");
            echo json_encode(['message' => 'Élément supprimé avec succès']);
        } catch (\PDOException $e) {
            http_response_code(400);
            echo json_encode(['error' => 'Impossible de supprimer cet élément (il est probablement utilisé ailleurs)']);
        }
    }

    // ─── POST /api/travailleurs/bulk ────────────────────────────
    public function bulkTravailleurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();
        try {
            $count = 0;
            foreach ($data as $row) {
                $num = trim($row['numero_cnps'] ?? '');
                $nom = trim($row['nom'] ?? '');
                $pre = trim($row['prenoms'] ?? '');
                if (empty($num) || empty($nom)) continue;

                $stmt = $pdo->prepare("INSERT INTO travailleurs (numero_cnps, nom, prenoms, telephone, email) VALUES (:num, :nom, :pre, :tel, :em) ON CONFLICT (numero_cnps) DO UPDATE SET nom = EXCLUDED.nom, prenoms = EXCLUDED.prenoms, telephone = EXCLUDED.telephone, email = EXCLUDED.email");
                $stmt->execute([
                    ':num' => $num,
                    ':nom' => $nom,
                    ':pre' => $pre,
                    ':tel' => trim($row['telephone'] ?? null),
                    ':em'  => trim($row['email'] ?? null)
                ]);
                $count++;
            }
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $count travailleurs enregistrés."]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ─── POST /api/employeurs/bulk ──────────────────────────────
    public function bulkEmployeurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();
        try {
            $count = 0;
            foreach ($data as $row) {
                $num = trim($row['numero_cnps'] ?? '');
                $rs  = trim($row['raison_sociale'] ?? '');
                if (empty($num) || empty($rs)) continue;

                $nom = trim($row['nom_employeur'] ?? '');
                if ($nom === '') {
                    $nom = $rs;
                }

                $stmt = $pdo->prepare("INSERT INTO employeurs (numero_cnps, raison_sociale, nom_employeur, telephone, email) VALUES (:num, :rs, :nom, :tel, :em) ON CONFLICT (numero_cnps) DO UPDATE SET raison_sociale = EXCLUDED.raison_sociale, nom_employeur = EXCLUDED.nom_employeur, telephone = EXCLUDED.telephone, email = EXCLUDED.email");
                $stmt->execute([
                    ':num' => $num,
                    ':rs'  => $rs,
                    ':nom' => $nom,
                    ':tel' => isset($row['telephone']) ? trim($row['telephone']) : null,
                    ':em'  => isset($row['email']) ? trim($row['email']) : null
                ]);
                $count++;
            }
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $count employeurs enregistrés."]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ─── POST /api/sinistres/bulk ───────────────────────────────
    public function bulkSinistres(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'Données invalides']);
            return;
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();
        try {
            $count = 0;
            foreach ($data as $row) {
                $num = trim($row['numero_sinistre'] ?? '');
                $nom = trim($row['nom'] ?? '');
                $pre = trim($row['prenoms'] ?? '');
                if (empty($num) || empty($nom)) continue;

                $stmt = $pdo->prepare("INSERT INTO sinistres (numero_sinistre, nom, prenoms, telephone, email) VALUES (:num, :nom, :pre, :tel, :em) ON CONFLICT (numero_sinistre) DO UPDATE SET nom = EXCLUDED.nom, prenoms = EXCLUDED.prenoms, telephone = EXCLUDED.telephone, email = EXCLUDED.email");
                $stmt->execute([
                    ':num' => $num,
                    ':nom' => $nom,
                    ':pre' => $pre,
                    ':tel' => trim($row['telephone'] ?? null),
                    ':em'  => trim($row['email'] ?? null)
                ]);
                $count++;
            }
            $pdo->commit();
            echo json_encode(['message' => "Importation réussie : $count sinistres enregistrés."]);
        } catch (\Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    public function travailleurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->query("SELECT * FROM travailleurs");
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function employeurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->query("SELECT * FROM employeurs ORDER BY raison_sociale");
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            error_log("ParametrageController::employeurs error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la récupération des employeurs']);
        }
    }

    public function sinistres(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->query("SELECT * FROM sinistres");
            echo json_encode(['data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function createTravailleur(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("INSERT INTO travailleurs (numero_cnps, nom, prenoms, telephone, email) VALUES (:num, :nom, :pre, :tel, :em) ON CONFLICT (numero_cnps) DO UPDATE SET nom = EXCLUDED.nom, prenoms = EXCLUDED.prenoms, telephone = EXCLUDED.telephone, email = EXCLUDED.email RETURNING id");
        try {
            $stmt->execute([
                ':num' => trim($data['numero_cnps']),
                ':nom' => trim($data['nom']),
                ':pre' => trim($data['prenoms']),
                ':tel' => trim($data['telephone'] ?? null),
                ':em'  => trim($data['email'] ?? null)
            ]);
            $newId = $stmt->fetch()['id'];
            Audit::log(null, 'admin_action', "Création d'un travailleur : " . trim($data['nom']) . " " . trim($data['prenoms']));
            http_response_code(201);
            echo json_encode(['message' => 'Travailleur créé', 'id' => $newId]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function createEmployeur(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("INSERT INTO employeurs (numero_cnps, raison_sociale, nom_employeur, telephone, email) VALUES (:num, :rs, :nom, :tel, :em) ON CONFLICT (numero_cnps) DO UPDATE SET raison_sociale = EXCLUDED.raison_sociale, nom_employeur = EXCLUDED.nom_employeur, telephone = EXCLUDED.telephone, email = EXCLUDED.email RETURNING id");
        try {
            $rs = trim($data['raison_sociale'] ?? '');
            $nom = trim($data['nom_employeur'] ?? '');
            if ($nom === '') {
                $nom = $rs;
            }
            $stmt->execute([
                ':num' => trim($data['numero_cnps'] ?? ''),
                ':rs'  => $rs,
                ':nom' => $nom,
                ':tel' => isset($data['telephone']) ? trim($data['telephone']) : null,
                ':em'  => isset($data['email']) ? trim($data['email']) : null
            ]);
            $newId = $stmt->fetch()['id'];
            Audit::log(null, 'admin_action', "Création d'un employeur : " . trim($data['raison_sociale']));
            http_response_code(201);
            echo json_encode(['message' => 'Employeur créé', 'id' => $newId]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    public function updateTravailleur(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE travailleurs SET numero_cnps = :num, nom = :nom, prenoms = :pre, telephone = :tel, email = :em WHERE id = :id");
        $stmt->execute([
            ':id'  => $id,
            ':num' => trim($data['numero_cnps']),
            ':nom' => trim($data['nom']),
            ':pre' => trim($data['prenoms']),
            ':tel' => trim($data['telephone'] ?? null),
            ':em'  => trim($data['email'] ?? null)
        ]);
        echo json_encode(['message' => 'Travailleur mis à jour']);
    }

    public function updateEmployeur(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE employeurs SET numero_cnps = :num, raison_sociale = :rs, nom_employeur = :nom, telephone = :tel, email = :em WHERE id = :id");
        $rs = trim($data['raison_sociale'] ?? '');
        $nom = trim($data['nom_employeur'] ?? '');
        if ($nom === '') {
            $nom = $rs;
        }
        $stmt->execute([
            ':id'  => $id,
            ':num' => trim($data['numero_cnps'] ?? ''),
            ':rs'  => $rs,
            ':nom' => $nom,
            ':tel' => isset($data['telephone']) ? trim($data['telephone']) : null,
            ':em'  => isset($data['email']) ? trim($data['email']) : null
        ]);
        echo json_encode(['message' => 'Employeur mis à jour']);
    }

    public function updateSinistre(int $id): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE sinistres SET numero_sinistre = :num, nom = :nom, prenoms = :pre, telephone = :tel, email = :em WHERE id = :id");
        try {
            $stmt->execute([
                ':id'  => $id,
                ':num' => trim($data['numero_sinistre']),
                ':nom' => trim($data['nom']),
                ':pre' => trim($data['prenoms']),
                ':tel' => trim($data['telephone'] ?? null),
                ':em'  => trim($data['email'] ?? null)
            ]);
            echo json_encode(['message' => 'Sinistre mis à jour']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function createSinistre(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo  = Database::getConnection();
        $stmt = $pdo->prepare("INSERT INTO sinistres (numero_sinistre, nom, prenoms, telephone, email) VALUES (:num, :nom, :pre, :tel, :em) ON CONFLICT (numero_sinistre) DO UPDATE SET nom = EXCLUDED.nom, prenoms = EXCLUDED.prenoms, telephone = EXCLUDED.telephone, email = EXCLUDED.email RETURNING id");
        $stmt->execute([
            ':num' => trim($data['numero_sinistre']),
            ':nom' => trim($data['nom']),
            ':pre' => trim($data['prenoms']),
            ':tel' => trim($data['telephone'] ?? null),
            ':em'  => trim($data['email'] ?? null)
        ]);
        $newId = $stmt->fetch()['id'];
        Audit::log(null, 'admin_action', "Création d'un sinistré : " . trim($data['nom']) . " " . trim($data['prenoms']));
        http_response_code(201);
        echo json_encode(['message' => 'Sinistre créé', 'id' => $newId]);
    }

    public function clearTravailleurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("DELETE FROM travailleurs");
            $stmt->execute();
            Audit::log(null, 'admin_action', "Vidage de la table des travailleurs");
            echo json_encode(['message' => 'Tous les travailleurs ont été supprimés avec succès']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la suppression des travailleurs: ' . $e->getMessage()]);
        }
    }

    public function clearEmployeurs(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("DELETE FROM employeurs");
            $stmt->execute();
            Audit::log(null, 'admin_action', "Vidage de la table des employeurs");
            echo json_encode(['message' => 'Tous les employeurs ont été supprimés avec succès']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la suppression des employeurs: ' . $e->getMessage()]);
        }
    }

    public function clearSinistres(): void
    {
        Auth::requireRole(['superviseur', 'administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("DELETE FROM sinistres");
            $stmt->execute();
            Audit::log(null, 'admin_action', "Vidage de la table des sinistres");
            echo json_encode(['message' => 'Tous les sinistres ont été supprimés avec succès']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la suppression des sinistres: ' . $e->getMessage()]);
        }
    }

    public function clearRessourcesNoAccount(): void
    {
        Auth::requireRole(['administrateur']);
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("DELETE FROM ressources WHERE id NOT IN (SELECT ressource_id FROM utilisateurs)");
            $stmt->execute();
            Audit::log(null, 'admin_action', "Suppression du personnel sans compte utilisateur");
            echo json_encode(['message' => 'Tous les membres du personnel sans compte utilisateur ont été supprimés avec succès']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la suppression du personnel sans compte: ' . $e->getMessage()]);
        }
    }
}
