# RaaS Platform Test Runner
# This script runs automated tests for the RaaS Solar platform

# Display welcome message
Write-Host "RaaS Platform Testing Suite" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
Write-Host "This script will run automated tests for the RaaS Solar platform."
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js before running this script." -ForegroundColor Red
    exit 1
}

# Check if the app is running
$appRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $appRunning = $true
        Write-Host "RaaS application is running at http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "Warning: RaaS application does not appear to be running at http://localhost:3000" -ForegroundColor Yellow
    $startApp = Read-Host "Would you like to start the application now? (y/n)"
    if ($startApp -eq "y") {
        Write-Host "Starting RaaS application in a new window..." -ForegroundColor Cyan
        Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$PSScriptRoot'; npm run dev"
        Write-Host "Waiting 10 seconds for the application to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
    } else {
        Write-Host "Some tests may fail if the application is not running." -ForegroundColor Yellow
    }
}

# Check if required test scripts exist
$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath "scripts\raas-test-suite.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: Test script not found at: $scriptPath" -ForegroundColor Red
    exit 1
}

# Menu
function Show-Menu {
    Write-Host ""
    Write-Host "Select a test to run:" -ForegroundColor Cyan
    Write-Host "1. Run Installation Simulator"
    Write-Host "2. Run UI Test Suite"
    Write-Host "3. Run All Tests"
    Write-Host "4. Exit"
    Write-Host ""
}

function Run-InstallationSimulator {
    Write-Host "Running Installation Simulator..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\scripts"
    node installation-simulator.js
    Set-Location -Path $PSScriptRoot
}

function Run-TestSuite {
    Write-Host "Running UI Test Suite..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\scripts"
    node raas-test-suite.js
    Set-Location -Path $PSScriptRoot
}

function Run-AllTests {
    Write-Host "Running All Tests..." -ForegroundColor Cyan
    Set-Location -Path "$PSScriptRoot\scripts"
    node run-tests.js
    Set-Location -Path $PSScriptRoot
}

# Main loop
$running = $true
while ($running) {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-4)"
    
    switch ($choice) {
        "1" {
            Run-InstallationSimulator
        }
        "2" {
            Run-TestSuite
        }
        "3" {
            Run-AllTests
        }
        "4" {
            $running = $false
            Write-Host "Exiting..." -ForegroundColor Cyan
        }
        default {
            Write-Host "Invalid option. Please try again." -ForegroundColor Red
        }
    }
    
    if ($running) {
        Write-Host ""
        $continue = Read-Host "Press Enter to continue..."
    }
}

Write-Host "Test runner completed." -ForegroundColor Green 