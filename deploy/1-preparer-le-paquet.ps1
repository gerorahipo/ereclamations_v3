<#
============================================================
 1-preparer-le-paquet.ps1
 A executer SUR CETTE MACHINE (celle qui a la version a jour).

 Cree un dossier + un .zip contenant tout ce qu'il faut copier
 sur la machine cible, SANS les fichiers propres a cette machine
 (mot de passe .env, pieces jointes reelles, dependances node,
 build existant, historique git).

 Le script de deploiement (2-deployer-sur-la-cible.ps1) est
 automatiquement inclus dans le paquet.
============================================================
#>

param(
    [string]$SourceRoot = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$OutputDir  = "$PSScriptRoot\..\..\ereclamations_paquet_maj"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Preparation du paquet de mise a jour ===" -ForegroundColor Cyan
Write-Host "Source : $SourceRoot"
Write-Host "Sortie : $OutputDir"
Write-Host ""

if (Test-Path $OutputDir) {
    Write-Host "Le dossier de sortie existe deja, il va etre recree." -ForegroundColor Yellow
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

# ------------------------------------------------------------
# Liste des exclusions : rien de sensible ni de local a CETTE
# machine ne doit partir dans le paquet.
# ------------------------------------------------------------
$excludeDirs = @(
    ".git",
    "node_modules",
    "dist",
    "backups",
    "deploy",
    "storage\attachments"
)

function Should-Exclude($relativePath) {
    foreach ($ex in $excludeDirs) {
        if ($relativePath -like "*$ex*") { return $true }
    }
    if ($relativePath -like "*\.env" -and $relativePath -notlike "*.env.example") { return $true }
    return $false
}

Write-Host "Copie des fichiers (cela peut prendre une minute)..." -ForegroundColor Cyan

Get-ChildItem -Path $SourceRoot -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($SourceRoot.Length + 1)
    if (Should-Exclude $relative) { return }

    $destPath = Join-Path $OutputDir $relative
    $destDir  = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $_.FullName -Destination $destPath -Force
}

Write-Host "Copie terminee." -ForegroundColor Green

# ------------------------------------------------------------
# Compression en .zip pour un transfert facile (cle USB, etc.)
# ------------------------------------------------------------
$zipPath = "$OutputDir.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "Creation de l'archive : $zipPath" -ForegroundColor Cyan
Compress-Archive -Path "$OutputDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "=== Paquet pret ===" -ForegroundColor Green
Write-Host "Dossier : $OutputDir"
Write-Host "Archive : $zipPath"
Write-Host ""
Write-Host "Prochaine etape : copier '$zipPath' sur la machine cible" -ForegroundColor Yellow
Write-Host "(cle USB, partage reseau, etc.), le decompresser, puis executer" -ForegroundColor Yellow
Write-Host "deploy\2-deployer-sur-la-cible.ps1 DEPUIS la machine cible." -ForegroundColor Yellow
