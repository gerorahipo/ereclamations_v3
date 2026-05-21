<?php
namespace App\Models;

use App\Config\Database;
use PDO;

class ConfigMailModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function getConfig(): array|null
    {
        $stmt = $this->pdo->query("SELECT * FROM config_mail LIMIT 1");
        $res = $stmt->fetch();
        return $res ?: null;
    }

    public function saveConfig(array $data): bool
    {
        $existing = $this->getConfig();
        
        if ($existing) {
            $stmt = $this->pdo->prepare("
                UPDATE config_mail 
                SET host = :host, 
                    port = :port, 
                    username = :username, 
                    password = :password, 
                    encryption = :encryption, 
                    from_email = :from_email, 
                    from_name = :from_name, 
                    is_active = :is_active,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $data['id'] = $existing['id'];
        } else {
            $stmt = $this->pdo->prepare("
                INSERT INTO config_mail (host, port, username, password, encryption, from_email, from_name, is_active)
                VALUES (:host, :port, :username, :password, :encryption, :from_email, :from_name, :is_active)
            ");
        }

        return $stmt->execute([
            ':host' => $data['host'],
            ':port' => (int)$data['port'],
            ':username' => $data['username'] ?? null,
            ':password' => $data['password'] ?? null,
            ':encryption' => $data['encryption'] ?? null,
            ':from_email' => $data['from_email'],
            ':from_name' => $data['from_name'],
            ':is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
            ':id' => $data['id'] ?? null
        ]);
    }
}
