#!/usr/bin/env pwsh
# RaaS Solar - Invitation Testing Script
# This script tests the invitation functionality of the RaaS Solar API

# Strict mode to catch common errors
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Configuration
$baseUrl = "http://localhost:3000/api"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "invitation-test-$timestamp.log"

# Colors for console output
$colors = @{
    Success = [ConsoleColor]::Green
    Error = [ConsoleColor]::Red
    Info = [ConsoleColor]::Cyan
    Warning = [ConsoleColor]::Yellow
}

# Test data
$superAdminCredentials = @{
    email = "pedro-eli@hotmail.com"
    password = "Test@123456"
}

$testInvitations = @(
    @{
        email = "customer-test-$timestamp@example.com"
        name = "Test Customer"
        role = "CUSTOMER"
        message = "Test invitation for customer"
    },
    @{
        email = "admin-test-$timestamp@example.com"
        name = "Test Admin"
        role = "ADMIN"
        message = "Test invitation for admin"
    },
    @{
        email = "energy-renter-test-$timestamp@example.com"
        name = "Test Energy Renter"
        role = "ENERGY_RENTER"
        message = "Test invitation for energy renter"
    }
)

# Global variables
$authToken = $null
$invitationIds = @()

# Helper functions
function Write-Log {
    param (
        [string]$message,
        [string]$level = "INFO",
        [switch]$noConsole
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$level] $message"
    
    # Write to log file
    Add-Content -Path $logFile -Value $logMessage
    
    # Write to console with color
    if (-not $noConsole) {
        $color = switch ($level) {
            "SUCCESS" { $colors.Success }
            "ERROR" { $colors.Error }
            "INFO" { $colors.Info }
            "WARNING" { $colors.Warning }
            default { [ConsoleColor]::White }
        }
        
        Write-Host $logMessage -ForegroundColor $color
    }
}

function Test-ServerHealth {
    Write-Log "Testing server health..." -level "INFO"
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
        Write-Log "Server is healthy: $($response | ConvertTo-Json -Compress)" -level "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Server health check failed: $_" -level "ERROR"
        return $false
    }
}

function Test-Login {
    Write-Log "Testing login with super admin credentials..." -level "INFO"
    
    try {
        $body = @{
            email = $superAdminCredentials.email
            password = $superAdminCredentials.password
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
        $script:authToken = $response.token
        
        Write-Log "Login successful. Token received." -level "SUCCESS"
        Write-Log "User info: $($response.user | ConvertTo-Json -Compress)" -level "INFO"
        return $true
    }
    catch {
        Write-Log "Login failed: $_" -level "ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Log "Response: $($_.ErrorDetails.Message)" -level "ERROR"
        }
        return $false
    }
}

function Create-Invitation {
    param (
        [hashtable]$invitationData
    )
    
    Write-Log "Creating invitation for $($invitationData.email) with role $($invitationData.role)..." -level "INFO"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $authToken"
            "Content-Type" = "application/json"
        }
        
        $body = $invitationData | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/invite" -Method Post -Headers $headers -Body $body
        $invitationId = $response.invitation.id
        $script:invitationIds += $invitationId
        
        Write-Log "Invitation created successfully. ID: $invitationId" -level "SUCCESS"
        Write-Log "Invitation details: $($response.invitation | ConvertTo-Json -Compress)" -level "INFO"
        
        return $invitationId
    }
    catch {
        Write-Log "Failed to create invitation: $_" -level "ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Log "Response: $($_.ErrorDetails.Message)" -level "ERROR"
        }
        return $null
    }
}

function Get-Invitations {
    Write-Log "Retrieving all invitations..." -level "INFO"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $authToken"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/invite" -Method Get -Headers $headers
        Write-Log "Retrieved $(($response.invitations).Count) invitations" -level "SUCCESS"
        
        # Write detailed info to log file only (could be large)
        Write-Log "All invitations: $($response.invitations | ConvertTo-Json)" -level "INFO" -noConsole
        
        return $response.invitations
    }
    catch {
        Write-Log "Failed to retrieve invitations: $_" -level "ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Log "Response: $($_.ErrorDetails.Message)" -level "ERROR"
        }
        return $null
    }
}

function Get-InvitationById {
    param (
        [string]$id
    )
    
    Write-Log "Retrieving invitation with ID: $id..." -level "INFO"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $authToken"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/invite/$id" -Method Get -Headers $headers
        Write-Log "Retrieved invitation details successfully" -level "SUCCESS"
        Write-Log "Invitation details: $($response | ConvertTo-Json -Compress)" -level "INFO"
        
        return $response
    }
    catch {
        Write-Log "Failed to retrieve invitation: $_" -level "ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Log "Response: $($_.ErrorDetails.Message)" -level "ERROR"
        }
        return $null
    }
}

function Revoke-Invitation {
    param (
        [string]$id
    )
    
    Write-Log "Revoking invitation with ID: $id..." -level "INFO"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $authToken"
        }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/invite/$id" -Method Delete -Headers $headers
        Write-Log "Invitation revoked successfully" -level "SUCCESS"
        Write-Log "Response: $($response | ConvertTo-Json -Compress)" -level "INFO"
        
        return $true
    }
    catch {
        Write-Log "Failed to revoke invitation: $_" -level "ERROR"
        if ($_.ErrorDetails.Message) {
            Write-Log "Response: $($_.ErrorDetails.Message)" -level "ERROR"
        }
        return $false
    }
}

