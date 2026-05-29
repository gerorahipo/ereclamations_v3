# ==============================================================================
# deploy-xampp.ps1  --  eReclamations CNPS CI
#
# Deploiement sur Windows Server avec XAMPP (Apache + PHP 8.2) et
# PostgreSQL 16 deja installe avec la base de donnees existante.
#
# Usage minimal :
#   powershell -ExecutionPolicy Bypass -File .\deploy-xampp.ps1
#
# Usage avance (surcharge des parametres) :
#   powershell -ExecutionPolicy Bypass -File .\deploy-xampp.ps1 `
#       -ProjectPath "D:\apps\ereclamations" `
#       -XamppPath   "C:\xampp" `
#       -FrontendPort "81" `
#       -BackendPort  "9000" `
#       -PgHost       "localhost" `
#       -PgPort       "5432" `
#       -PgDb         "ereclamations" `
#       -PgUser       "postgres"
#
# Prerequis (a installer avant d'executer ce script) :
#   - XAMPP 8.2.x                    https://www.apachefriends.org/
#   - PostgreSQL 16 (deja installe)  Base de donnees deja creee + schema importe
#   - Node.js 20 LTS                 https://nodejs.org/
# ==============================================================================

param(
    [string]$ProjectPath  = "C:\inetpub\ereclamations",
    [string]$XamppPath    = "C:\xampp",
    [string]$FrontendPort = "81",
    [string]$BackendPort  = "9000",
    [string]$PgHost       = "localhost",
    [string]$PgPort       = "5432",
    [string]$PgDb         = "ereclamations",
    [string]$PgUser       = "postgres"
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# ==============================================================================
# Fonctions utilitaires
# ==============================================================================

function Write-Step {
    param([string]$Step, [string]$Label)
    Write-Host ""
    Write-Host "[$Step] $Label" -ForegroundColor Cyan
}

function Write-OK    { param([string]$msg) Write-Host "  [OK]       $msg" -ForegroundColor Green  }
function Write-Warn  { param([string]$msg) Write-Host "  [ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$msg) Write-Host "  [ERREUR]   $msg" -ForegroundColor Red    }
function Write-Info  { param([string]$msg) Write-Host "  ...        $msg" -ForegroundColor Gray   }

# ==============================================================================
# En-tete
# ==============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  eReclamations CNPS CI  --  Deploiement XAMPP             " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Dossier projet  : $ProjectPath"
Write-Host "  XAMPP           : $XamppPath"
Write-Host "  Port frontend   : $FrontendPort  (accessible reseau)"
Write-Host "  Port backend    : $BackendPort   (localhost uniquement)"
Write-Host "  Base de donnees : ${PgUser}@${PgHost}:${PgPort}/${PgDb}"
Write-Host "============================================================" -ForegroundColor Cyan

# ==============================================================================
# ETAPE 1 -- Verification des prerequis
# ==============================================================================

Write-Step "1/6" "Verification des prerequis"

$stopScript = $false

# Apache XAMPP
if (Test-Path "$XamppPath\apache\bin\httpd.exe") {
    Write-OK "Apache XAMPP trouve"
} else {
    Write-Fail "Apache XAMPP introuvable dans $XamppPath\apache\"
    $stopScript = $true
}

# PHP XAMPP
if (Test-Path "$XamppPath\php\php.exe") {
    $phpVer = & "$XamppPath\php\php.exe" -r "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . '.' . PHP_RELEASE_VERSION;" 2>$null
    Write-OK "PHP XAMPP v$phpVer"
} else {
    Write-Fail "PHP XAMPP introuvable dans $XamppPath\php\"
    $stopScript = $true
}

# Node.js
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = node --version 2>$null
    Write-OK "Node.js $nodeVer"
} else {
    Write-Fail "Node.js introuvable (ajouter au PATH)"
    $stopScript = $true
}

# PostgreSQL 16 client
$psqlExe = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
if (Test-Path $psqlExe) {
    Write-OK "PostgreSQL 16 client (psql.exe)"
} else {
    Write-Warn "psql.exe introuvable dans C:\Program Files\PostgreSQL\16\bin\"
    Write-Info  "Verifications de connexion BD ignorees (non bloquant)"
    $psqlExe = $null
}

# Extension PDO PostgreSQL dans XAMPP
if (Test-Path "$XamppPath\php\php.exe") {
    $pdoCheck = & "$XamppPath\php\php.exe" -r "echo extension_loaded('pdo_pgsql') ? 'OK' : 'MANQUANT';" 2>$null
    if ($pdoCheck -eq "OK") {
        Write-OK "Extension pdo_pgsql active"
    } else {
        Write-Warn "Extension pdo_pgsql non active dans XAMPP PHP"
        Write-Info  "-> Editer $XamppPath\php\php.ini"
        Write-Info  "   Rechercher la ligne : ;extension=pdo_pgsql"
        Write-Info  "   La decommenter      : extension=pdo_pgsql"
        Write-Info  "-> Copier libpq.dll depuis C:\Program Files\PostgreSQL\16\bin\ vers $XamppPath\php\"
        Write-Host ""
        $rep = Read-Host "   Extension manquante. Continuer quand meme ? (o/n)"
        if ($rep -ne "o") { exit 1 }
    }
}

if ($stopScript) {
    Write-Host ""
    Write-Fail "Des prerequis sont manquants. Corriger les erreurs ci-dessus et relancer."
    exit 1
}

# ==============================================================================
# ETAPE 2 -- Fichier de configuration backend (.env)
# ==============================================================================

Write-Step "2/6" "Configuration backend (.env)"

$envFile    = "$ProjectPath\backend\.env"
$envExample = "$ProjectPath\backend\.env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warn "Fichier .env cree depuis .env.example"
        Write-Warn "IMPORTANT : editer le fichier avant de relancer le script"
        Write-Host ""
        Write-Host "  Fichier a editer : $envFile" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Valeurs minimales a renseigner :" -ForegroundColor Yellow
        Write-Host "    DB_HOST     = $PgHost"       -ForegroundColor Yellow
        Write-Host "    DB_PORT     = $PgPort"       -ForegroundColor Yellow
        Write-Host "    DB_NAME     = $PgDb"         -ForegroundColor Yellow
        Write-Host "    DB_USER     = $PgUser"       -ForegroundColor Yellow
        Write-Host "    DB_PASSWORD = <mot_de_passe_postgres>" -ForegroundColor Yellow
        Write-Host "    JWT_SECRET  = <chaine_aleatoire_longue>" -ForegroundColor Yellow
        Write-Host "    CORS_ORIGIN = http://IP_SERVEUR:$FrontendPort" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    } else {
        Write-Fail "Ni .env ni .env.example trouves dans $ProjectPath\backend\"
        exit 1
    }
}

