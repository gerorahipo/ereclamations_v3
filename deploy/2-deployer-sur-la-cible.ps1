<#
============================================================
 2-deployer-sur-la-cible.ps1
 A executer SUR LA MACHINE CIBLE (celle qui a l'ancienne version),
 APRES avoir copie et decompresse le paquet prepare par
 1-preparer-le-paquet.ps1.

 Ce script :
   1. Sauvegarde la base de donnees (pg_dump)
   2. Sauvegarde l'application actuelle (copie horodatee)
   3. Copie les nouveaux fichiers SANS toucher au .env local
      ni aux pieces jointes deja presentes
   4. Applique les migrations SQL dans le bon ordre
   5. Insere la donnee de reference manquante (processus 'NQ')
   6. Reconstruit le frontend (npm install + npm run build)
   7. Affiche une checklist de verification

 Ne necessite PAS git. Necessite : PowerShell, psql.exe, un PHP
 avec l'extension pdo_pgsql, node/npm.
============================================================
#>

param(
    # Dossier ou se trouve le paquet decompresse (contient backend/, frontend/, deploy/...)
    [Parameter(Mandatory = $true)]
    [string]$PackageDir,

    # Dossier de l'application actuellement installee sur CETTE machine
    [Parameter(Mandatory = $true)]
    [string]$AppDir,

    # Connexion PostgreSQL de la machine cible
    [string]$PgHost     = "127.0.0.1",
    [string]$PgPort     = "5432",
    [string]$PgDatabase = "ereclamations",
    [string]$PgUser     = "postgres",
    [string]$PgPassword = "postgres",

    # Chemins vers les binaires (adapter si differents sur la machine cible)
    [string]$PsqlExe   = "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    [string]$PgDumpExe = "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    [string]$NpmExe    = "npm",

    # Mettre a $false pour sauter le rebuild frontend (si fait a part)
    [bool]$BuildFrontend = $true
)

$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

function Section($titre) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host " $titre" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

# ------------------------------------------------------------
# Verifications prealables
# ------------------------------------------------------------
Section "Verifications prealables"

if (-not (Test-Path $PackageDir)) { throw "Paquet introuvable : $PackageDir" }
if (-not (Test-Path $AppDir))     { throw "Application cible introuvable : $AppDir" }
if (-not (Test-Path $PsqlExe))    { throw "psql.exe introuvable : $PsqlExe (ajustez -PsqlExe)" }
if (-not (Test-Path $PgDumpExe))  { throw "pg_dump.exe introuvable : $PgDumpExe (ajustez -PgDumpExe)" }
if (-not (Test-Path "$AppDir\backend\.env")) {
    Write-Host "ATTENTION : aucun backend\.env trouve sur la cible. Vous devrez en creer un avant de demarrer l'application." -ForegroundColor Yellow
}

Write-Host "Paquet     : $PackageDir"
Write-Host "Application: $AppDir"
Write-Host "Base       : $PgDatabase sur $PgHost`:$PgPort"
Write-Host ""
$confirm = Read-Host "Continuer le deploiement ? (O/N)"
if ($confirm -notmatch '^[oOyY]') { Write-Host "Annule."; exit 0 }

$env:PGPASSWORD = $PgPassword

# ------------------------------------------------------------
# 1. Sauvegarde de la base de donnees
# ------------------------------------------------------------
Section "1. Sauvegarde de la base de donnees"

$backupDir = "$AppDir\backups"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$dumpFile = "$backupDir\backup_avant_maj_$ts.dump"

& $PgDumpExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -F c -f $dumpFile
if ($LASTEXITCODE -ne 0) { throw "Echec de la sauvegarde pg_dump. Deploiement arrete, rien n'a ete modifie." }

Write-Host "Sauvegarde DB creee : $dumpFile" -ForegroundColor Green

# ------------------------------------------------------------
# 2. Sauvegarde de l'application actuelle (fichiers)
# ------------------------------------------------------------
Section "2. Sauvegarde des fichiers actuels"

$appBackupDir = "$backupDir\app_avant_maj_$ts"
New-Item -ItemType Directory -Path $appBackupDir -Force | Out-Null

robocopy "$AppDir\backend"  "$appBackupDir\backend"  /E /XD node_modules /NFL /NDL /NJH /NJS | Out-Null
robocopy "$AppDir\frontend" "$appBackupDir\frontend" /E /XD node_modules dist /NFL /NDL /NJH /NJS | Out-Null

Write-Host "Copie de sauvegarde des fichiers creee : $appBackupDir" -ForegroundColor Green

# ------------------------------------------------------------
# 3. Copie des nouveaux fichiers (sans ecraser .env ni les
#    pieces jointes deja presentes, absentes du paquet)
# ------------------------------------------------------------
Section "3. Copie des nouveaux fichiers"

# /E copie tout y compris les sous-dossiers vides, sans supprimer
# les fichiers deja presents sur la cible qui ne sont pas dans le
# paquet (donc .env et storage\attachments restent intacts).
robocopy "$PackageDir\backend"  "$AppDir\backend"  /E /XF ".env" /NFL /NDL /NJH /NJS
robocopy "$PackageDir\frontend" "$AppDir\frontend" /E /NFL /NDL /NJH /NJS

# robocopy renvoie des codes >= 8 en cas d'erreur reelle (0-7 = succes/info)
if ($LASTEXITCODE -ge 8) { throw "Erreur robocopy lors de la copie des fichiers (code $LASTEXITCODE)." }

Write-Host "Fichiers copies." -ForegroundColor Green

# ------------------------------------------------------------
# 4. Migrations SQL, dans l'ordre
# ------------------------------------------------------------
Section "4. Migrations de la base de donnees"

$migrations = @(
    "migration_objectifs_sla.sql",
    "migration_partenaire_immatricule.sql",
    "migration_roles_refonte.sql",
    "migration_modification_reclamation.sql",
    "migration_notifications.sql"
)

foreach ($m in $migrations) {
    $path = "$AppDir\backend\database\$m"
    if (-not (Test-Path $path)) {
        Write-Host "Fichier de migration introuvable, ignore : $m" -ForegroundColor Yellow
        continue
    }
    Write-Host "Application de $m ..." -ForegroundColor Cyan
    & $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -f $path
    if ($LASTEXITCODE -ne 0) {
        throw "Echec de la migration $m. Corrigez le probleme puis relancez le script (les migrations sont idempotentes)."
    }
}

Write-Host "Toutes les migrations sont passees." -ForegroundColor Green

# ------------------------------------------------------------
# 5. Donnee de reference manquante : processus 'NQ'
#    (sans elle, la creation de reclamations echoue)
# ------------------------------------------------------------
Section "5. Donnee de reference : processus 'Non Qualifie'"

$nqSqlPath = "$env:TEMP\insert_nq_$ts.sql"
@"
INSERT INTO processus (code, libelle, actif)
SELECT 'NQ', 'Non Qualifie', true
WHERE NOT EXISTS (SELECT 1 FROM processus WHERE code = 'NQ');

SELECT id, code, libelle FROM processus WHERE code = 'NQ';
"@ | Out-File -FilePath $nqSqlPath -Encoding utf8

& $PsqlExe -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -f $nqSqlPath
Remove-Item $nqSqlPath -Force

Write-Host "Processus 'NQ' verifie/cree." -ForegroundColor Green

# ------------------------------------------------------------
# 6. Rebuild du frontend
# ------------------------------------------------------------
if ($BuildFrontend) {
    Section "6. Reconstruction du frontend"

    Push-Location "$AppDir\frontend"
    try {
        & $NpmExe install
        if ($LASTEXITCODE -ne 0) { throw "npm install a echoue." }

        & $NpmExe run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build a echoue." }
    }
    finally {
        Pop-Location
    }

    Write-Host "Frontend reconstruit dans frontend\dist." -ForegroundColor Green
    Write-Host "N'oubliez pas de redeployer ce dossier dist si votre serveur web sert un autre emplacement." -ForegroundColor Yellow
}
else {
    Write-Host "Rebuild frontend saute (BuildFrontend = false)." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 7. Redemarrage du backend (rappel manuel)
# ------------------------------------------------------------
Section "7. Redemarrage du backend"
Write-Host "Pensez a redemarrer Apache / PHP-FPM (Laragon) pour recharger le nouveau code PHP." -ForegroundColor Yellow

# ------------------------------------------------------------
# Checklist finale
# ------------------------------------------------------------
Section "Deploiement termine - Checklist de verification"

Write-Host @"
1) Se connecter avec un compte existant.
2) Creer une reclamation de test avec un mauvais N. CNPS (ex: 5 chiffres)
   -> doit etre rejetee avec un message explicite.
3) Creer une reclamation avec un CNPS valide -> doit reussir.
4) Verifier le tableau de bord (cartes KPI, objectifs SLA).
5) Ouvrir une fiche existante -> verifier les 4 onglets et le N. CNPS affiche.
6) Faire une correction sur une fiche -> verifier l'entree dans l'onglet Historique.
7) Telecharger une piece jointe existante -> ne doit plus renvoyer d'erreur 401.
8) Verifier que l'icone de notifications repond sans erreur.

En cas de probleme, restauration possible avec :
  pg_restore -h $PgHost -U $PgUser -d $PgDatabase --clean "$dumpFile"
et en recopiant les fichiers depuis :
  $appBackupDir
"@ -ForegroundColor White
