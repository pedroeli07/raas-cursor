# Diagnose Authentication Script
# This script helps diagnose authentication-related issues in the RaaS Solar application

# Set Error Action Preference
$ErrorActionPreference = "Continue"

Write-Host "RaaS Solar Auth Diagnostics" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$adminEmail = "pedro-eli@hotmail.com"
$adminPassword = "galod1234"
$testEmail = "diagnostics-test@example.com"

# Check if the server is running
try {
    Write-Host "1. Checking if server is running..." -ForegroundColor Yellow
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Server is running! Status: $($healthCheck.StatusCode)" -ForegroundColor Green
    
    $healthResponse = $healthCheck.Content | ConvertFrom-Json
    Write-Host "  Environment: $($healthResponse.environment)" -ForegroundColor Green
    Write-Host "  Timestamp: $($healthResponse.timestamp)" -ForegroundColor Green
} catch {
    Write-Host "Cannot connect to server at $baseUrl" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
    Write-Host "  Make sure the server is running with 'npm run dev'" -ForegroundColor Yellow
    exit 1
}

# Authenticate as admin
try {
    Write-Host "`n2. Authenticating as admin ($adminEmail)..." -ForegroundColor Yellow
    $loginPayload = @{
        email = $adminEmail
        password = $adminPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json" -ErrorAction Stop
    Write-Host "Authentication successful! Status: $($loginResponse.StatusCode)" -ForegroundColor Green
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    $tokenPreview = if ($token.Length -gt 20) { $token.Substring(0, 20) + "..." } else { $token }
    Write-Host "  Token received: $tokenPreview" -ForegroundColor Green
    
    # Try to parse token
    try {
        $tokenParts = $token.Split('.')
        if ($tokenParts.Count -ge 2) {
            # Base64 decode the payload part
            $payloadBase64 = $tokenParts[1].Replace('-', '+').Replace('_', '/')
            # Add padding if needed
            $paddingLength = 4 - $payloadBase64.Length % 4
            if ($paddingLength -lt 4) {
                $payloadBase64 = $payloadBase64 + ("=" * $paddingLength)
            }
            
            $payloadBytes = [System.Convert]::FromBase64String($payloadBase64)
            $payload = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
            $payloadJson = $payload | ConvertFrom-Json
            
            Write-Host "  Token payload:" -ForegroundColor Magenta
            Write-Host "    User ID: $($payloadJson.userId)" -ForegroundColor Magenta
            Write-Host "    Email: $($payloadJson.email)" -ForegroundColor Magenta
            Write-Host "    Role: $($payloadJson.role)" -ForegroundColor Magenta
            Write-Host "    Expires: $([DateTimeOffset]::FromUnixTimeSeconds($payloadJson.exp).DateTime)" -ForegroundColor Magenta
        }
    } catch {
        Write-Host "Could not decode token payload: $_" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Authentication failed" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
    Write-Host "  Status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorContent = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "  Response content: $errorContent" -ForegroundColor Red
    } catch {}
    
    exit 1
}

# Check headers and auth
try {
    Write-Host "`n3. Checking authorization headers propagation..." -ForegroundColor Yellow
    $headersCheck = Invoke-WebRequest -Uri "$baseUrl/api/auth/check-headers" -Method Get -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "Headers check successful! Status: $($headersCheck.StatusCode)" -ForegroundColor Green
    
    $headersData = $headersCheck.Content | ConvertFrom-Json
    Write-Host "  User ID from header: $($headersData.userInfo.userId)" -ForegroundColor Green
    Write-Host "  Email from header: $($headersData.userInfo.userEmail)" -ForegroundColor Green
    Write-Host "  Role from header: $($headersData.userInfo.userRole)" -ForegroundColor Green
    
    if ($headersData.userInfo.userId -eq $null) {
        Write-Host "Warning: User ID is null in headers - middleware may not be setting user headers correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Headers check failed" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
    Write-Host "  Headers may not be propagating correctly through middleware" -ForegroundColor Red
}

# Test invitation API
try {
    Write-Host "`n4. Testing invitation API..." -ForegroundColor Yellow
    $invitePayload = @{
        email = $testEmail
        name = "Diagnostic Test User"
        role = "CUSTOMER"
        message = "Invitation created by diagnostic script"
    } | ConvertTo-Json
    
    Write-Host "  Sending invitation to $testEmail..." -ForegroundColor Yellow
    $inviteResponse = Invoke-WebRequest -Uri "$baseUrl/api/invite" -Method Post -Headers @{
        "Authorization" = "Bearer $token"
    } -Body $invitePayload -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "Invitation sent successfully! Status: $($inviteResponse.StatusCode)" -ForegroundColor Green
    
    $inviteData = $inviteResponse.Content | ConvertFrom-Json
    Write-Host "  Invitation details:" -ForegroundColor Green
    Write-Host "    ID: $($inviteData.invitation.id)" -ForegroundColor Green
    Write-Host "    Email: $($inviteData.invitation.email)" -ForegroundColor Green
    Write-Host "    Role: $($inviteData.invitation.role)" -ForegroundColor Green
    Write-Host "    Status: $($inviteData.invitation.status)" -ForegroundColor Green
    Write-Host "    Expires: $($inviteData.invitation.expiresAt)" -ForegroundColor Green
} catch {
    Write-Host "Invitation API test failed" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
    
    try {
        if ($_.Exception.Response) {
            Write-Host "  Status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorContent = $reader.ReadToEnd()
            $reader.Close()
            Write-Host "  Response content: $errorContent" -ForegroundColor Red
        }
    } catch {}
}

# Get invitations (to verify list operation)
try {
    Write-Host "`n5. Checking invitation listing API..." -ForegroundColor Yellow
    $listResponse = Invoke-WebRequest -Uri "$baseUrl/api/invite" -Method Get -Headers @{
        "Authorization" = "Bearer $token"
    } -ErrorAction Stop
    
    Write-Host "Invitation listing successful! Status: $($listResponse.StatusCode)" -ForegroundColor Green
    
    $listData = $listResponse.Content | ConvertFrom-Json
    $invitationCount = $listData.invitations.Count
    Write-Host "  Found $invitationCount invitations" -ForegroundColor Green
    
    if ($invitationCount -gt 0) {
        Write-Host "  Latest invitation:" -ForegroundColor Green
        Write-Host "    ID: $($listData.invitations[0].id)" -ForegroundColor Green
        Write-Host "    Email: $($listData.invitations[0].email)" -ForegroundColor Green
        Write-Host "    Role: $($listData.invitations[0].role)" -ForegroundColor Green
        Write-Host "    Status: $($listData.invitations[0].status)" -ForegroundColor Green
    }
} catch {
    Write-Host "Invitation listing test failed" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
}

# Summary
Write-Host "`nAuthentication Diagnostic Summary" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

if ($headersData.userInfo.userId -eq $null) {
    Write-Host "Middleware issue detected: User headers not propagating correctly" -ForegroundColor Yellow
    Write-Host "   This could be caused by issues with token verification, JWT secret configuration," -ForegroundColor Yellow
    Write-Host "   or the middleware implementation. Check JWT_SECRET environment variable matches" -ForegroundColor Yellow
    Write-Host "   the one used when generating tokens during login." -ForegroundColor Yellow
} else {
    Write-Host "Authentication system appears to be working correctly" -ForegroundColor Green
}

Write-Host "`nRecommendations:" -ForegroundColor Cyan
Write-Host "  1. Check environment variables in .env and .env.local files" -ForegroundColor White
Write-Host "  2. Verify JWT_SECRET is consistent across all environments" -ForegroundColor White
Write-Host "  3. Check for any errors in middleware.ts implementation" -ForegroundColor White
Write-Host "  4. Examine application logs for more detailed error information" -ForegroundColor White

Write-Host "`nDiagnostic Complete!" -ForegroundColor Cyan 