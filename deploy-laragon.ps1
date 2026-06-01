# ==============================================================================
# deploy-laragon.ps1  --  eReclamations CNPS CI
#
# Deploiement sur Windows avec Laragon (Apache + PHP 8.1)
# La base de donnees PostgreSQL est supposee deja installee et configuree.
#
# Usage minimal :
#   powershell -ExecutionPolicy Bypass -File .\deploy-laragon.ps1
#
# Usage avance (surcharge des parametres) :
#   powershell -ExecutionPolicy Bypass -File .\deploy-laragon.ps1 `
#       -ProjectPath    "D:\apps\ereclamations" `
#       -LaragonPath    "C:\laragon" `
#       -FrontendPort   "81" `
#       -BackendPort    "9000" `
#       -PgHost         "localhost" `
#       -PgPort         "5432" `
#       -PgDb           "ereclamations" `
#       -PgUser         "postgres"
#
# Prerequis (a installer avant d'executer ce script) :
#   - Laragon 6.x           https://laragon.org/
#   - PHP 8.1 dans Laragon  (Menu > PHP > Switch)
#   - PostgreSQL installe    Base de donnees + schema deja importes
#   - Node.js 20 LTS        https://nodejs.org/
# ==============================================================================

param(
    [string]$ProjectPath   = "C:\laragon\www\ereclamations",
    [string]$LaragonPath   = "C:\laragon",
    [string]$FrontendPort  = "81",
    [string]$BackendPort   = "9000",
    [string]$PgHost        = "localhost",
    [string]$PgPort        = "5432",
    [string]$PgDb          = "ereclamations",
    [string]$PgUser        = "postgres"
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

function Write-OK   { param([string]$msg) Write-Host "  [OK]        $msg" -ForegroundColor Green  }
function Write-Warn { param([string]$msg) Write-Host "  [ATTENTION] $msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$msg) Write-Host "  [ERREUR]    $msg" -ForegroundColor Red    }
function Write-Info { param([string]$msg) Write-Host "  ...         $msg" -ForegroundColor Gray   }

# ==============================================================================
# En-tete
# ==============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  eReclamations CNPS CI  --  Deploiement Laragon           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Dossier projet  : $ProjectPath"
Write-Host "  Laragon         : $LaragonPath"
Write-Host "  Port frontend   : $FrontendPort  (accessible reseau)"
Write-Host "  Port backend    : $BackendPort   (localhost uniquement)"
Write-Host "  Base de donnees : ${PgUser}@${PgHost}:${PgPort}/${PgDb}"
Write-Host "============================================================" -ForegroundColor Cyan

# ==============================================================================
# ETAPE 1 -- Verification des prerequis
# ==============================================================================

Write-Step "1/6" "Verification des prerequis"

$stopScript = $false

# --- Apache Laragon
$apacheExe = "$LaragonPath\bin\apache\apache2.4\bin\httpd.exe"
if (-not (Test-Path $apacheExe)) {
    # Chercher toute version Apache disponible dans Laragon
    $apacheCandidates = Get-ChildItem "$LaragonPath\bin\apache" -Directory -ErrorAction SilentlyContinue |
                        ForEach-Object { "$($_.FullName)\bin\httpd.exe" } |
                        Where-Object { Test-Path $_ }
    if ($apacheCandidates) {
        $apacheExe = $apacheCandidates | Select-Object -First 1
        Write-OK "Apache Laragon trouve : $apacheExe"
    } else {
        Write-Fail "Apache Laragon introuvable dans $LaragonPath\bin\apache\"
        $stopScript = $true
    }
} else {
    Write-OK "Apache Laragon trouve"
}

# Dossier de configuration Apache Laragon
$apacheConfDir = Split-Path (Split-Path $apacheExe)  # ...apache2.4\
$apacheConf    = "$apacheConfDir\conf\httpd.conf"
$vhostsConf    = "$apacheConfDir\conf\extra\httpd-vhosts.conf"

if (-not (Test-Path $apacheConf)) {
    Write-Fail "httpd.conf introuvable : $apacheConf"
    $stopScript = $true
} else {
    Write-OK "httpd.conf trouve"
}

# --- PHP 8.1 dans Laragon
$phpExe = "$LaragonPath\bin\php\php8.1\php.exe"
if (-not (Test-Path $phpExe)) {
    # Chercher php 8.x disponible dans Laragon
    $phpCandidates = Get-ChildItem "$LaragonPath\bin\php" -Directory -ErrorAction SilentlyContinue |
                     Where-Object { $_.Name -like "php8*" } |
                     ForEach-Object { "$($_.FullName)\php.exe" } |
                     Where-Object { Test-Path $_ }
    if ($phpCandidates) {
        $phpExe = $phpCandidates | Select-Object -First 1
        $phpVersion = & $phpExe -r "echo PHP_VERSION;" 2>$null
        Write-OK "PHP trouve dans Laragon : v$phpVersion ($phpExe)"
    } else {
        Write-Fail "PHP 8.x introuvable dans $LaragonPath\bin\php\"
        Write-Info  "-> Dans Laragon : clic droit > PHP > Switch > PHP 8.1.x"
        $stopScript = $true
    }
} else {
    $phpVersion = & $phpExe -r "echo PHP_VERSION;" 2>$null
    Write-OK "PHP 8.1 trouve : v$phpVersion"
}

# --- Extension pdo_pgsql
if ($phpExe -and (Test-Path $phpExe)) {
    $pdoCheck = & $phpExe -r "echo extension_loaded('pdo_pgsql') ? 'OK' : 'MANQUANT';" 2>$null
    if ($pdoCheck -eq "OK") {
        Write-OK "Extension pdo_pgsql active"
    } else {
        Write-Warn "Extension pdo_pgsql non active dans PHP Laragon"
        $phpDir  = Split-Path $phpExe
        $phpIni  = "$phpDir\php.ini"
        Write-Info  "-> Editer : $phpIni"
        Write-Info  "   Rechercher la ligne : ;extension=pdo_pgsql"
        Write-Info  "   La decommenter      : extension=pdo_pgsql"
        $libpqSrc = "C:\Program Files\PostgreSQL\16\bin\libpq.dll"
        if (-not (Test-Path $libpqSrc)) {
            $libpqSrc = "C:\Program Files\PostgreSQL\15\bin\libpq.dll"
        }
        if (Test-Path $libpqSrc) {
            Write-Info  "-> Copier $libpqSrc vers $phpDir\"
        }
        $rep = Read-Host "   Extension manquante. Corriger puis continuer ? (o/n)"
        if ($rep -ne "o") { exit 1 }
    }
}

# --- Node.js
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = node --version 2>$null
    Write-OK "Node.js $nodeVer"
} else {
    Write-Fail "Node.js introuvable (ajouter au PATH)"
    $stopScript = $true
}

# --- PostgreSQL client (psql)
$psqlExe = $null
foreach ($pgVer in @("16","15","14","13")) {
    $candidate = "C:\Program Files\PostgreSQL\$pgVer\bin\psql.exe"
    if (Test-Path $candidate) { $psqlExe = $candidate; break }
}
if ($psqlExe) {
    Write-OK "psql.exe trouve : $psqlExe"
} else {
    Write-Warn "psql.exe introuvable -- tests de connexion BD ignores (non bloquant)"
}

if ($stopScript) {
    Write-Host ""
    Write-Fail "Des prerequis sont manquants. Corriger les erreurs ci-dessus et relancer."
    exit 1
}

# ==============================================================================
# ETAPE 2 -- Configuration du fichier .env backend
# ==============================================================================

Write-Step "2/6" "Configuration backend (.env)"

$envFile    = "$ProjectPath\backend\.env"
$envExample = "$ProjectPath\backend\.env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Warn "Fichier .env cree depuis .env.example"
    } else {
        # Creer un .env minimal
        $envMinimal = @"
# ============================================================
# eReclamations CNPS CI -- Variables d'environnement Laragon
# ============================================================

DB_HOST=$PgHost
DB_PORT=$PgPort
DB_NAME=$PgDb
DB_USER=$PgUser
DB_PASSWORD=CHANGER_MOT_DE_PASSE

JWT_SECRET=ereclamations_cnps_secret_$(Get-Random -Maximum 999999)_CHANGER_EN_PROD
APP_ENV=production

CORS_ORIGIN=http://localhost:$FrontendPort
"@
        Set-Content -Path $envFile -Value $envMinimal -Encoding UTF8
        Write-Warn "Fichier .env minimal cree (aucun .env.example disponible)"
    }
    Write-Host ""
    Write-Host "  IMPORTANT : editer le fichier avant de continuer :" -ForegroundColor Yellow
    Write-Host "  $envFile" -ForegroundColor Yellow
    Write-Host "  Valeurs a renseigner :" -ForegroundColor Yellow
    Write-Host "    DB_PASSWORD  = <mot_de_passe_postgres>" -ForegroundColor Yellow
    Write-Host "    JWT_SECRET   = <chaine_aleatoire_longue>" -ForegroundColor Yellow
    Write-Host "    CORS_ORIGIN  = http://<IP_SERVEUR>:$FrontendPort" -ForegroundColor Yellow
    Write-Host ""
    $rep = Read-Host "  Fichier .env pret ? Appuyez sur [o] pour continuer"
    if ($rep -ne "o") { exit 0 }
}

