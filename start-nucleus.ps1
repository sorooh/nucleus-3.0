# Start Nucleus 3.0
Write-Host "Starting Nucleus 3.0..." -ForegroundColor Green
Set-Location "C:\Nucleus\Nucleus"
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host "Checking package.json..." -ForegroundColor Cyan
if (Test-Path "package.json") {
    Write-Host "package.json found!" -ForegroundColor Green
    Write-Host "Setting environment..." -ForegroundColor Cyan
    $env:NODE_ENV = "development"
    Write-Host "Running Nucleus..." -ForegroundColor Yellow
    npm run dev
} else {
    Write-Host "package.json not found!" -ForegroundColor Red
    Get-ChildItem
}