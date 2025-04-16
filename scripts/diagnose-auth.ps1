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
    
    $body = @{
        email = $adminEmail
        password = $adminPassword
    } | ConvertTo-Json
    
    $loginResult = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    $loginResponse = $loginResult.Content | ConvertFrom-Json
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "  Authentication successful!" -ForegroundColor Green
        Write-Host "  JWT token: $($token.Substring(0, 20))..." -ForegroundColor Green
        
        # Store token for future requests
        $authHeader = @{
            "Authorization" = "Bearer $token"
        }
        
        # Test token by fetching user info
        $meResult = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method Get -Headers $authHeader -ErrorAction Stop
        $meResponse = $meResult.Content | ConvertFrom-Json
        Write-Host "  Verified user: $($meResponse.name) ($($meResponse.email))" -ForegroundColor Green
        Write-Host "  Role: $($meResponse.role)" -ForegroundColor Green
    } else {
        Write-Host "  Authentication failed: No token returned" -ForegroundColor Red
    }
} catch {
    Write-Host "  Authentication failed!" -ForegroundColor Red
    Write-Host "  Error details: $_" -ForegroundColor Red
    
    try {
        if ($_.Exception.Response) {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response body: $responseBody" -ForegroundColor Red
        }
    } catch {
        Write-Host "  Could not parse error response" -ForegroundColor Red
    }
} 