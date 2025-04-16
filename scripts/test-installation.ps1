# Installation API Test Script
# This script tests the installations API for the RaaS Solar application

# Set Error Action Preference
$ErrorActionPreference = "Continue"

Write-Host "RaaS Solar Installations API Test" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$adminEmail = "pedro-eli@hotmail.com"
$adminPassword = "galod1234"
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

# Step 1: Login
try {
    Log-Message "Logging in as $adminEmail..." "INFO"
    
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

# Step 2: Get distributors to use in installation creation
try {
    Log-Message "Fetching distributors..." "INFO"
    
    $distributorsResult = Invoke-WebRequest -Uri "$baseUrl/api/distributors" -Method Get -Headers $global:authHeader -ErrorAction Stop
    $distributorsResponse = $distributorsResult.Content | ConvertFrom-Json
    
    if ($distributorsResponse.distributors -and $distributorsResponse.distributors.Count -gt 0) {
        $distributor = $distributorsResponse.distributors[0]
        Log-Message "Found distributor: $($distributor.name) (ID: $($distributor.id))" "SUCCESS"
        $distributorId = $distributor.id
    } else {
        Log-Message "No distributors found. Creating one..." "WARNING"
        
        # Create a distributor
        $distributorData = @{
            name = "Test Distributor"
            price_per_kwh = 0.89
        } | ConvertTo-Json
        
        $createDistributorResult = Invoke-WebRequest -Uri "$baseUrl/api/distributors" -Method Post -Headers $global:authHeader -Body $distributorData -ErrorAction Stop
        $createDistributorResponse = $createDistributorResult.Content | ConvertFrom-Json
        
        if ($createDistributorResponse.distributor) {
            Log-Message "Created distributor: $($createDistributorResponse.distributor.name) (ID: $($createDistributorResponse.distributor.id))" "SUCCESS"
            $distributorId = $createDistributorResponse.distributor.id
        } else {
            Log-Message "Failed to create distributor" "ERROR"
            exit 1
        }
    }
} catch {
    Log-Message "Failed to get distributors! Error: $_" "ERROR"
    exit 1
}

# Step 3: Create an address for the installation
try {
    Log-Message "Creating an address for the installation..." "INFO"
    
    $addressData = @{
        street = "Rua de Teste"
        number = "123"
        complement = "Apto 101"
        neighborhood = "Centro"
        city = "Belo Horizonte"
        state = "MG"
        zip = "30000-000"
    } | ConvertTo-Json
    
    $createAddressResult = Invoke-WebRequest -Uri "$baseUrl/api/addresses" -Method Post -Headers $global:authHeader -Body $addressData -ErrorAction Stop
    $createAddressResponse = $createAddressResult.Content | ConvertFrom-Json
    
    if ($createAddressResponse.address) {
        Log-Message "Created address: $($createAddressResponse.address.street), $($createAddressResponse.address.city)" "SUCCESS"
        $addressId = $createAddressResponse.address.id
    } else {
        Log-Message "Failed to create address" "ERROR"
        exit 1
    }
} catch {
    Log-Message "Failed to create address! Error: $_" "ERROR"
    exit 1
}

# Step 4: Create an installation without owner
try {
    Log-Message "Creating an installation without owner..." "INFO"
    
    $installationData = @{
        installationNumber = "TST" + (Get-Random -Minimum 100000 -Maximum 999999)
        type = "GENERATOR"
        distributorId = $distributorId
        addressId = $addressId
    } | ConvertTo-Json
    
    $createInstallationResult = Invoke-WebRequest -Uri "$baseUrl/api/installations" -Method Post -Headers $global:authHeader -Body $installationData -ErrorAction Stop
    $createInstallationResponse = $createInstallationResult.Content | ConvertFrom-Json
    
    if ($createInstallationResponse.installation) {
        Log-Message "Created installation: $($createInstallationResponse.installation.installationNumber)" "SUCCESS"
        Log-Message "Installation ID: $($createInstallationResponse.installation.id)" "SUCCESS"
        Log-Message "Installation has no owner" "SUCCESS"
    } else {
        Log-Message "Failed to create installation" "ERROR"
        exit 1
    }
} catch {
    Log-Message "Failed to create installation! Error: $_" "ERROR"
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

# Step 5: List installations to confirm creation
try {
    Log-Message "Listing installations..." "INFO"
    
    $installationsResult = Invoke-WebRequest -Uri "$baseUrl/api/installations" -Method Get -Headers $global:authHeader -ErrorAction Stop
    $installationsResponse = $installationsResult.Content | ConvertFrom-Json
    
    if ($installationsResponse.installations -and $installationsResponse.installations.Count -gt 0) {
        Log-Message "Found $($installationsResponse.installations.Count) installations" "SUCCESS"
        
        foreach ($installation in $installationsResponse.installations) {
            $ownerInfo = if ($installation.owner) { "Owner: $($installation.owner.name)" } else { "No owner" }
            Log-Message "- Installation: $($installation.installationNumber) | Type: $($installation.type) | $ownerInfo" "INFO"
        }
    } else {
        Log-Message "No installations found" "WARNING"
    }
} catch {
    Log-Message "Failed to list installations! Error: $_" "ERROR"
    exit 1
}

Log-Message "Installation API test completed!" "SUCCESS" 