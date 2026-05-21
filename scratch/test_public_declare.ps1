# Script to test the public declaration endpoint after fix
$baseUrl = "http://localhost:8888/api"

$payload = @{
    regime_id = 1
    type_client_id = 4
    partenaire_identifiant = "182011007026"
    partenaire_nom_prenoms = "BOSSON KOUACOU JEAN-CLAUDE"
    partenaire_sexe = "M"
    partenaire_telephone = "2250709018797"
    partenaire_email = "bossonkjc@gmail.com"
    partenaire_employeur = "CNPS"
    motif_id = 22
    sous_motif_id = 79
    description = "Test de déclaration publique après correction du type de partenaire"
}

Write-Host "--- Envoi de la déclaration publique ---" -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/public/declare" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Déclaration réussie !" -ForegroundColor Green
    Write-Host "Numéro de Ticket : $($res.numero_ticket)" -ForegroundColor Green
    Write-Host "ID : $($res.id)" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors de la déclaration :" -ForegroundColor Red
    $_.Exception.Message
    $_.ErrorDetails
}
