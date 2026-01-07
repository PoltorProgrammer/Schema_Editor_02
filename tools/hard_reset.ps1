$repoUrl = "https://github.com/PoltorProgrammer/Schema_Editor_02"
$currentDir = Get-Location

Write-Host "--- MediXtract Schema Editor HARD RESET ---" -ForegroundColor Red
Write-Host "WARNING: This will DELETE ALL LOCAL DATA (projects, ignored files, etc.)" -ForegroundColor Yellow
Write-Host "Press any key to confirm and wipe everything..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 1. Check for Git
if (Test-Path (Join-Path $currentDir ".git")) {
    Write-Host "[GIT MODE] Git repository detected. Reseting..." -ForegroundColor Red
    
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Fetching latest version from GitHub..."
        git fetch origin
        
        Write-Host "Resetting tracked files to match origin/main..."
        git reset --hard origin/main
        
        # Explicitly NUKE the projects folder and docs folder
        if (Test-Path "$currentDir\projects") {
            Write-Host "Manually deleting projects folder..."
            Remove-Item -Path "$currentDir\projects" -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path "$currentDir\docs") {
            Write-Host "Manually deleting docs folder..."
            Remove-Item -Path "$currentDir\docs" -Recurse -Force -ErrorAction SilentlyContinue
        }

        Write-Host "WIPING ALL UNTRACKED FILES (Including projects folder)..."
        git clean -fdx
        
        Write-Host "`nHard Reset Complete!" -ForegroundColor Green

        # Self-Destruct this script and the BAT file
        Write-Host "Cleaning up reset tools..." -ForegroundColor Gray
        $batPath = Join-Path $currentDir "Factory Reset.bat"
        if (Test-Path $batPath) { Remove-Item $batPath -Force }
        
        # We can't delete the running script directly while it's executing easily in PS without errors,
        # but since 'git clean -fdx' ran above, it MIGHT have already deleted them if they weren't ignored? 
        # But they ARE tracked right now. 
        # Wait, if they are tracked, 'git clean' won't touch them.
        # But the user wants them gone.
        
    } else {
        Write-Host "[ERROR] Git not found in PATH. Proceeding with ZIP-based reset..." -ForegroundColor Yellow
        $useZip = $true
    }
} else {
     Write-Host "[NO GIT] Not a git repository. Proceeding with ZIP-based reset..." -ForegroundColor Yellow
     $useZip = $true
}

if ($useZip) {
    # ZIP MODE FACTORY RESET
    $zipUrl = "$repoUrl/archive/refs/heads/main.zip"
    $zipFile = Join-Path $env:TEMP "MediXtract_FactoryResult_$(Get-Date -Format 'yyyyMMddHHmmss').zip"
    $tempExtract = Join-Path $env:TEMP "MediXtract_Extract_$(Get-Date -Format 'yyyyMMddHHmmss')"

    try {
        Write-Host "Downloading latest version from GitHub..."
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
        
        Write-Host "Wiping local directory (Preserving updater temporarily)..."
        # Delete everything except 'tools' folder (where we are running) and the bat file
        Get-ChildItem -Path $currentDir | Where-Object { 
            $_.Name -ne "tools" -and $_.Name -ne "Factory Reset.bat" 
        } | Remove-Item -Recurse -Force
        
        Write-Host "Extracting clean files..."
        Expand-Archive -Path $zipFile -DestinationPath $tempExtract -Force
        
        $sourceDir = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
        
        # Move files to root
        Get-ChildItem -Path $sourceDir.FullName | Copy-Item -Destination $currentDir -Recurse -Force
        
        Write-Host "Factory Reset Complete (ZIP mode)!" -ForegroundColor Green
        
    } catch {
        Write-Host "[ERROR] ZIP Reset failed: $($_.Exception.Message)" -ForegroundColor Red
        pause
        exit
    } finally {
        if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
        if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
    }
}

# Self-Destruct this script and the BAT file
Write-Host "Cleaning up reset tools..." -ForegroundColor Gray
$batPath = Join-Path $currentDir "Factory Reset.bat"
if (Test-Path $batPath) { Remove-Item $batPath -Force }

# Delete this script (the caller BAT will fail on exit but that is fine)
Remove-Item $MyInvocation.MyCommand.Path -Force