Write-OK "Fichier .env present : $envFile"

# Verifier que les valeurs critiques sont renseignees
$envContent = Get-Content $envFile -Raw
$missingVars = @()
foreach ($varName in @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET")) {
    if ($envContent -notmatch "^$varName=.+") {
        $missingVars += $varName
    }
}
if ($missingVars.Count -gt 0) {
    Write-Warn "Variables manquantes ou vides dans .env : $($missingVars -join ', ')"
    Write-Info  "Editer $envFile et renseigner ces variables avant de continuer"
    $rep = Read-Host "   Continuer quand meme ? (o/n)"
    if ($rep -ne "o") { exit 1 }
} else {
    Write-OK "Variables .env verifiees (DB_*, JWT_SECRET)"
}

# Mettre a jour CORS_ORIGIN avec le bon port si encore sur la valeur exemple
if ($envContent -match "CORS_ORIGIN=http://localhost:5173") {
    $envContent = $envContent -replace "CORS_ORIGIN=http://localhost:5173", "CORS_ORIGIN=http://IP_SERVEUR:$FrontendPort"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Warn "CORS_ORIGIN mis a jour en http://IP_SERVEUR:$FrontendPort -- remplacer IP_SERVEUR par l'IP reelle"
}

# ==============================================================================
# ETAPE 3 -- Build du frontend React/Vite
# ==============================================================================

Write-Step "3/6" "Build du frontend React/Vite"

if (-not (Test-Path "$ProjectPath\frontend")) {
    Write-Fail "Dossier frontend introuvable : $ProjectPath\frontend"
    exit 1
}

Push-Location "$ProjectPath\frontend"

# Ecrire le .env de production
$prodEnvContent = "VITE_API_URL=http://IP_SERVEUR:$FrontendPort"
Set-Content -Path ".env.production" -Value $prodEnvContent -Encoding UTF8
Write-OK ".env.production cree"
Write-Warn "Remplacer IP_SERVEUR dans frontend\.env.production par l'adresse IP reelle du serveur"

# npm install
Write-Info "Installation des dependances npm (peut prendre quelques minutes)..."
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install a echoue (code $LASTEXITCODE)"
    Pop-Location
    exit 1
}
Write-OK "npm install OK"

# npm run build
Write-Info "Build de production Vite..."
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm run build a echoue (code $LASTEXITCODE)"
    Pop-Location
    exit 1
}
Write-OK "Build termine dans frontend\dist\"

