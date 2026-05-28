# ============================================================
# Script de déploiement XAMPP — eRéclamations CNPS CI
# Windows Server | XAMPP (Apache + PHP 8.2) | PostgreSQL 15
# ============================================================
# Usage : .\deploy-xampp.ps1
# Prérequis : XAMPP installé, PostgreSQL 15, Node.js 20
# ============================================================

param(
    [string]$ProjectPath  = "C:\inetpub\ereclamations",
    [string]$XamppPath    = "C:\xampp",
    [string]$FrontendPort = "8080",   # Port accessible depuis le réseau
    [string]$BackendPort  = "9000"    # Port interne PHP (localhost uniquement)
)

Write-Host "=== Déploiement eRéclamations CNPS (XAMPP) ===" -ForegroundColor Cyan
Write-Host "Projet     : $ProjectPath" -ForegroundColor Yellow
Write-Host "XAMPP      : $XamppPath" -ForegroundColor Yellow
Write-Host "Port public : $FrontendPort / Port interne PHP : $BackendPort" -ForegroundColor Yellow

# ── 1. Vérification des prérequis ─────────────────────────
Write-Host "`n[1/7] Vérification des prérequis..." -ForegroundColor Green

$errors = @()

if (-not (Test-Path "$XamppPath\apache\bin\httpd.exe")) {
    $errors += "Apache XAMPP non trouvé dans $XamppPath\apache\"
}
if (-not (Test-Path "$XamppPath\php\php.exe")) {
    $errors += "PHP XAMPP non trouvé dans $XamppPath\php\"
}
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    $errors += "Node.js non installé"
}
$psql = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (-not (Test-Path $psql)) {
    $errors += "PostgreSQL 15 non trouvé"
}

if ($errors.Count -gt 0) {
    Write-Host "ERREURS détectées :" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  ❌ $_" -ForegroundColor Red }
    exit 1
}

$phpVersion = & "$XamppPath\php\php.exe" -r "echo PHP_VERSION;"
Write-Host "  ✅ Apache XAMPP OK" -ForegroundColor Green
Write-Host "  ✅ PHP XAMPP OK (v$phpVersion)" -ForegroundColor Green
Write-Host "  ✅ Node.js OK ($(node --version))" -ForegroundColor Green
Write-Host "  ✅ PostgreSQL 15 OK" -ForegroundColor Green

# Vérifier que pdo_pgsql est activé dans XAMPP
$pdoCheck = & "$XamppPath\php\php.exe" -r "echo extension_loaded('pdo_pgsql') ? 'OK' : 'MANQUANT';"
if ($pdoCheck -ne "OK") {
    Write-Host "  ⚠️  Extension pdo_pgsql non activée dans XAMPP PHP" -ForegroundColor Yellow
    Write-Host "     → Éditer $XamppPath\php\php.ini et activer : extension=pdo_pgsql" -ForegroundColor Yellow
    Write-Host "     → Copier libpq.dll depuis PostgreSQL vers $XamppPath\php\" -ForegroundColor Yellow
    $continue = Read-Host "Continuer quand même ? (o/n)"
    if ($continue -ne "o") { exit 1 }
} else {
    Write-Host "  ✅ Extension pdo_pgsql OK" -ForegroundColor Green
}

# ── 2. Configuration backend ───────────────────────────────
Write-Host "`n[2/7] Configuration backend..." -ForegroundColor Green

$envFile = "$ProjectPath\backend\.env"
if (-not (Test-Path $envFile)) {
    Copy-Item "$ProjectPath\backend\.env.example" $envFile
    Write-Host "  ⚠️  .env créé depuis .env.example — ÉDITER avant de continuer !" -ForegroundColor Yellow
    Write-Host "     Fichier : $envFile" -ForegroundColor Yellow
    exit 0
}
Write-Host "  ✅ .env backend présent" -ForegroundColor Green

# ── 3. Build du frontend ───────────────────────────────────
Write-Host "`n[3/7] Build du frontend React/Vite..." -ForegroundColor Green

Push-Location "$ProjectPath\frontend"

# Créer la configuration de production
@"
VITE_API_URL=http://NOM_DU_SERVEUR:$FrontendPort
"@ | Out-File -FilePath .env.production -Encoding utf8

npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR npm install" -ForegroundColor Red; Pop-Location; exit 1 }

npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERREUR npm build" -ForegroundColor Red; Pop-Location; exit 1 }

# Copier le .htaccess Apache dans dist/
Copy-Item ".htaccess.apache" "dist\.htaccess" -Force
Pop-Location

Write-Host "  ✅ Frontend buildé dans frontend\dist\" -ForegroundColor Green
Write-Host "  ✅ .htaccess Apache copié dans dist\" -ForegroundColor Green

# ── 4. Configurer Apache XAMPP ─────────────────────────────
Write-Host "`n[4/7] Configuration Apache XAMPP..." -ForegroundColor Green

$vhostsConf = "$XamppPath\apache\conf\extra\httpd-vhosts.conf"
$ourConf    = "$ProjectPath\docker\httpd-ereclamations.conf"

