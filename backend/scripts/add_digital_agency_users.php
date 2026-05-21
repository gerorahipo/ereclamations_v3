<?php
require_once __DIR__ . '/../src/Config/Database.php';
use App\Config\Database;

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();
    
    $agence_id = 6;
    $agence_code = 'APSDG';
    $agence_nom = 'Agence Digitale';
    
    $roles = ['agent', 'pilote', 'coordonnateur', 'superviseur', 'administrateur'];
    $passwordHash = '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe'; // Password@1234
    
    echo "Adding users for Agence Digitale...\n";
    
    foreach ($roles as $role) {
        for ($i = 1; $i <= 2; $i++) {
            $role_code = strtoupper(substr($role, 0, 3));
            $matricule = "MAT-{$agence_code}-{$role_code}-00{$i}";
            $prenoms = "Demo " . ucfirst($role) . " {$i}";
            $email = strtolower("{$role}{$i}.{$agence_code}@cnps.ci");
            
            // Check if resource exists
            $stmt = $pdo->prepare("SELECT id FROM ressources WHERE matricule = ?");
            $stmt->execute([$matricule]);
            $resId = $stmt->fetchColumn();
            
            if (!$resId) {
                $stmtInsertRes = $pdo->prepare("INSERT INTO ressources (matricule, nom, prenoms, agence_id) VALUES (?, ?, ?, ?) RETURNING id");
                $stmtInsertRes->execute([$matricule, $agence_nom, $prenoms, $agence_id]);
                $resId = $stmtInsertRes->fetchColumn();
                echo "Created resource $matricule ($prenoms)\n";
            } else {
                echo "Resource $matricule already exists\n";
            }
            
            // Check if user exists
            $stmtUser = $pdo->prepare("SELECT id FROM utilisateurs WHERE email = ?");
            $stmtUser->execute([$email]);
            $userId = $stmtUser->fetchColumn();
            
            if (!$userId) {
                $stmtInsertUser = $pdo->prepare("INSERT INTO utilisateurs (ressource_id, email, password, role) VALUES (?, ?, ?, ?)");
                $stmtInsertUser->execute([$resId, $email, $passwordHash, $role]);
                echo "Created user $email with role $role\n";
            } else {
                echo "User $email already exists\n";
            }
        }
    }
    
    $pdo->commit();
    echo "Demo users for Agence Digitale successfully applied!\n";
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