# Copier .htaccess Apache dans dist/
if (Test-Path ".htaccess.apache") {
    Copy-Item ".htaccess.apache" "dist\.htaccess" -Force
    Write-OK ".htaccess copie dans dist\"
} else {
    Write-Warn ".htaccess.apache introuvable dans frontend\ -- routage SPA peut ne pas fonctionner"
}

Pop-Location

# ==============================================================================
# ETAPE 4 -- Configuration Apache XAMPP
# ==============================================================================

Write-Step "4/6" "Configuration Apache XAMPP"

$ourConf     = "$ProjectPath\docker\httpd-ereclamations.conf"
$adaptedConf = "$XamppPath\apache\conf\extra\httpd-ereclamations.conf"
$vhostsConf  = "$XamppPath\apache\conf\extra\httpd-vhosts.conf"
$httpdConf   = "$XamppPath\apache\conf\httpd.conf"

# --- 4a. Generer la config adaptee au serveur
if (-not (Test-Path $ourConf)) {
    Write-Fail "Fichier de config source introuvable : $ourConf"
    exit 1
}

$confContent   = Get-Content $ourConf -Raw -Encoding UTF8
$projSlash     = $ProjectPath.Replace("\", "/")
$xamppSlash    = $XamppPath.Replace("\", "/")

$confContent = $confContent -replace [regex]::Escape("C:/inetpub/ereclamations"), $projSlash
$confContent = $confContent -replace [regex]::Escape("C:/xampp"),                  $xamppSlash
$confContent = $confContent -replace "Listen 81",                                  "Listen $FrontendPort"
$confContent = $confContent -replace "Listen 127\.0\.0\.1:9000",                   "Listen 127.0.0.1:$BackendPort"
$confContent = $confContent -replace "127\.0\.0\.1:9000",                          "127.0.0.1:$BackendPort"
$confContent = $confContent -replace "<VirtualHost \*:81>",                        "<VirtualHost *:$FrontendPort>"
$confContent = $confContent -replace "<VirtualHost 127\.0\.0\.1:9000>",            "<VirtualHost 127.0.0.1:$BackendPort>"

Set-Content -Path $adaptedConf -Value $confContent -Encoding UTF8
Write-OK "Config VirtualHost ecrite : $adaptedConf"

# --- 4b. Inclure dans httpd-vhosts.conf
if (Test-Path $vhostsConf) {
    $vhostsContent = Get-Content $vhostsConf -Raw -Encoding UTF8
    if ($vhostsContent -notlike "*httpd-ereclamations.conf*") {
        Add-Content -Path $vhostsConf -Value "`r`nInclude conf/extra/httpd-ereclamations.conf" -Encoding UTF8
        Write-OK "Include ajoute dans httpd-vhosts.conf"
    } else {
        Write-OK "Include deja present dans httpd-vhosts.conf"
    }
} else {
    Write-Warn "$vhostsConf introuvable"
    Write-Info  "Ajouter manuellement dans httpd.conf : Include conf/extra/httpd-ereclamations.conf"
}

# --- 4c. Activer modules et VirtualHosts dans httpd.conf
if (-not (Test-Path $httpdConf)) {
    Write-Fail "httpd.conf introuvable : $httpdConf"
    exit 1
}

$httpdContent  = Get-Content $httpdConf -Raw -Encoding UTF8
$httpdModified = $false

$modules = @("mod_rewrite", "mod_proxy", "mod_proxy_http")
foreach ($mod in $modules) {
    $commented = "#LoadModule ${mod}_module"
    if ($httpdContent -like "*$commented*") {
        $httpdContent  = $httpdContent -replace [regex]::Escape($commented), "LoadModule ${mod}_module"
        $httpdModified = $true
        Write-OK "Module $mod active dans httpd.conf"
    } else {
        Write-OK "Module $mod deja actif"
    }
}

if ($httpdContent -like "*#Include conf/extra/httpd-vhosts.conf*") {
    $httpdContent  = $httpdContent -replace "#Include conf/extra/httpd-vhosts.conf", "Include conf/extra/httpd-vhosts.conf"
    $httpdModified = $true
    Write-OK "VirtualHosts actives dans httpd.conf"
}

if ($httpdModified) {
    Set-Content -Path $httpdConf -Value $httpdContent -Encoding UTF8
    Write-OK "httpd.conf mis a jour"
}

# ==============================================================================
# ETAPE 5 -- Permissions et pare-feu
# ==============================================================================

Write-Step "5/6" "Permissions et pare-feu Windows"

# Creer le dossier storage si absent
$storagePath = "$ProjectPath\backend\storage\attachments"
if (-not (Test-Path $storagePath)) {
    New-Item -ItemType Directory -Force -Path $storagePath | Out-Null
    Write-OK "Dossier storage cree"
} else {
    Write-OK "Dossier storage present"
}

# Permissions en ecriture pour Apache (service SYSTEM)
icacls "$ProjectPath\backend\storage" /grant "Everyone:(OI)(CI)M" /T /Q 2>$null
Write-OK "Permissions storage OK (Everyone:Modifier)"

# Regle pare-feu
$ruleName    = "eReclamations CNPS - port $FrontendPort"
$ruleCheck   = netsh advfirewall firewall show rule name="$ruleName" 2>&1
$ruleAbsent  = ($ruleCheck -match "No rules match") -or ($ruleCheck -match "Aucune regle")
if ($ruleAbsent) {
    netsh advfirewall firewall add rule `
        name="$ruleName" `
        dir=in action=allow protocol=TCP `
        localport=$FrontendPort | Out-Null
    Write-OK "Regle pare-feu creee pour le port $FrontendPort"
} else {
    Write-OK "Regle pare-feu deja presente"
}

# ==============================================================================
# ETAPE 6 -- Redemarrage et tests
# ==============================================================================

Write-Step "6/6" "Redemarrage Apache et tests"

# Tester la configuration Apache
Write-Info "Validation de la configuration Apache..."
$configTest = & "$XamppPath\apache\bin\httpd.exe" -t 2>&1
if ($configTest -match "Syntax error" -or $configTest -match "Error") {
    Write-Fail "Configuration Apache invalide :"
    Write-Host $configTest -ForegroundColor Red
    Write-Info  "Corriger les erreurs dans : $adaptedConf"
    Write-Info  "Puis relancer le script"
    exit 1
}
Write-OK "Configuration Apache valide"

# Arreter Apache si en cours
$apacheProc = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if ($apacheProc) {
    Write-Info "Arret d'Apache..."
    & "$XamppPath\apache\bin\httpd.exe" -k stop 2>$null
    Start-Sleep -Seconds 2
}

# Demarrer Apache
Start-Process -FilePath "$XamppPath\apache\bin\httpd.exe" -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-OK "Apache demarre"

# Test backend
Write-Info "Test de l'API backend (port $BackendPort)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/public/init" -TimeoutSec 8 -ErrorAction Stop
    Write-OK "API backend repond HTTP $($r.StatusCode)"
} catch {
    Write-Warn "API backend silencieux"
    Write-Info  "-> Verifier : $XamppPath\apache\logs\ereclamations-api-error.log"
    Write-Info  "-> Verifier que pdo_pgsql est active et que la BD est accessible"
}

# Test frontend
Write-Info "Test du frontend (port $FrontendPort)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 8 -ErrorAction Stop
    Write-OK "Frontend repond HTTP $($r.StatusCode)"
} catch {
    Write-Warn "Frontend silencieux"
    Write-Info  "-> Verifier : $XamppPath\apache\logs\ereclamations-error.log"
}

# Test connexion PostgreSQL (si psql disponible)
if ($psqlExe) {
    Write-Info "Test de connexion PostgreSQL..."
    $pgTest = & $psqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDb -c "SELECT 1;" 2>&1
    if ($pgTest -match "1 row" -or $pgTest -match "1 ligne") {
        Write-OK "Connexion PostgreSQL OK (${PgUser}@${PgHost}:${PgPort}/${PgDb})"
    } else {
        Write-Warn "Connexion PostgreSQL echouee (mdp demande ou erreur reseau)"
        Write-Info  "-> Verifier DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD dans $envFile"
    }
}

# ==============================================================================
# Resume
# ==============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Deploiement termine !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL application    : http://IP_SERVEUR:$FrontendPort" -ForegroundColor White
Write-Host "  API backend local  : http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host ""
Write-Host "  Logs Apache        : $XamppPath\apache\logs\" -ForegroundColor Gray
Write-Host "  Config Apache      : $adaptedConf" -ForegroundColor Gray
Write-Host "  Config backend     : $envFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  Compte par defaut  : superviseur@cnps.ci" -ForegroundColor Yellow
Write-Host "  Mot de passe def.  : Password@1234" -ForegroundColor Yellow
Write-Host "  /!\ Changer ce mot de passe en production !" -ForegroundColor Red
Write-Host ""
Write-Host "  Actions post-deploiement :" -ForegroundColor White
Write-Host "    1. Remplacer IP_SERVEUR dans .env.production et .env backend" -ForegroundColor White
Write-Host "    2. Changer JWT_SECRET dans $envFile" -ForegroundColor White
Write-Host "    3. Changer le mot de passe des utilisateurs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
