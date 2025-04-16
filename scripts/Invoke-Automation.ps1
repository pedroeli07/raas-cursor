# PowerShell script for automating RaaS Solar account creation

# Configuration
$BaseUrl = "http://localhost:3000"
$AdminEmail = "pedro-eli@hotmail.com"
$AdminPassword = "galod1234"
$NewEmail = "psytech777@outlook.com"
$NewName = "Psytech Admin"
$NewRole = "SUPER_ADMIN"
$NewPassword = "Admin@123"
$TwoFactorCode = "531368"

# For testing, we hardcode a known invitation token from the logs
$InvitationToken = "9c811a53461455af85a74d26c5e1efcfb1f97203ca32fcfc19912bf7435fa6a2"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Extract-Token($response) {
    if ($response -match '"token":"([^"]*)"') {
        return $matches[1]
    }
    return $null
}

# Show initial information
Write-ColorOutput Blue "=== RaaS Solar Automation Script ==="
Write-ColorOutput Blue "This script will create a new admin account"
Write-ColorOutput Blue "Admin: $AdminEmail"
Write-ColorOutput Blue "New User: $NewEmail"
Write-Host ""

# Step 1: Login as admin
Write-ColorOutput Yellow "Step 1: Logging in as admin"
$body = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $body -ErrorAction SilentlyContinue -ErrorVariable loginError

if ($loginError) {
    Write-ColorOutput Red "Login failed:"
    Write-Host $loginError.Message
    exit 1
}

$authToken = $null

# Check if response contains a token or requires 2FA
if ($response.token) {
    $authToken = $response.token
    Write-ColorOutput Green "Login successful!"
}
elseif ($response.requiresTwoFactor) {
    Write-ColorOutput Yellow "Two-factor authentication required. Using code $TwoFactorCode"
    
    # Get user ID from response
    $userId = $response.userId
    
    # Send 2FA verification
    $twoFactorBody = @{
        userId = $userId
        code = $TwoFactorCode
    } | ConvertTo-Json
    
    $twoFactorResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/verify-two-factor" -Method Post -ContentType "application/json" -Body $twoFactorBody -ErrorAction SilentlyContinue -ErrorVariable twoFactorError
    
    if ($twoFactorError) {
        Write-ColorOutput Red "Failed to complete two-factor authentication:"
        Write-Host $twoFactorError.Message
        exit 1
    }
    
    $authToken = $twoFactorResponse.token
    Write-ColorOutput Green "Two-factor authentication successful!"
}
else {
    Write-ColorOutput Red "Login failed - unexpected response:"
    Write-Host ($response | ConvertTo-Json)
    exit 1
}

# Step 2: Create invitation
Write-ColorOutput Yellow "Step 2: Creating invitation for $NewEmail"
$inviteBody = @{
    email = $NewEmail
    name = $NewName
    role = $NewRole
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $authToken"
}

$inviteResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invite" -Method Post -ContentType "application/json" -Headers $headers -Body $inviteBody -ErrorAction SilentlyContinue -ErrorVariable inviteError

if ($inviteError) {
    Write-ColorOutput Red "Failed to create invitation:"
    Write-Host $inviteError.Message
    exit 1
}

Write-ColorOutput Green "Invitation created successfully!"

# Step 3: Normally, we would wait for the email. For this script, we're using a token from the logs
Write-ColorOutput Yellow "Waiting for invitation processing..."
Start-Sleep -Seconds 3
Write-ColorOutput Yellow "Using token from logs: $InvitationToken"

# Step 4: Register with invitation
Write-ColorOutput Yellow "Step 3: Registering new user with invitation token"
$registerBody = @{
    email = $NewEmail
    name = $NewName
    password = $NewPassword
    token = $InvitationToken
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $registerBody -ErrorAction SilentlyContinue -ErrorVariable registerError

if ($registerError) {
    Write-ColorOutput Red "Registration failed:"
    Write-Host $registerError.Message
    exit 1
}

Write-ColorOutput Green "Registration successful!"

# Step 5: Login with new account
Write-ColorOutput Yellow "Step 4: Logging in with new account"
$newLoginBody = @{
    email = $NewEmail
    password = $NewPassword
} | ConvertTo-Json

$newLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $newLoginBody -ErrorAction SilentlyContinue -ErrorVariable newLoginError

if ($newLoginError) {
    Write-ColorOutput Red "Login with new account failed:"
    Write-Host $newLoginError.Message
    exit 1
}

Write-ColorOutput Green "Login with new account successful!"
Write-ColorOutput Green "========================="
Write-ColorOutput Green "AUTOMATION COMPLETED!"
Write-ColorOutput Green "New admin account created:"
Write-Host "Email: " -NoNewline; Write-ColorOutput Green $NewEmail
Write-Host "Password: " -NoNewline; Write-ColorOutput Green $NewPassword
Write-Host "Role: " -NoNewline; Write-ColorOutput Green $NewRole
Write-ColorOutput Green "=========================" 