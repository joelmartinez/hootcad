#!/usr/bin/env pwsh
# PowerShell script to generate roughness map texture

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$jsScript = Join-Path $scriptPath "generate-roughness-map.js"

Write-Host "HootCAD - Roughness Map Generator" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "Using Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Run the generator script
Push-Location $projectRoot
try {
    node $jsScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Success! The roughness map is ready to use." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "ERROR: Script execution failed" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
