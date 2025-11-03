# 🌟 Nucleus 3.0 Unified Launch Script
# مشغل النظام الموحد الشامل

Write-Host "🌟 Nucleus 3.0 - Unified Nicholas Empire System" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Nucleus directory" -ForegroundColor Yellow
    Write-Host "Example: cd c:\Nucleus\Nucleus" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Current Directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Check ports
Write-Host "🔍 Checking ports..." -ForegroundColor Yellow
$ports = @{
    "Nicholas Core" = 5000
    "Empire Runner" = 3001  
    "Unified API" = 8000
    "Client App" = 3000
}

foreach ($service in $ports.GetEnumerator()) {
    if (Test-Port $service.Value) {
        Write-Host "⚠️  Port $($service.Value) ($($service.Key)) is already in use" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Port $($service.Value) ($($service.Key)) is available" -ForegroundColor Green
    }
}
Write-Host ""

# Check Node.js
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm dependencies
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}
Write-Host ""

# Check database
Write-Host "🔍 Checking database..." -ForegroundColor Yellow
if (-not (Test-Path "nucleus.db") -and -not (Test-Path "database.db")) {
    Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to setup database!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Database setup completed" -ForegroundColor Green
} else {
    Write-Host "✅ Database file found" -ForegroundColor Green
}
Write-Host ""

# Launch options
Write-Host "🚀 Launch Options:" -ForegroundColor Cyan
Write-Host "1. 🌟 Complete Unified System (Recommended)" -ForegroundColor White
Write-Host "2. 🏛️  Nicholas Core Only" -ForegroundColor White  
Write-Host "3. ⚛️  Professional AI Only" -ForegroundColor White
Write-Host "4. 🧪 Test Suite" -ForegroundColor White
Write-Host "5. 📊 System Status Check" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose an option (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🌟 Launching Complete Unified System..." -ForegroundColor Cyan
        Write-Host "This will start:" -ForegroundColor Yellow
        Write-Host "  • Nicholas Core (port 5000)" -ForegroundColor White
        Write-Host "  • Professional AI Core" -ForegroundColor White
        Write-Host "  • Empire Runner (port 3001)" -ForegroundColor White
        Write-Host "  • Unified API Gateway (port 8000)" -ForegroundColor White
        Write-Host ""
        Write-Host "🎯 Access points after launch:" -ForegroundColor Green
        Write-Host "  • Nicholas Core: http://localhost:5000" -ForegroundColor White
        Write-Host "  • Unified API: http://localhost:8000" -ForegroundColor White
        Write-Host "  • Empire Management: http://localhost:3001" -ForegroundColor White
        Write-Host ""
        
        # Set environment variables
        $env:NODE_ENV = "development"
        $env:UNIFIED_MODE = "true"
        
        Write-Host "🔄 Starting unified system..." -ForegroundColor Yellow
        npm run unified
    }
    
    "2" {
        Write-Host ""
        Write-Host "🏛️ Launching Nicholas Core Only..." -ForegroundColor Cyan
        Write-Host "This will start Nicholas AI server on port 5000" -ForegroundColor Yellow
        Write-Host ""
        
        $env:NODE_ENV = "development"
        npm run nicholas
    }
    
    "3" {
        Write-Host ""
        Write-Host "⚛️ Launching Professional AI Core Only..." -ForegroundColor Cyan
        Write-Host "This will start the advanced AI system with:" -ForegroundColor Yellow
        Write-Host "  • Quantum Consciousness Engine" -ForegroundColor White
        Write-Host "  • Advanced AI Intelligence Hub" -ForegroundColor White
        Write-Host "  • Intelligent Monitoring Matrix" -ForegroundColor White
        Write-Host "  • Universal Integration Orchestrator" -ForegroundColor White
        Write-Host "  • Simplified Security Fortress" -ForegroundColor White
        Write-Host ""
        
        npm run ai
    }
    
    "4" {
        Write-Host ""
        Write-Host "🧪 Running Test Suite..." -ForegroundColor Cyan
        Write-Host "This will test all system components" -ForegroundColor Yellow
        Write-Host ""
        
        npm run test:complete
    }
    
    "5" {
        Write-Host ""
        Write-Host "📊 Checking System Status..." -ForegroundColor Cyan
        Write-Host ""
        
        # Check if Nicholas Core is running
        if (Test-Port 5000) {
            Write-Host "✅ Nicholas Core is running (port 5000)" -ForegroundColor Green
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5000/api/status" -TimeoutSec 5
                Write-Host "✅ Nicholas API is responding" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Nicholas Core port is open but API not responding" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Nicholas Core is not running (port 5000)" -ForegroundColor Red
        }
        
        # Check Unified API
        if (Test-Port 8000) {
            Write-Host "✅ Unified API is running (port 8000)" -ForegroundColor Green
        } else {
            Write-Host "❌ Unified API is not running (port 8000)" -ForegroundColor Red
        }
        
        # Check Empire Runner
        if (Test-Port 3001) {
            Write-Host "✅ Empire Runner is running (port 3001)" -ForegroundColor Green
        } else {
            Write-Host "❌ Empire Runner is not running (port 3001)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "💡 To start the system, run: PowerShell -ExecutionPolicy Bypass -File start-nucleus-unified.ps1" -ForegroundColor Yellow
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice. Please run the script again and choose 1-5." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Script completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Quick commands for next time:" -ForegroundColor Cyan
Write-Host "  npm run unified      # Complete system" -ForegroundColor White
Write-Host "  npm run nicholas     # Nicholas Core only" -ForegroundColor White
Write-Host "  npm run ai          # Professional AI only" -ForegroundColor White
Write-Host "  npm run test:complete # Test everything" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  README-UNIFIED.md    # Main unified guide" -ForegroundColor White
Write-Host "  UNIFIED-NICHOLAS-PROJECT.md # Technical details" -ForegroundColor White
Write-Host ""