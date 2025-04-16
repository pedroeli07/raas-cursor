# PowerShell script to test the registration and profile completion flow for RaaS

# Configuration
$BASE_URL = "http://localhost:3000"
$LOG_PATH = Join-Path -Path $PSScriptRoot -ChildPath "test-registration.log"

# Clear log
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starting registration test" | Out-File -FilePath $LOG_PATH

function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$timestamp - [$Level] $Message" | Out-File -FilePath $LOG_PATH -Append
    Write-Host "[$Level] $Message"
}

function Test-Registration {
    $userData = @{
        email = "pedro-eli@hotmail.com"
        password = "galod1234"
        name = "Pedro Super Admin"
    }
    
    Write-Log "Attempting to register super admin user: $($userData.email)"
    
    try {
        $body = $userData | ConvertTo-Json
        $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        
        Write-Log "Registration successful, user ID: $($registerResponse.user.id)" -Level "SUCCESS"
        Write-Log "Token received: $($registerResponse.token.Substring(0, 10))..." -Level "DEBUG"
        
        # Save token for future requests
        $script:authToken = $registerResponse.token
        return $true
    }
    catch {
        Write-Log "Registration failed: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "$($_.Exception.Response.StatusCode) - $($_.Exception.Response.StatusDescription)" -Level "ERROR"
        return $false
    }
}

function Complete-Profile {
    if (-not $script:authToken) {
        Write-Log "No auth token available, skipping profile completion" -Level "ERROR"
        return $false
    }
    
    $profileData = @{
        fullName = "Pedro Eli Admin"
        phones = @(
            @{
                phone = "11987654321"
                isPrimary = $true
            }
        )
        cpf = "12345678901"
        rg = "112233445"
        postalCode = "01234-567"
        street = "Rua das Placas Solares"
        number = "123"
        neighborhood = "Energias Renováveis"
        city = "São Paulo"
        state = "SP"
        profileCompleted = $true
    }
    
    Write-Log "Attempting to complete profile for: $($profileData.fullName)"
    
    try {
        $body = $profileData | ConvertTo-Json -Depth 5
        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $script:authToken"
        }
        
        $profileResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/fill-profile" -Method Put -Body $body -Headers $headers -ErrorAction Stop
        
        Write-Log "Profile completion successful" -Level "SUCCESS"
        
        # Update token if new one is provided
        if ($profileResponse.token) {
            $script:authToken = $profileResponse.token
            Write-Log "New token received and saved" -Level "DEBUG"
        }
        
        return $true
    }
    catch {
        Write-Log "Profile completion failed: $($_.Exception.Message)" -Level "ERROR"
        Write-Log "$($_.Exception.Response.StatusCode) - $($_.Exception.Response.StatusDescription)" -Level "ERROR"
        return $false
    }
}

function Check-Dashboard {
    if (-not $script:authToken) {
        Write-Log "No auth token available, skipping dashboard check" -Level "ERROR"
        return $false
    }
    
    Write-Log "Checking dashboard access"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $script:authToken"
        }
        
        $dashboardResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/me" -Method Get -Headers $headers -ErrorAction Stop
        
        Write-Log "Dashboard access check successful" -Level "SUCCESS"
        Write-Log "User role: $($dashboardResponse.role)" -Level "INFO"
        Write-Log "Profile completed: $($dashboardResponse.profileCompleted)" -Level "INFO"
        
        return $true
    }
    catch {
        Write-Log "Dashboard access check failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Run tests
Write-Log "======= Starting Test Flow ======="

# Step 1: Register
$registrationSuccess = Test-Registration
if (-not $registrationSuccess) {
    Write-Log "Registration failed, stopping test" -Level "ERROR"
    exit 1
}

# Step 2: Complete profile
$profileSuccess = Complete-Profile
if (-not $profileSuccess) {
    Write-Log "Profile completion failed, but continuing to check dashboard" -Level "WARNING"
}

# Step 3: Check dashboard access
$dashboardSuccess = Check-Dashboard
if (-not $dashboardSuccess) {
    Write-Log "Dashboard access check failed" -Level "ERROR"
    exit 1
}

Write-Log "======= Test Flow Completed ======="
Write-Log "Registration: $registrationSuccess" -Level $(if ($registrationSuccess) { "SUCCESS" } else { "ERROR" })
Write-Log "Profile Completion: $profileSuccess" -Level $(if ($profileSuccess) { "SUCCESS" } else { "ERROR" })
Write-Log "Dashboard Access: $dashboardSuccess" -Level $(if ($dashboardSuccess) { "SUCCESS" } else { "ERROR" })

# Test completed
Write-Log "Test script completed. Check full logs at: $LOG_PATH" 