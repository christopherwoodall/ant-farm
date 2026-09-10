<#
.SYNOPSIS
    Ant Farm - Cross-Platform Build & Development Automation Script

.DESCRIPTION
    Manages dependency installation, running the desktop application, code syntax checks,
    and packaging standalone desktop applications for Windows, macOS, and Linux.

.PARAMETER Target
    The command/target to execute. If omitted or set to 'help', the help message is displayed.

.EXAMPLE
    .\build.ps1
    Displays the help message.

.EXAMPLE
    .\build.ps1 setup
    Installs project dependencies into node_modules.

.EXAMPLE
    .\build.ps1 build-win
    Packages the application into a standalone Windows x64 executable in dist/.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Target = "help",

    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location -Path $ProjectRoot

# ------------------------------------------------------------------------------
# Helper: Display Help Menu
# ------------------------------------------------------------------------------
function Show-Help {
    Write-Host ""
    Write-Host "[*] Ant Farm - Build & Automation Script (PowerShell)" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor DarkCyan
    Write-Host "Usage: .\build.ps1 <command> [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available Commands:" -ForegroundColor White
    Write-Host "  help          " -NoNewline -ForegroundColor Green
    Write-Host "Display this help message (default when run without arguments)"
    Write-Host "  setup         " -NoNewline -ForegroundColor Green
    Write-Host "Install all dependencies into local node_modules (npm install)"
    Write-Host "  install       " -NoNewline -ForegroundColor Green
    Write-Host "Alias for 'setup'"
    Write-Host "  run           " -NoNewline -ForegroundColor Green
    Write-Host "Launch the Ant Farm desktop application"
    Write-Host "  start         " -NoNewline -ForegroundColor Green
    Write-Host "Alias for 'run'"
    Write-Host "  dev           " -NoNewline -ForegroundColor Green
    Write-Host "Launch the Ant Farm app in developer mode (with DevTools)"
    Write-Host "  check         " -NoNewline -ForegroundColor Green
    Write-Host "Validate JavaScript syntax across all project files"
    Write-Host "  test          " -NoNewline -ForegroundColor Green
    Write-Host "Alias for 'check'"
    Write-Host "  build-win     " -NoNewline -ForegroundColor Green
    Write-Host "Package standalone desktop app for Windows (x64) into dist/"
    Write-Host "  build-mac     " -NoNewline -ForegroundColor Green
    Write-Host "Package standalone desktop app for macOS (x64 & arm64) into dist/"
    Write-Host "  build-linux   " -NoNewline -ForegroundColor Green
    Write-Host "Package standalone desktop app for Linux (x64) into dist/"
    Write-Host "  build-all     " -NoNewline -ForegroundColor Green
    Write-Host "Package standalone apps for all three OS platforms into dist/"
    Write-Host "  clean         " -NoNewline -ForegroundColor Green
    Write-Host "Remove build artifacts (dist/ directory)"
    Write-Host "  clean-all     " -NoNewline -ForegroundColor Green
    Write-Host "Remove build artifacts and node_modules (dist/ and node_modules/)"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\build.ps1                  # Print this help message" -ForegroundColor Gray
    Write-Host "  .\build.ps1 setup            # Download and install dependencies" -ForegroundColor Gray
    Write-Host "  .\build.ps1 check            # Run JavaScript syntax validation" -ForegroundColor Gray
    Write-Host "  .\build.ps1 run              # Start desktop simulation" -ForegroundColor Gray
    Write-Host "  .\build.ps1 build-win        # Package standalone Windows app" -ForegroundColor Gray
    Write-Host "  .\build.ps1 build-all        # Package for Windows, macOS, Linux" -ForegroundColor Gray
    Write-Host ""
}

# ------------------------------------------------------------------------------
# Helper: Ensure Node.js and npm are on PATH
# ------------------------------------------------------------------------------
function Ensure-NodeEnvironment {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue

    if (-not $nodeCmd -or -not $npmCmd) {
        $candidatePaths = @(
            "C:\Users\chris\AppData\Local\trunk\tools\node\22.16.0-12da8a4c27b144aedaf7d975e067667c",
            "$env:LOCALAPPDATA\trunk\tools\node\22.16.0-12da8a4c27b144aedaf7d975e067667c",
            "$env:ProgramFiles\nodejs",
            "$env:LOCALAPPDATA\Programs\node"
        )

        $trunkNodeDir = Get-ChildItem -Path "$env:LOCALAPPDATA\trunk\tools\node" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
        if ($trunkNodeDir) {
            $candidatePaths += $trunkNodeDir
        }

        foreach ($p in $candidatePaths) {
            if ($p -and (Test-Path "$p\node.exe") -and (Test-Path "$p\npm.cmd")) {
                $env:PATH = "$p;$env:PATH"
                Write-Host " [Node.js resolved: $p]" -ForegroundColor DarkGray
                return
            }
        }

        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Write-Error "Node.js was not found on your system. Please install Node.js (https://nodejs.org) or add it to PATH."
            exit 1
        }
    }
}

