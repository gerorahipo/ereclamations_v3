# test_api_v2.ps1
$BASE = "http://localhost:8888/api"

function Test-Endpoint {
    param($Method, $Path, $Body, $Token, $Description, $ExpectedStatus = 200)
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $statusCode = 0
    $response = $null
    try {
        $params = @{
            Method = $Method
            Uri = "$BASE$Path"
            Headers = $headers
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }
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
                } catch { $response = $null }
            } else { $statusCode = 500 }
        }
        $ok = ($statusCode -eq $ExpectedStatus)
        if ($ok) { Write-Host "[OK] [$statusCode] $Description" }
        else { Write-Host "[FAIL] [$statusCode] $Description" }
        return $response
    } catch {
        Write-Host "[ERROR] $Description - $($_.Exception.Message)"
        return $null
    }
}

Write-Host "--- eReclamations API Tests (V2) ---"
$login = Test-Endpoint "POST" "/auth/login" @{ email = "agent.plateau@cnps.ci"; password = "Password@1234" } -Description "Login"
if ($login) {
    $token = $login.token
    Test-Endpoint "GET" "/processus" -Token $token -Description "Get Processus"
}
Write-Host "--- End ---"
