# This script will test fetching invitation details from the database

# Make sure to have the app running in development mode

$BaseUrl = "http://localhost:3000"
$AdminEmail = "pedro-eli@hotmail.com"
$AdminPassword = "galod1234"
$TestEmail = "pedroelimaciel592@gmail.com"

Write-Host "🚀 Running invitation test script" -ForegroundColor Cyan

# Step 1: Login as admin
Write-Host "`n🔹 Step 1: Logging in as admin" -ForegroundColor Cyan
$loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -ErrorAction Stop
Write-Host "✅ Admin login successful" -ForegroundColor Green
$authToken = $loginResponse.token
Write-Host "🔑 Got admin token starting with: $($authToken.Substring(0, 20))..." -ForegroundColor Yellow

# Step 2: Check for invitations for the test email
Write-Host "`n🔹 Step 2: Checking invitations in dev-tools API" -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

try {
    $invitationsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/dev/invitations?email=$TestEmail" -Method Get -Headers $headers -ErrorAction Stop
    
    Write-Host "Found invitations:" -ForegroundColor Green
    $invitationsResponse | ConvertTo-Json -Depth 5
    
    if ($invitationsResponse.Count -gt 0) {
        $invitation = $invitationsResponse[0]
        Write-Host "`nInvitation details:" -ForegroundColor Cyan
        Write-Host "ID: $($invitation.id)" -ForegroundColor Yellow
        Write-Host "Email: $($invitation.email)" -ForegroundColor Yellow
        Write-Host "Status: $($invitation.status)" -ForegroundColor Yellow
        Write-Host "Created: $($invitation.createdAt)" -ForegroundColor Yellow
        Write-Host "Expires: $($invitation.expiresAt)" -ForegroundColor Yellow
        Write-Host "Token: $($invitation.token.Substring(0, 20))..." -ForegroundColor Yellow
        
        # Step 3: Try to register using this token
        Write-Host "`n🔹 Step 3: Trying to register with token" -ForegroundColor Cyan
        $registerBody = @{
            name = "Pedro Test User"
            email = $TestEmail
            password = "teste12345"
            token = $invitation.token
        } | ConvertTo-Json
        
        try {
            $registerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $registerBody -ErrorAction Stop
            Write-Host "✅ Registration successful!" -ForegroundColor Green
            $registerResponse | ConvertTo-Json -Depth 3
        }
        catch {
            Write-Host "❌ Registration failed" -ForegroundColor Red
            Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
            Write-Host "Response body:" -ForegroundColor Yellow
            
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseText = $reader.ReadToEnd()
            $reader.Close()
            
            Write-Host $responseText -ForegroundColor Red
        }
    }
    else {
        Write-Host "❌ No pending invitations found for $TestEmail" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error fetching invitations" -ForegroundColor Red
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Error message: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔄 Creating new invitation" -ForegroundColor Cyan
$inviteBody = @{
    email = $TestEmail
    name = "Pedro Test"
    role = "CUSTOMER"
    message = "Test invitation via PowerShell"
} | ConvertTo-Json

try {
    $createInviteResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invite" -Method Post -Headers $headers -Body $inviteBody -ErrorAction Stop
    Write-Host "✅ New invitation created successfully" -ForegroundColor Green
    $createInviteResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Failed to create invitation" -ForegroundColor Red
    Write-Host "Status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Error message: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🏁 Test script completed" -ForegroundColor Cyan 