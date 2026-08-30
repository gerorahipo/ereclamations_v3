<?php
namespace App\Utils;

use PDO;

class PartenaireValidator {
    /**
     * Valide le Numéro CNPS d'un partenaire selon son type de client et son régime.
     * Règles métier :
     *   - Client non immatriculé : le numéro n'est pas exigé.
     *   - Numéro OBLIGATOIRE uniquement pour un travailleur (salarié ou
     *     indépendant) immatriculé. Optionnel pour les autres types
     *     (employeur, ayant droit, rentier, retraité).
     *   - Format quand un numéro est saisi :
     *       Employeur : 1 à 6 chiffres.
     *       Travailleur RG : exactement 12 chiffres.
     *       Travailleur RSTI : exactement 14 chiffres.
     *
     * Retourne un message d'erreur (string) si invalide, ou null si valide.
     */
    public static function validateIdentifiant(
        PDO $pdo,
        bool $estImmatricule,
        ?string $identifiant,
        int $typeClientId,
        int $regimeId
    ): ?string {
        if (!$estImmatricule) {
            return null;
        }

        $identifiant = trim((string)$identifiant);

        $stmtType = $pdo->prepare("SELECT libelle FROM types_clients WHERE id = :id");
        $stmtType->execute([':id' => $typeClientId]);
        $typeLibelle = $stmtType->fetchColumn() ?: '';

        $isEmployeur   = stripos($typeLibelle, 'employeur') !== false;
        // "Travailleur salarié" ou "Travailleur indépendant"
        $isTravailleur = stripos($typeLibelle, 'salari') !== false
                      || stripos($typeLibelle, 'pendant') !== false;

        if ($identifiant === '') {
            // Obligatoire seulement pour un travailleur ; optionnel pour les autres.
            return $isTravailleur
                ? "Le Numéro CNPS est obligatoire pour un travailleur immatriculé."
                : null;
        }

        if (!ctype_digit($identifiant)) {
            return "Le Numéro CNPS ne doit contenir que des chiffres.";
        }

        $len = strlen($identifiant);

        if ($isEmployeur) {
            if ($len < 1 || $len > 6) {
                return "Le Numéro CNPS employeur doit contenir entre 1 et 6 chiffres.";
            }
            return null;
        }

        if ($isTravailleur) {
            $stmtRegime = $pdo->prepare("SELECT has_employeur FROM regimes WHERE id = :id");
            $stmtRegime->execute([':id' => $regimeId]);
            $hasEmployeur = $stmtRegime->fetchColumn();

            if ($hasEmployeur) {
                if ($len !== 12) {
                    return "Le Numéro CNPS d'un travailleur du Régime Général doit contenir exactement 12 chiffres.";
                }
            } else {
                if ($len !== 14) {
                    return "Le Numéro CNPS d'un travailleur indépendant (RSTI) doit contenir exactement 14 chiffres.";
                }
            }
        }

        // Autres types (ayant droit, rentier, retraité) : numéro optionnel,
        // aucun format strict imposé (déjà vérifié : chiffres uniquement).
        return null;
    }
}
