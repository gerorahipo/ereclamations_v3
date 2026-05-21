<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middleware\Auth;
use App\Models\ConfigMailModel;

class ConfigMailController
{
    public function get(): void
    {
        Auth::requireRole(['administrateur']);
        $model = new ConfigMailModel();
        $config = $model->getConfig();
        
        // Cacher le mot de passe pour la sécurité
        if ($config && !empty($config['password'])) {
            $config['password'] = '********';
        }

        echo json_encode(['data' => $config]);
    }

    public function save(): void
    {
        Auth::requireRole(['administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['host']) || empty($data['port']) || empty($data['from_email']) || empty($data['from_name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs obligatoires manquants']);
            return;
        }

        $model = new ConfigMailModel();
        
        // Si le mot de passe est '********', on garde l'ancien
        if (($data['password'] ?? '') === '********') {
            $existing = $model->getConfig();
            $data['password'] = $existing ? $existing['password'] : null;
        }

        $success = $model->saveConfig($data);

        if ($success) {
            echo json_encode(['message' => 'Configuration mail enregistrée']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de l\'enregistrement']);
        }
    }

    public function test(): void
    {
        Auth::requireRole(['administrateur']);
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['host']) || empty($data['port']) || empty($data['from_email'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs obligatoires manquants (Hôte, Port, Email expéditeur)']);
            return;
        }

        // Si le mot de passe est '********', on récupère l'ancien
        if (($data['password'] ?? '') === '********') {
            $model = new ConfigMailModel();
            $existing = $model->getConfig();
            $data['password'] = $existing ? $existing['password'] : null;
        }

        try {
            $service = \App\Services\MailService::getInstance();
            $subject = "eRéclamations - Test de configuration mail";
            $body = "<h3>Ceci est un email de test.</h3><p>Si vous recevez ce message, cela signifie que la configuration de votre serveur de messagerie est correcte.</p><p>Date : " . date('d/m/Y H:i:s') . "</p>";
            
            $success = $service->sendWithConfig($data['from_email'], $subject, $body, $data);
            
            if ($success) {
                echo json_encode(['message' => 'Email de test envoyé avec succès à ' . $data['from_email']]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Le serveur a retourné une erreur lors de l\'envoi.']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