# Adapter les chemins et ports dans notre config
$confContent = Get-Content $ourConf -Raw
$confContent = $confContent -replace "C:/inetpub/ereclamations", $ProjectPath.Replace("\", "/")
$confContent = $confContent -replace "C:/xampp", $XamppPath.Replace("\", "/")
$confContent = $confContent -replace "Listen 8080", "Listen $FrontendPort"
$confContent = $confContent -replace "Listen 127\.0\.0\.1:9000", "Listen 127.0.0.1:$BackendPort"
$confContent = $confContent -replace ":9000\b", ":$BackendPort"
$confContent = $confContent -replace "\*:8080\b", "*:$FrontendPort"

# Sauvegarder la config adaptée
$adaptedConf = "$XamppPath\apache\conf\extra\httpd-ereclamations.conf"
$confContent | Out-File -FilePath $adaptedConf -Encoding utf8

# Inclure dans httpd-vhosts.conf si pas déjà inclus
$includeDirective = "Include conf/extra/httpd-ereclamations.conf"
$vhostsContent = Get-Content $vhostsConf -Raw -ErrorAction SilentlyContinue
if ($vhostsContent -notlike "*httpd-ereclamations.conf*") {
    Add-Content -Path $vhostsConf -Value "`n$includeDirective"
    Write-Host "  ✅ Config eReclamations incluse dans httpd-vhosts.conf" -ForegroundColor Green
} else {
    Write-Host "  ✅ Config eReclamations déjà incluse" -ForegroundColor Green
}

# Vérifier que les modules proxy sont activés dans httpd.conf
$httpdConf = "$XamppPath\apache\conf\httpd.conf"
$httpdContent = Get-Content $httpdConf -Raw

$modulesNeeded = @("mod_rewrite", "mod_proxy", "mod_proxy_http")
foreach ($mod in $modulesNeeded) {
    if ($httpdContent -match "#LoadModule ${mod}_module") {
        Write-Host "  ⚠️  Module $mod commenté — activation automatique..." -ForegroundColor Yellow
        $httpdContent = $httpdContent -replace "#(LoadModule ${mod}_module)", '$1'
        $found = $true
    } else {
        Write-Host "  ✅ Module $mod activé" -ForegroundColor Green
    }
}
if ($found) {
    $httpdContent | Out-File -FilePath $httpdConf -Encoding utf8
    Write-Host "  ✅ httpd.conf mis à jour" -ForegroundColor Green
}

# Vérifier que les Virtual Hosts sont activés
if ($httpdContent -match "#Include conf/extra/httpd-vhosts.conf") {
    $httpdContent = $httpdContent -replace "#(Include conf/extra/httpd-vhosts.conf)", '$1'
    $httpdContent | Out-File -FilePath $httpdConf -Encoding utf8
    Write-Host "  ✅ Virtual Hosts activés dans httpd.conf" -ForegroundColor Green
}

# ── 5. Permissions dossier ────────────────────────────────
Write-Host "`n[5/7] Permissions..." -ForegroundColor Green

New-Item -ItemType Directory -Force `
    -Path "$ProjectPath\backend\storage\attachments" | Out-Null

# Le service Apache XAMPP tourne sous le compte SYSTEM ou Administrateur
# Les permissions sont généralement suffisantes, mais on s'en assure
icacls "$ProjectPath\backend\storage" /grant "Everyone:(OI)(CI)M" /T /Q
Write-Host "  ✅ Permissions storage OK" -ForegroundColor Green

# ── 6. Ouvrir le pare-feu ────────────────────────────────
Write-Host "`n[6/7] Pare-feu Windows..." -ForegroundColor Green

$existingRule = netsh advfirewall firewall show rule name="eReclamations CNPS" 2>&1
if ($existingRule -match "No rules match") {
    netsh advfirewall firewall add rule `
        name="eReclamations CNPS" `
        dir=in action=allow protocol=TCP `
        localport=$FrontendPort | Out-Null
    Write-Host "  ✅ Règle pare-feu ajoutée (port $FrontendPort)" -ForegroundColor Green
} else {
    Write-Host "  ✅ Règle pare-feu déjà présente" -ForegroundColor Green
}

# ── 7. Redémarrer Apache XAMPP ────────────────────────────
Write-Host "`n[7/7] Redémarrage Apache..." -ForegroundColor Green

# Arrêter Apache si en cours
$apacheProc = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if ($apacheProc) {
    & "$XamppPath\apache\bin\httpd.exe" -k stop 2>$null
    Start-Sleep -Seconds 2
}

# Tester la configuration avant de démarrer
$configTest = & "$XamppPath\apache\bin\httpd.exe" -t 2>&1
if ($configTest -match "Syntax error") {
    Write-Host "  ❌ Erreur de configuration Apache :" -ForegroundColor Red
    Write-Host $configTest -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Configuration Apache valide" -ForegroundColor Green

# Démarrer Apache
Start-Process -FilePath "$XamppPath\apache\bin\httpd.exe" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Test de sanité
Write-Host "`n=== Tests de sanité ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/public/init" -TimeoutSec 8 -ErrorAction Stop
    Write-Host "  ✅ API backend répond (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  API backend silencieux — vérifier les logs Apache et PHP" -ForegroundColor Yellow
    Write-Host "     Logs : $XamppPath\apache\logs\ereclamations-api-error.log" -ForegroundColor Gray
}

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 8 -ErrorAction Stop
    Write-Host "  ✅ Frontend répond (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Frontend silencieux" -ForegroundColor Yellow
    Write-Host "     Logs : $XamppPath\apache\logs\ereclamations-error.log" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
Write-Host "   Application : http://IP_SERVEUR:$FrontendPort" -ForegroundColor White
Write-Host "   API (local)  : http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host "   Logs Apache  : $XamppPath\apache\logs\" -ForegroundColor Gray
Write-Host "   Logs PHP     : $XamppPath\php\logs\" -ForegroundColor Gray