Write-OK "Fichier .env present : $envFile"

# Verifier les variables critiques
$envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
$missingVars = @()
foreach ($varName in @("DB_HOST","DB_PORT","DB_NAME","DB_USER","DB_PASSWORD","JWT_SECRET")) {
    if ($envContent -notmatch "(?m)^$varName=.+") {
        $missingVars += $varName
    }
}
if ($missingVars.Count -gt 0) {
    Write-Warn "Variables manquantes ou vides dans .env : $($missingVars -join ', ')"
    $rep = Read-Host "   Continuer quand meme ? (o/n)"
    if ($rep -ne "o") { exit 1 }
} else {
    Write-OK "Variables .env verifiees (DB_*, JWT_SECRET)"
}

# Forcer CORS_ORIGIN sur le bon port si encore sur la valeur dev Vite
if ($envContent -match "CORS_ORIGIN=http://localhost:5173") {
    $envContent = $envContent -replace "CORS_ORIGIN=http://localhost:5173", "CORS_ORIGIN=http://localhost:$FrontendPort"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Warn "CORS_ORIGIN mis a jour vers http://localhost:$FrontendPort"
}

# Forcer APP_ENV=production
if ($envContent -notmatch "APP_ENV=production") {
    $envContent = $envContent -replace "APP_ENV=development", "APP_ENV=production"
    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-OK "APP_ENV bascule en production"
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

# Creer/mettre a jour le .env de production Vite
$prodEnvContent = "VITE_API_URL=http://localhost:$FrontendPort"
Set-Content -Path ".env.production" -Value $prodEnvContent -Encoding UTF8
Write-OK ".env.production cree (VITE_API_URL=http://localhost:$FrontendPort)"

# npm install
Write-Info "Installation des dependances npm..."
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

# Copier le .htaccess SPA dans dist/
if (Test-Path ".htaccess.apache") {
    Copy-Item ".htaccess.apache" "dist\.htaccess" -Force
    Write-OK ".htaccess SPA copie dans dist\"
} else {
    Write-Warn ".htaccess.apache introuvable -- le routage SPA peut ne pas fonctionner"
}

Pop-Location

# ==============================================================================
# ETAPE 4 -- Configuration Apache Laragon (VirtualHosts)
# ==============================================================================

Write-Step "4/6" "Configuration Apache Laragon (VirtualHosts)"

# --- Generer la config VirtualHost adaptee
$projSlash   = $ProjectPath.Replace("\", "/")
$apacheConfSlash = (Split-Path (Split-Path $apacheExe)).Replace("\", "/")

$vhostContent = @"
# ============================================================
# eReclamations CNPS CI -- VirtualHosts Laragon
# Genere automatiquement par deploy-laragon.ps1
# ============================================================

Listen $FrontendPort
Listen 127.0.0.1:$BackendPort

# -- Backend PHP API (port $BackendPort -- localhost uniquement) ---
<VirtualHost 127.0.0.1:$BackendPort>
    ServerName localhost
    DocumentRoot "$projSlash/backend/public"

    <Directory "$projSlash/backend/public">
        Options -Indexes -MultiViews
        AllowOverride All
        Require all granted
    </Directory>

    <FilesMatch "^\.env$">
        Require all denied
    </FilesMatch>

    ErrorLog  "$apacheConfSlash/logs/ereclamations-api-error.log"
    CustomLog "$apacheConfSlash/logs/ereclamations-api-access.log" combined
</VirtualHost>

# -- Frontend React SPA (port $FrontendPort -- reseau) ---------------
<VirtualHost *:$FrontendPort>
    ServerName localhost
    DocumentRoot "$projSlash/frontend/dist"

    <Directory "$projSlash/frontend/dist">
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost Off
    ProxyPass        /api/ http://127.0.0.1:$BackendPort/api/
    ProxyPassReverse /api/ http://127.0.0.1:$BackendPort/api/

    ErrorLog  "$apacheConfSlash/logs/ereclamations-error.log"
    CustomLog "$apacheConfSlash/logs/ereclamations-access.log" combined
</VirtualHost>
"@

$vhostFile = "$apacheConfDir\conf\extra\httpd-ereclamations.conf"
Set-Content -Path $vhostFile -Value $vhostContent -Encoding UTF8
Write-OK "Config VirtualHost ecrite : $vhostFile"

# --- Activer les modules necessaires dans httpd.conf
$httpdContent  = Get-Content $apacheConf -Raw -Encoding UTF8
$httpdModified = $false

$modules = @("mod_rewrite","mod_proxy","mod_proxy_http")
foreach ($mod in $modules) {
    $commented = "#LoadModule ${mod}_module"
    if ($httpdContent -like "*$commented*") {
        $httpdContent  = $httpdContent -replace [regex]::Escape($commented), "LoadModule ${mod}_module"
        $httpdModified = $true
        Write-OK "Module $mod active"
    } else {
        Write-OK "Module $mod deja actif"
    }
}

# Activer les VirtualHosts
if ($httpdContent -like "*#Include conf/extra/httpd-vhosts.conf*") {
    $httpdContent  = $httpdContent -replace "#Include conf/extra/httpd-vhosts.conf", "Include conf/extra/httpd-vhosts.conf"
    $httpdModified = $true
    Write-OK "VirtualHosts actives dans httpd.conf"
}

# Inclure notre fichier de config eReclamations
if ($httpdContent -notlike "*httpd-ereclamations.conf*") {
    $httpdContent += "`r`n# eReclamations CNPS`r`nInclude conf/extra/httpd-ereclamations.conf`r`n"
    $httpdModified = $true
    Write-OK "Include httpd-ereclamations.conf ajoute dans httpd.conf"
} else {
    Write-OK "Include httpd-ereclamations.conf deja present"
}

if ($httpdModified) {
    Set-Content -Path $apacheConf -Value $httpdContent -Encoding UTF8
    Write-OK "httpd.conf mis a jour"
}

# Verifier que PHP 8.1 est bien le module Apache actif (Laragon utilise mod_php ou PHP-CGI)
$phpModLine = $httpdContent | Select-String "php" | Select-Object -First 1
if ($phpModLine) {
    Write-Info "Module PHP detecte dans httpd.conf : $($phpModLine.Line.Trim())"
} else {
    Write-Warn "Aucune ligne PHP detectee dans httpd.conf -- verifier que Laragon utilise bien PHP 8.1"
    Write-Info "-> Dans Laragon : clic droit > PHP > Switch > PHP 8.1.x, puis Demarrer tout"
}

# ==============================================================================
# ETAPE 5 -- Permissions et pare-feu Windows
# ==============================================================================

Write-Step "5/6" "Permissions dossier et pare-feu Windows"

# Creer le dossier storage/attachments si absent
$storagePath = "$ProjectPath\backend\storage\attachments"
if (-not (Test-Path $storagePath)) {
    New-Item -ItemType Directory -Force -Path $storagePath | Out-Null
    Write-OK "Dossier storage cree : $storagePath"
} else {
    Write-OK "Dossier storage present"
}

# Permissions en ecriture pour le processus Apache (Everyone en local)
icacls "$ProjectPath\backend\storage" /grant "Everyone:(OI)(CI)M" /T /Q 2>$null
Write-OK "Permissions storage OK (Everyone:Modifier)"

# Regle pare-feu pour le port frontend
$ruleName  = "eReclamations CNPS - port $FrontendPort"
$ruleCheck = netsh advfirewall firewall show rule name="$ruleName" 2>&1
$ruleAbsent = ($ruleCheck -match "No rules match") -or ($ruleCheck -match "Aucune regle")
if ($ruleAbsent) {
    netsh advfirewall firewall add rule `
        name="$ruleName" `
        dir=in action=allow protocol=TCP `
        localport=$FrontendPort | Out-Null
    Write-OK "Regle pare-feu creee pour le port $FrontendPort"
} else {
    Write-OK "Regle pare-feu deja presente pour le port $FrontendPort"
}

# ==============================================================================
# ETAPE 6 -- Redemarrage Apache et tests
# ==============================================================================

Write-Step "6/6" "Redemarrage Apache Laragon et tests"

# Valider la configuration Apache avant de redemarrer
Write-Info "Validation de la configuration Apache..."
$configTest = & $apacheExe -t 2>&1
if ($configTest -match "Syntax error" -or $configTest -match "Error") {
    Write-Fail "Configuration Apache invalide !"
    Write-Host $configTest -ForegroundColor Red
    Write-Info "-> Verifier le fichier : $vhostFile"
    Write-Info "-> Corriger les erreurs, puis relancer le script"
    exit 1
}
Write-OK "Configuration Apache valide (Syntax OK)"

# Arreter Apache si actif
$apacheProcs = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if ($apacheProcs) {
    Write-Info "Arret d'Apache en cours..."
    & $apacheExe -k stop 2>$null
    Start-Sleep -Seconds 2
    Write-OK "Apache arrete"
}

# Demarrer Apache
Start-Process -FilePath $apacheExe -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-OK "Apache demarre"

# Test backend PHP API
Write-Info "Test de l'API backend (http://localhost:$BackendPort/api/public/init)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/public/init" -TimeoutSec 8 -ErrorAction Stop
    Write-OK "API backend repond HTTP $($r.StatusCode)"
} catch {
    Write-Warn "API backend silencieux ou erreur : $_"
    Write-Info "-> Verifier : $apacheConfDir\logs\ereclamations-api-error.log"
    Write-Info "-> Verifier que pdo_pgsql est active et que PostgreSQL est lance"
}

# Test frontend React
Write-Info "Test du frontend (http://localhost:$FrontendPort)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 8 -ErrorAction Stop
    Write-OK "Frontend repond HTTP $($r.StatusCode)"
} catch {
    Write-Warn "Frontend silencieux ou erreur : $_"
    Write-Info "-> Verifier : $apacheConfDir\logs\ereclamations-error.log"
    Write-Info "-> Verifier que le build Vite est present dans $ProjectPath\frontend\dist\"
}

# Test connexion PostgreSQL
if ($psqlExe) {
    Write-Info "Test de connexion PostgreSQL..."
    $env:PGPASSWORD = ""
    $pgTest = & $psqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDb -c "SELECT 1;" 2>&1
    if ($pgTest -match "1 row" -or $pgTest -match "1 ligne") {
        Write-OK "Connexion PostgreSQL OK (${PgUser}@${PgHost}:${PgPort}/${PgDb})"
    } else {
        Write-Warn "Connexion PostgreSQL echouee (mot de passe requis ou erreur reseau)"
        Write-Info "-> Verifier DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD dans $envFile"
    }
}

# ==============================================================================
# Resume final
# ==============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Deploiement Laragon termine !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL application    : http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  API backend local  : http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host ""
Write-Host "  Config Apache      : $vhostFile" -ForegroundColor Gray
Write-Host "  Logs Apache        : $apacheConfDir\logs\" -ForegroundColor Gray
Write-Host "  Config backend     : $envFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  SECURITE -- Actions obligatoires avant mise en production :" -ForegroundColor Yellow
Write-Host "    1. Changer JWT_SECRET dans $envFile" -ForegroundColor Yellow
Write-Host "    2. Mettre a jour CORS_ORIGIN avec l'IP reelle du serveur" -ForegroundColor Yellow
Write-Host "    3. Changer le mot de passe des utilisateurs par defaut" -ForegroundColor Yellow
Write-Host "    4. Verifier que APP_ENV=production est bien dans $envFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Pour ouvrir le pare-feu depuis le reseau :" -ForegroundColor Gray
Write-Host "  netsh advfirewall firewall add rule name=""eReclamations"" dir=in action=allow protocol=TCP localport=$FrontendPort" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