function Test-InvalidInvitations {
    Write-Log "Testing invalid invitation scenarios..." -level "INFO"
    
    # Test duplicate email
    try {
        $duplicateInvitation = $testInvitations[0].Clone()
        $headers = @{
            "Authorization" = "Bearer $authToken"
            "Content-Type" = "application/json"
        }
        
        $body = $duplicateInvitation | ConvertTo-Json
        
        Write-Log "Testing duplicate email invitation..." -level "INFO"
        $response = Invoke-RestMethod -Uri "$baseUrl/invite" -Method Post -Headers $headers -Body $body
        Write-Log "Expected duplicate email to fail, but it succeeded" -level "WARNING"
    }
    catch {
        Write-Log "Duplicate email correctly rejected: $_" -level "SUCCESS"
    }
    
    # Test invalid role
    try {
        $invalidRoleInvitation = @{
            email = "invalid-role-$timestamp@example.com"
            name = "Invalid Role User"
            role = "INVALID_ROLE"
            message = "Test with invalid role"
        }
        
        $body = $invalidRoleInvitation | ConvertTo-Json
        
        Write-Log "Testing invalid role invitation..." -level "INFO"
        $response = Invoke-RestMethod -Uri "$baseUrl/invite" -Method Post -Headers $headers -Body $body
        Write-Log "Expected invalid role to fail, but it succeeded" -level "WARNING"
    }
    catch {
        Write-Log "Invalid role correctly rejected: $_" -level "SUCCESS"
    }
    
    # Test missing required fields
    try {
        $missingFieldsInvitation = @{
            name = "Missing Email User"
            role = "CUSTOMER"
        }
        
        $body = $missingFieldsInvitation | ConvertTo-Json
        
        Write-Log "Testing invitation with missing required fields..." -level "INFO"
        $response = Invoke-RestMethod -Uri "$baseUrl/invite" -Method Post -Headers $headers -Body $body
        Write-Log "Expected missing fields to fail, but it succeeded" -level "WARNING"
    }
    catch {
        Write-Log "Missing fields correctly rejected: $_" -level "SUCCESS"
    }
}

function Test-InvitationFlow {
    param (
        [hashtable]$invitation
    )
    
    # Create invitation
    $invitationId = Create-Invitation -invitationData $invitation
    if (-not $invitationId) {
        Write-Log "Skipping further tests for this invitation as creation failed" -level "WARNING"
        return $false
    }
    
    # Get invitation details
    $invitationDetails = Get-InvitationById -id $invitationId
    if (-not $invitationDetails) {
        Write-Log "Could not retrieve invitation details" -level "ERROR"
        return $false
    }
    
    # Verify invitation details match what we sent
    $matchesEmail = $invitationDetails.invitation.email -eq $invitation.email
    $matchesRole = $invitationDetails.invitation.role -eq $invitation.role
    $matchesName = $invitationDetails.invitation.name -eq $invitation.name
    
    if ($matchesEmail -and $matchesRole -and $matchesName) {
        Write-Log "Invitation details match the submitted data" -level "SUCCESS"
    }
    else {
        Write-Log "Invitation details do not match the submitted data" -level "ERROR"
        Write-Log "Expected: $($invitation | ConvertTo-Json -Compress)" -level "ERROR"
        Write-Log "Actual: $($invitationDetails.invitation | ConvertTo-Json -Compress)" -level "ERROR"
        return $false
    }
    
    # Verify token and expiration date are set
    if (-not [string]::IsNullOrEmpty($invitationDetails.invitation.token) -and 
        $invitationDetails.invitation.expiresAt) {
        Write-Log "Invitation has a token and expiration date" -level "SUCCESS"
    }
    else {
        Write-Log "Invitation is missing token or expiration date" -level "ERROR"
        return $false
    }
    
    # For one test, try to revoke the invitation
    if ($invitation.role -eq "CUSTOMER") {
        $revokeResult = Revoke-Invitation -id $invitationId
        if ($revokeResult) {
            Write-Log "Successfully revoked invitation" -level "SUCCESS"
            
            # Verify invitation is revoked
            $invitationAfterRevoke = Get-InvitationById -id $invitationId
            if ($invitationAfterRevoke -and $invitationAfterRevoke.invitation.status -eq "REVOKED") {
                Write-Log "Invitation status correctly updated to REVOKED" -level "SUCCESS"
            }
            else {
                Write-Log "Invitation status not updated after revocation" -level "ERROR"
                return $false
            }
        }
        else {
            Write-Log "Failed to revoke invitation" -level "ERROR"
            return $false
        }
    }
    
    return $true
}

function Run-Tests {
    Write-Log "Starting invitation tests at $(Get-Date)" -level "INFO"
    
    # Test server health
    if (-not (Test-ServerHealth)) {
        Write-Log "Aborting tests as server is not healthy" -level "ERROR"
        return
    }
    
    # Login to get auth token
    if (-not (Test-Login)) {
        Write-Log "Aborting tests as login failed" -level "ERROR"
        return
    }
    
    # Get current invitations (before test)
    $initialInvitations = Get-Invitations
    
    # Run tests for each test invitation
    foreach ($invitation in $testInvitations) {
        $result = Test-InvitationFlow -invitation $invitation
        if ($result) {
            Write-Log "Invitation flow test PASSED for $($invitation.email)" -level "SUCCESS"
        }
        else {
            Write-Log "Invitation flow test FAILED for $($invitation.email)" -level "ERROR"
        }
    }
    
    # Test invalid invitation scenarios
    Test-InvalidInvitations
    
    # Get final invitations (after tests)
    $finalInvitations = Get-Invitations
    
    # Calculate difference
    if ($initialInvitations -and $finalInvitations) {
        $newCount = ($finalInvitations).Count - ($initialInvitations).Count
        Write-Log "Created $newCount new invitations during testing" -level "INFO"
    }
    
    Write-Log "All invitation tests completed at $(Get-Date)" -level "INFO"
    Write-Log "See log file for details: $logFile" -level "INFO"
}

# Execute tests
Run-Tests 