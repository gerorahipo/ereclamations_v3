# ============================================================
# Script de déploiement - eRéclamations CNPS CI
# Windows Server natif (sans Docker)
# PHP 8.4 | Frontend port 8080 | Backend PHP port 9000 (interne)
# ============================================================
# Usage: .\deploy.ps1
# Prérequis : PHP 8.4, Node.js 20, PostgreSQL 15, IIS installés
# ============================================================

param(
    [string]$ProjectPath   = "C:\inetpub\ereclamations",
    [string]$FrontendPort  = "8080",   # Port visible depuis le réseau
    [string]$BackendPort   = "9000",   # Port interne PHP API (localhost uniquement)
    [string]$PhpPath       = "C:\PHP84"
)

Write-Host "=== Déploiement eRéclamations CNPS ===" -ForegroundColor Cyan
Write-Host "Chemin projet : $ProjectPath" -ForegroundColor Yellow

# ── 1. Vérifier les prérequis ──────────────────────────────
Write-Host "`n[1/6] Vérification des prérequis..." -ForegroundColor Green

$errors = @()

if (-not (Test-Path "$PhpPath\php.exe")) {
    # Chercher aussi dans C:\PHP83 pour compatibilité ascendante
    if (Test-Path "C:\PHP83\php.exe") {
        $PhpPath = "C:\PHP83"
    } else {
        $errors += "PHP non trouvé dans $PhpPath (ni dans C:\PHP83\)"
    }
}
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    $errors += "Node.js non installé"
}
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    $errors += "npm non installé"
}
$pgBin = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (-not (Test-Path $pgBin)) {
    $errors += "PostgreSQL 15 non trouvé"
}

if ($errors.Count -gt 0) {
    Write-Host "ERREURS détectées :" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  ❌ $_" -ForegroundColor Red }
    exit 1
}

Write-Host "  ✅ PHP OK ($($PhpPath) - $(& "$PhpPath\php.exe" --version | Select-String 'PHP \d+\.\d+\.\d+'))" -ForegroundColor Green
Write-Host "  ✅ Node.js OK ($(node --version))" -ForegroundColor Green
Write-Host "  ✅ PostgreSQL 15 OK" -ForegroundColor Green

# ── 2. Vérifier la présence du .env backend ────────────────
Write-Host "`n[2/6] Configuration backend..." -ForegroundColor Green

$envFile = "$ProjectPath\backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "  ⚠️  Fichier .env manquant. Copie depuis .env.example..." -ForegroundColor Yellow
    Copy-Item "$ProjectPath\backend\.env.example" $envFile
    Write-Host "  📝 Éditer manuellement : $envFile" -ForegroundColor Yellow
    Write-Host "     Puis relancer ce script." -ForegroundColor Yellow
    exit 0
}
Write-Host "  ✅ .env présent" -ForegroundColor Green

# ── 3. Builder le frontend ─────────────────────────────────
Write-Host "`n[3/6] Build du frontend React/Vite..." -ForegroundColor Green

Push-Location "$ProjectPath\frontend"
Write-Host "  → npm install..." -ForegroundColor Gray
npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR npm install" -ForegroundColor Red; Pop-Location; exit 1 }

Write-Host "  → npm run build..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR npm build" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location

# Copier le web.config dans dist/
Copy-Item "$ProjectPath\frontend\web.config.iis" "$ProjectPath\frontend\dist\web.config" -Force
Write-Host "  ✅ Frontend buildé dans frontend\dist\" -ForegroundColor Green

# ── 4. Configurer les permissions NTFS ────────────────────
Write-Host "`n[4/6] Configuration des permissions..." -ForegroundColor Green

icacls "$ProjectPath\backend" /grant "IIS_IUSRS:(OI)(CI)R" /T /Q
icacls "$ProjectPath\backend\storage" /grant "IIS_IUSRS:(OI)(CI)M" /T /Q
icacls "$ProjectPath\frontend\dist" /grant "IIS_IUSRS:(OI)(CI)R" /T /Q
Write-Host "  ✅ Permissions NTFS configurées" -ForegroundColor Green

# ── 5. Créer/mettre à jour les sites IIS ──────────────────
Write-Host "`n[5/6] Configuration IIS..." -ForegroundColor Green

Import-Module WebAdministration -ErrorAction SilentlyContinue

# Vérifier que URL Rewrite est installé
$urlRewrite = Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue
if (-not $urlRewrite) {
    Write-Host "  ⚠️  URL Rewrite Module non détecté." -ForegroundColor Yellow
    Write-Host "     Télécharger : https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
}

# Site Backend API (interne - pas accessible depuis l'extérieur)
if (-not (Get-Website -Name "ereclamations-api" -ErrorAction SilentlyContinue)) {
    New-Website -Name "ereclamations-api" `
                -PhysicalPath "$ProjectPath\backend\public" `
                -Port $BackendPort `
                -Force
    # Lier uniquement à localhost (sécurité : pas accessible depuis le réseau)
    Set-WebBinding -Name "ereclamations-api" -BindingInformation "*:${BackendPort}:" `
                   -PropertyName "bindingInformation" -Value "127.0.0.1:${BackendPort}:"
    Write-Host "  ✅ Site IIS 'ereclamations-api' créé (port $BackendPort - localhost uniquement)" -ForegroundColor Green
} else {
    Set-ItemProperty "IIS:\Sites\ereclamations-api" -Name physicalPath -Value "$ProjectPath\backend\public"
    Write-Host "  ✅ Site IIS 'ereclamations-api' mis à jour" -ForegroundColor Green
}

# Site Frontend (accessible depuis le réseau sur port 8080)
if (-not (Get-Website -Name "ereclamations" -ErrorAction SilentlyContinue)) {
    New-Website -Name "ereclamations" `
                -PhysicalPath "$ProjectPath\frontend\dist" `
                -Port $FrontendPort `
                -Force
    Write-Host "  ✅ Site IIS 'ereclamations' créé (port $FrontendPort)" -ForegroundColor Green
} else {
    Set-ItemProperty "IIS:\Sites\ereclamations" -Name physicalPath -Value "$ProjectPath\frontend\dist"
    Write-Host "  ✅ Site IIS 'ereclamations' mis à jour" -ForegroundColor Green
}

# Redémarrer IIS
iisreset /restart /noforce | Out-Null
Write-Host "  ✅ IIS redémarré" -ForegroundColor Green

# ── 6. Tests finaux ────────────────────────────────────────
Write-Host "`n[6/6] Tests de sanité..." -ForegroundColor Green

Start-Sleep -Seconds 3

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/public/init" `
                              -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  ✅ API backend répond (HTTP $($resp.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  API backend ne répond pas : $_" -ForegroundColor Yellow
    Write-Host "     Vérifier : Logs IIS, extension pdo_pgsql PHP activée, base de données démarrée" -ForegroundColor Yellow
}

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" `
                              -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  ✅ Frontend répond (HTTP $($resp.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Frontend ne répond pas : $_" -ForegroundColor Yellow
}

Write-Host "`n=== Déploiement terminé ===" -ForegroundColor Cyan
Write-Host "Frontend : http://NOM_DU_SERVEUR:$FrontendPort" -ForegroundColor White
Write-Host "API      : http://localhost:$BackendPort/api/ (interne uniquement)" -ForegroundColor White
Write-Host "`n⚠️  N'oubliez pas d'ouvrir le port $FrontendPort dans le pare-feu Windows !" -ForegroundColor Yellow
Write-Host "   Commande : netsh advfirewall firewall add rule name='eReclamations' dir=in action=allow protocol=TCP localport=$FrontendPort" -ForegroundColor Gray