# ------------------------------------------------------------------------------
# Main Dispatcher
# ------------------------------------------------------------------------------
if ($Help -or ($Target -eq "help") -or [string]::IsNullOrWhiteSpace($Target)) {
    Show-Help
    exit 0
}

Ensure-NodeEnvironment

$command = $Target.ToLowerInvariant()

if ($command -eq "setup" -or $command -eq "install") {
    Write-Host "Installing Ant Farm dependencies into node_modules..." -ForegroundColor Cyan
    & npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Dependencies installed successfully." -ForegroundColor Green
    } else {
        Write-Error "Dependency installation failed with code $LASTEXITCODE."
    }
}
elseif ($command -eq "run" -or $command -eq "start") {
    Write-Host "Launching Ant Farm desktop companion..." -ForegroundColor Cyan
    & npm start
}
elseif ($command -eq "dev") {
    Write-Host "Launching Ant Farm in developer mode..." -ForegroundColor Cyan
    & npm run dev
}
elseif ($command -eq "check" -or $command -eq "test") {
    Write-Host "Validating project syntax..." -ForegroundColor Cyan
    & node scripts/check-syntax.js
}
elseif ($command -eq "build-win") {
    Write-Host "Packaging standalone application for Windows (x64)..." -ForegroundColor Cyan
    & npm run build:win
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Windows build complete: dist/Ant Farm-win32-x64/" -ForegroundColor Green
    } else {
        Write-Error "Windows packaging failed with code $LASTEXITCODE."
    }
}
elseif ($command -eq "build-mac") {
    Write-Host "Packaging standalone application for macOS (Universal: x64 & arm64)..." -ForegroundColor Cyan
    & npm run build:mac
    if ($LASTEXITCODE -eq 0) {
        Write-Host "macOS build complete in dist/" -ForegroundColor Green
    } else {
        Write-Error "macOS packaging failed with code $LASTEXITCODE."
    }
}
elseif ($command -eq "build-linux") {
    Write-Host "Packaging standalone application for Linux (x64)..." -ForegroundColor Cyan
    & npm run build:linux
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Linux build complete: dist/Ant Farm-linux-x64/" -ForegroundColor Green
    } else {
        Write-Error "Linux packaging failed with code $LASTEXITCODE."
    }
}
elseif ($command -eq "build-all") {
    Write-Host "Packaging standalone applications for Windows, macOS, and Linux..." -ForegroundColor Cyan
    & npm run build:all
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Multi-platform builds complete! Check dist/ directory." -ForegroundColor Green
    } else {
        Write-Error "Multi-platform packaging failed with code $LASTEXITCODE."
    }
}
elseif ($command -eq "clean") {
    Write-Host "Cleaning dist/ directory..." -ForegroundColor Cyan
    $distPath = Join-Path $ProjectRoot "dist"
    if (Test-Path $distPath) {
        try {
            Remove-Item -Path $distPath -Recurse -Force
            Write-Host "Removed dist/" -ForegroundColor Green
        } catch {
            Write-Warning "Could not completely remove dist/. If Ant Farm is currently running, close the app and try again."
        }
    } else {
        Write-Host "dist/ does not exist. Nothing to clean." -ForegroundColor Gray
    }
}
elseif ($command -eq "clean-all") {
    Write-Host "Cleaning dist/ and node_modules/ directories..." -ForegroundColor Cyan
    $distPath = Join-Path $ProjectRoot "dist"
    $modulesPath = Join-Path $ProjectRoot "node_modules"
    if (Test-Path $distPath) {
        try {
            Remove-Item -Path $distPath -Recurse -Force
            Write-Host "Removed dist/" -ForegroundColor Green
        } catch {
            Write-Warning "Could not completely remove dist/. If Ant Farm is currently running, close the app and try again."
        }
    }
    if (Test-Path $modulesPath) {
        try {
            Remove-Item -Path $modulesPath -Recurse -Force
            Write-Host "Removed node_modules/" -ForegroundColor Green
        } catch {
            Write-Warning "Could not remove node_modules/: $_"
        }
    }
    Write-Host "Clean-all complete." -ForegroundColor Green
}
else {
    Write-Host "Unknown command: '$Target'" -ForegroundColor Red
    Write-Host ""
    Show-Help
    exit 1
}
