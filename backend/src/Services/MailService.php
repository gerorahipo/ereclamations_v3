<?php
namespace App\Services;

use App\Models\ConfigMailModel;

class MailService
{
    private static ?self $instance = null;
    private ?array $config = null;

    private function __construct()
    {
        $model = new ConfigMailModel();
        $cfg = $model->getConfig();
        $this->config = is_array($cfg) ? $cfg : null;
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function send(string $to, string $subject, string $body): bool
    {
        return $this->sendWithConfig($to, $subject, $body, $this->config);
    }

    public function sendWithConfig(string $to, string $subject, string $body, ?array $config): bool
    {
        if (!$config || !$config['is_active']) {
            error_log("MailService: Email non envoyé (config absente ou inactive).");
            return false;
        }

        $from = $config['from_email'];
        $name = $config['from_name'];
        
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=utf-8',
            "From: $name <$from>",
            "Reply-To: $from",
            'X-Mailer: PHP/' . phpversion()
        ];

        try {
            // Test de connexion si c'est un test
            if ($config['host'] !== 'localhost' && $config['host'] !== '127.0.0.1') {
                $timeout = 5;
                $socket = @fsockopen($config['host'], (int)$config['port'], $errno, $errstr, $timeout);
                if (!$socket) {
                    error_log("MailService: Échec de connexion au serveur SMTP {$config['host']}:{$config['port']} ($errstr)");
                    throw new \Exception("Impossible de se connecter au serveur SMTP: $errstr");
                }
                fclose($socket);
            }

            $success = mail($to, $subject, $body, implode("\r\n", $headers));
            if ($success) {
                error_log("MailService: Email envoyé à $to - Sujet: $subject");
            } else {
                error_log("MailService: Échec de l'envoi via mail() à $to");
            }
            return $success;
        } catch (\Exception $e) {
            error_log("MailService: Erreur lors de l'envoi: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Alerte de nouvelle réclamation pour le pilote
     */
    public function notifyNewReclamation(array $reclamation, array $pilot): bool
    {
        $pilotNom = htmlspecialchars($pilot['prenoms'] . ' ' . $pilot['nom'], ENT_QUOTES, 'UTF-8');
        $ticketNum = htmlspecialchars($reclamation['numero_ticket'], ENT_QUOTES, 'UTF-8');
        $objet = htmlspecialchars($reclamation['objet'], ENT_QUOTES, 'UTF-8');
        $dateReception = htmlspecialchars($reclamation['date_reception'], ENT_QUOTES, 'UTF-8');
        $appUrl = htmlspecialchars($_ENV['CORS_ORIGIN'] ?? 'http://localhost:81', ENT_QUOTES, 'UTF-8');

        $subject = "Nouvelle réclamation affectée : " . $reclamation['numero_ticket'];
        $body = "
            <h2>Bonjour {$pilotNom},</h2>
            <p>Une nouvelle réclamation vient de vous être affectée.</p>
            <ul>
                <li><strong>N° Ticket :</strong> {$ticketNum}</li>
                <li><strong>Objet :</strong> {$objet}</li>
                <li><strong>Date de réception :</strong> {$dateReception}</li>
            </ul>
            <p><a href='{$appUrl}/reclamations/{$reclamation['id']}'>Cliquez ici pour traiter cette réclamation</a></p>
        ";
        return $this->send($pilot['email'], $subject, $body);
    }

    /**
     * Alerte de validation pour le coordonnateur
     */
    public function notifyValidationPending(array $reclamation, array $coordinator): bool
    {
        $coordNom = htmlspecialchars($coordinator['prenoms'] . ' ' . $coordinator['nom'], ENT_QUOTES, 'UTF-8');
        $ticketNum = htmlspecialchars($reclamation['numero_ticket'], ENT_QUOTES, 'UTF-8');
        $piloteNom = htmlspecialchars($reclamation['pilote_nom'], ENT_QUOTES, 'UTF-8');
        $appUrl = htmlspecialchars($_ENV['CORS_ORIGIN'] ?? 'http://localhost:81', ENT_QUOTES, 'UTF-8');

        $subject = "Validation en attente : " . $reclamation['numero_ticket'];
        $body = "
            <h2>Bonjour {$coordNom},</h2>
            <p>Une réclamation est en attente de votre validation.</p>
            <ul>
                <li><strong>N° Ticket :</strong> {$ticketNum}</li>
                <li><strong>Pilote :</strong> {$piloteNom}</li>
            </ul>
            <p><a href='{$appUrl}/reclamations/{$reclamation['id']}'>Cliquez ici pour valider</a></p>
        ";
        return $this->send($coordinator['email'], $subject, $body);
    }

    /**
     * Rappel d'échéance SLA
     */
    public function notifySLABreaching(array $reclamation, array $pilot): bool
    {
        $subject = "ALERTE SLA : Échéance proche pour le ticket " . $reclamation['numero_ticket'];
        $body = "
            <h2>Rappel d'échéance</h2>
            <p>Le ticket <strong>{$reclamation['numero_ticket']}</strong> approche de son délai de traitement maximum.</p>
            <p><strong>Échéance :</strong> {$reclamation['date_echeance']}</p>
            <p>Merci de traiter ce dossier en priorité.</p>
        ";
        return $this->send($pilot['email'], $subject, $body);
    }

    /**
     * Alerte de retour d'escalade pour le pilote d'origine
     */
    public function notifyTicketRetourEscalade(array $reclamation, array $pilot): bool
    {
        $pilotNom = htmlspecialchars($pilot['prenoms'] . ' ' . $pilot['nom'], ENT_QUOTES, 'UTF-8');
        $ticketNum = htmlspecialchars($reclamation['numero_ticket'], ENT_QUOTES, 'UTF-8');
        $agenceCibleNom = htmlspecialchars($reclamation['agence_cible_nom'], ENT_QUOTES, 'UTF-8');
        $piloteCibleNom = htmlspecialchars($reclamation['pilote_cible_nom'], ENT_QUOTES, 'UTF-8');
        $appUrl = htmlspecialchars($_ENV['CORS_ORIGIN'] ?? 'http://localhost:81', ENT_QUOTES, 'UTF-8');

        $subject = "Retour d'escalade : le ticket " . $reclamation['numero_ticket'] . " a été traité";
        $body = "
            <h2>Bonjour {$pilotNom},</h2>
            <p>Le dossier que vous aviez escaladé a été traité par l'agence cible <strong>{$agenceCibleNom}</strong> (par {$piloteCibleNom}) et vous a été retourné.</p>
            <ul>
                <li><strong>N° Ticket :</strong> {$ticketNum}</li>
            </ul>
            <p>Vous pouvez maintenant soit le soumettre à validation, soit l'escalader à nouveau.</p>
            <p><a href='{$appUrl}/reclamations/{$reclamation['id']}'>Cliquez ici pour accéder à la réclamation</a></p>
        ";
        return $this->send($pilot['email'], $subject, $body);
    }
}
