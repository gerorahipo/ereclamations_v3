<?php
spl_autoload_register(function (string $class): void {
    $base = __DIR__ . '/src/';
    $file = $base . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Config\Database;

try {
    $pdo = Database::getConnection();
    
    $agences = $pdo->query("SELECT id, nom, code FROM agences")->fetchAll(PDO::FETCH_ASSOC);
    $roles = ['agent', 'pilote', 'coordonnateur', 'superviseur', 'administrateur'];
    $passwordHash = '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe'; // Password@1234
    
    $sql_ressources = "-- --- NEW RESSOURCES ---\n";
    $sql_utilisateurs = "-- --- NEW UTILISATEURS ---\n";
    
    foreach ($agences as $agence) {
        $agence_id = $agence['id'];
        $agence_code = $agence['code'];
        $agence_nom = $agence['nom'];
        
        foreach ($roles as $role) {
            for ($i = 1; $i <= 2; $i++) {
                $role_code = strtoupper(substr($role, 0, 3));
                $matricule = "MAT-{$agence_code}-{$role_code}-00{$i}";
                $prenoms = "Demo " . ucfirst($role) . " {$i}";
                $nom = str_replace("'", "''", $agence_nom);
                $email = strtolower("{$role}{$i}.{$agence_code}@cnps.ci");
                
                $sql_ressources .= "INSERT INTO ressources (matricule, nom, prenoms, agence_id) VALUES ('$matricule', '$nom', '$prenoms', $agence_id);\n";
                $sql_utilisateurs .= "INSERT INTO utilisateurs (ressource_id, email, password, role) SELECT id, '$email', '$passwordHash', '$role' FROM ressources WHERE matricule = '$matricule';\n";
            }
        }
    }
    
    file_put_contents('add_demo_users.sql', $sql_ressources . "\n" . $sql_utilisateurs);
    echo "SQL script generated: add_demo_users.sql\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
