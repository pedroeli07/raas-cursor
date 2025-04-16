# Invitation API Test Script
# This script tests the invitation API for the RaaS Solar application

# Set Error Action Preference
$ErrorActionPreference = "Continue"

Write-Host "RaaS Solar Invitation API Test" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$adminEmail = "pedro-eli@hotmail.com"
$adminPassword = "galod1234"
$testEmail = "test-invitation@example.com"
$token = $null

# Function to log with timestamp
function Log-Message {
    param (
        [string]$message,
        [string]$type = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($type) {
        "INFO"    { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }
    
    Write-Host "[$timestamp] [$type] $message" -ForegroundColor $color
}

# Step 1: Login as Admin
try {
    Log-Message "Logging in as admin ($adminEmail)..." "INFO"
    
    $body = @{
        email = $adminEmail
        password = $adminPassword
    } | ConvertTo-Json
    
    $loginResult = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    $loginResponse = $loginResult.Content | ConvertFrom-Json
    $token = $loginResponse.token
    
    if ($token) {
        Log-Message "Authentication successful!" "SUCCESS"
        $global:authHeader = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
    } else {
        Log-Message "Authentication failed: No token returned" "ERROR"
        exit 1
    }
} catch {
    Log-Message "Authentication failed! Error: $_" "ERROR"
    exit 1
}

# Step 2: Send an Invitation
try {
    Log-Message "Sending invitation to $testEmail..." "INFO"
    
    # Create invitation data
    $invitationData = @{
        email = $testEmail
        name = "Test User"
        role = "CUSTOMER"
        message = "This is a test invitation. Please register using this invitation link."
    } | ConvertTo-Json
    
    $inviteResult = Invoke-WebRequest -Uri "$baseUrl/api/invite" -Method Post -Headers $global:authHeader -Body $invitationData -ErrorAction Stop
    $inviteResponse = $inviteResult.Content | ConvertFrom-Json
    
    if ($inviteResponse.id) {
        Log-Message "Invitation sent successfully! ID: $($inviteResponse.id)" "SUCCESS"
        Log-Message "Invitation details:" "INFO"
        Log-Message "- Email: $($inviteResponse.email)" "INFO"
        Log-Message "- Role: $($inviteResponse.role)" "INFO"
        Log-Message "- Status: $($inviteResponse.status)" "INFO"
        Log-Message "- Created: $($inviteResponse.createdAt)" "INFO"
        Log-Message "- Expires: $($inviteResponse.expiresAt)" "INFO"
    } else {
        Log-Message "Invitation response received but no ID found" "WARNING"
        Log-Message "Response: $($inviteResult.Content)" "INFO"
    }
} catch {
    Log-Message "Failed to send invitation! Error: $_" "ERROR"
    
    try {
        if ($_.Exception.Response) {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseBody = $reader.ReadToEnd()
            Log-Message "Response body: $responseBody" "ERROR"
        }
    } catch {
        Log-Message "Could not parse error response" "ERROR"
    }
    exit 1
}

# Step 3: List Invitations
try {
    Log-Message "Listing invitations..." "INFO"
    
    $invitationsResult = Invoke-WebRequest -Uri "$baseUrl/api/invite" -Method Get -Headers $global:authHeader -ErrorAction Stop
    $invitationsResponse = $invitationsResult.Content | ConvertFrom-Json
    
    if ($invitationsResponse.invitations -and $invitationsResponse.invitations.Count -gt 0) {
        Log-Message "Found $($invitationsResponse.invitations.Count) invitations" "SUCCESS"
        
        foreach ($invitation in $invitationsResponse.invitations) {
            Log-Message "- Invitation: $($invitation.email) | Role: $($invitation.role) | Status: $($invitation.status)" "INFO"
        }
    } else {
        Log-Message "No invitations found" "WARNING"
    }
} catch {
    Log-Message "Failed to list invitations! Error: $_" "ERROR"
    exit 1
}

Log-Message "Invitation API test completed!" "SUCCESS" 