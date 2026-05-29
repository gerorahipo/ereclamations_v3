# test_api.ps1
# Usage: powershell -ExecutionPolicy Bypass -File .\test_api.ps1

$BASE = "http://localhost:81/api"

function Test-Endpoint {
    param($Method, $Path, $Body, $Token, $Description, $ExpectedStatus = 200)
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $statusCode = 0
    $response = $null

    try {
        $params = @{
            Method  = $Method
            Uri     = "$BASE$Path"
            Headers = $headers
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Compress)
        }
        
        try {
            $response = Invoke-RestMethod @params
            $statusCode = 200
        } catch {
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
                try {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $errorText = $reader.ReadToEnd()
                    $response = $errorText | ConvertFrom-Json
                } catch {
                    $response = $null
                }
            } else {
                $statusCode = 500
            }
        }

        $ok = ($statusCode -eq $ExpectedStatus)
        if ($ok) {
            Write-Host "[OK] [$statusCode] $Description"
        } else {
            Write-Host "[FAIL] [$statusCode] $Description"
        }
        return $response
    } catch {
        Write-Host "[ERROR] $Description - $($_.Exception.Message)"
        return $null
    }
}

Write-Host "--- eReclamations API Tests ---"

# 1. Login
$loginAgent = Test-Endpoint "POST" "/auth/login" @{ email = "agent.plateau@cnps.ci"; password = "Password@1234" } -Description "Login Agent"
$tokenAgent = $loginAgent.token

$loginPilote = Test-Endpoint "POST" "/auth/login" @{ email = "pilote.plateau@cnps.ci"; password = "Password@1234" } -Description "Login Pilote"
$tokenPilote = $loginPilote.token

$loginCoord = Test-Endpoint "POST" "/auth/login" @{ email = "coord.plateau@cnps.ci"; password = "Password@1234" } -Description "Login Coord"
$tokenCoord = $loginCoord.token

# 2. Parametres
Test-Endpoint "GET" "/processus" -Token $tokenAgent -Description "Get Processus"
Test-Endpoint "GET" "/stats" -Token $tokenAgent -Description "Get Stats"

# 3. Reclamations
$newRec = Test-Endpoint "POST" "/reclamations" @{ partenaire_type = "travailleur"; partenaire_nom = "Test User"; motif_id = 1; description = "Test" } -Token $tokenAgent -Description "Create Reclamation" -ExpectedStatus 201
$recId = $newRec.id

if ($recId) {
    Test-Endpoint "GET" "/reclamations/$recId" -Token $tokenAgent -Description "Get Detail"
    Test-Endpoint "PUT" "/reclamations/$recId/statut" @{ statut = "en_cours"; commentaire = "Prise en charge" } -Token $tokenPilote -Description "Take Charge"
    Test-Endpoint "POST" "/reclamations/$recId/soumettre" @{} -Token $tokenPilote -Description "Submit"
    Test-Endpoint "POST" "/reclamations/$recId/valider" @{ commentaire = "Valide" } -Token $tokenCoord -Description "Validate"
}

Write-Host "--- End of tests ---"
