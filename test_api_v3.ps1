# Script de test V3 - eReclamations CNPS
# Validation du Workflow Automatisé

$baseUrl = "http://localhost:8888/api"
$creds = @{ email = "agent.plateau@cnps.ci"; password = "Password@1234" }

Write-Host "--- Connexion ---" -ForegroundColor Cyan
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body ($creds | ConvertTo-Json) -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "--- Test Imputation Auto ---" -ForegroundColor Cyan
$reclamation = @{
    partenaire_type = "entreprise"
    partenaire_nom  = "TEST AUTO IMPUTE"
    regime_id       = 1
    type_client_id  = 1
    mode_saisine_id = 1
    processus_id    = 1
    motif_id        = 1
    sous_motif_id   = 1
    description     = "Ceci est un test d'imputation automatique"
}

$res = Invoke-RestMethod -Uri "$baseUrl/reclamations" -Method Post -Body ($reclamation | ConvertTo-Json) -ContentType "application/json" -Headers $headers
Write-Host "Ticket créé : $($res.numero_ticket)"
Write-Host "Statut : $($res.statut)"
Write-Host "Pilote ID assigné : $($res.pilote_id)"

if ($res.statut -eq "en_cours" -and $res.pilote_id -ne $null) {
    Write-Host "[OK] Imputation automatique réussie !" -ForegroundColor Green
} else {
    Write-Host "[FAIL] L'imputation automatique n'a pas fonctionné." -ForegroundColor Red
}

Write-Host "--- Vérification SLA ---" -ForegroundColor Cyan
$ticket = Invoke-RestMethod -Uri "$baseUrl/reclamations/$($res.id)" -Method Get -Headers $headers
Write-Host "Échéance calculée : $($ticket.data.date_echeance_sla)"
Write-Host "Processus : $($ticket.data.processus_libelle)"
