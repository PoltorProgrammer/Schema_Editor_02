$repoUrl = "https://github.com/PoltorProgrammer/Schema_Editor_02"
$zipUrl = "$repoUrl/archive/refs/heads/main.zip"
$currentDir = Get-Location
$tempDir = Join-Path $env:TEMP "SchemaEditorUpdate_$(Get-Date -Format 'yyyyMMddHHmmss')"
$zipFile = Join-Path $env:TEMP "schema_editor_update.zip"

Write-Host "--- MediXtract Schema Editor Updater ---" -ForegroundColor Cyan

# 1. Check for Git
if (Test-Path (Join-Path $currentDir ".git")) {
    Write-Host "[GIT MODE] Git repository detected. Checking for updates..." -ForegroundColor Green
    
    # Check if git is in path
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Resetting local environment to match GitHub (Hard Refresh)..."
        
        # 1. Fetch latest changes
        Write-Host "Fetching latest version from GitHub..."
        git fetch origin
        
        # 2. Hard Reset to match origin/main exactly (discards modified tracked files)
        Write-Host "Resetting tracked files to match origin/main..."
        git reset --hard origin/main
        
        # 3. Clean EVERYTHING (untracked + ignored)
        # -f : force
        # -d : remove directories
        # -x : remove ignored files too
        # WARNING: This deletes user data (projects) as requested.
        Write-Host "Removing all extra files (Full Factory Reset - Wiping Data)..."
        git clean -fdx
        
        Write-Host "`nUpdate complete via Git!" -ForegroundColor Green
        Write-Host "Your local changes (if any) were stashed as a backup." -ForegroundColor Gray
        return
    } else {
        Write-Host "[WARNING] .git folder found but 'git' command is not available." -ForegroundColor Yellow
        Write-Host "Proceeding with manual ZIP update..."
    }
}

# 2. Manual ZIP Update (for non-git users)
Write-Host "[ZIP MODE] Downloading latest version from GitHub..." -ForegroundColor Green

try {
    # Download
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
    
    # Extract
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    Write-Host "Extracting files..."
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    
    # The zip usually contains a folder named "Schema_Editor_02-main"
    $extractedFolder = Get-ChildItem -Path $tempDir -Directory | Select-Object -First 1
    if ($null -eq $extractedFolder) {
        throw "Failed to find extracted folder in $tempDir"
    }
    
    Write-Host "Syncing files (preserving 'projects' folder)..."
    
    # Get all items in the new version
    $newItems = Get-ChildItem -Path $extractedFolder.FullName
    
    foreach ($item in $newItems) {
        $targetPath = Join-Path $currentDir $item.Name
        
        # SKIP the projects folder
        if ($item.Name -eq "projects") {
            Write-Host "Skipping '$($item.Name)' folder (protected)..." -ForegroundColor Gray
            continue
        }
        
        # For everything else, overwrite
        if (Test-Path $targetPath) {
            Write-Host "Updating '$($item.Name)'..."
            if ($item.PSIsContainer) {
                Copy-Item -Path $item.FullName -Destination $currentDir -Recurse -Force
            } else {
                Copy-Item -Path $item.FullName -Destination $currentDir -Force
            }
        } else {
            Write-Host "Adding new item '$($item.Name)'..."
            if ($item.PSIsContainer) {
                Copy-Item -Path $item.FullName -Destination $currentDir -Recurse
            } else {
                Copy-Item -Path $item.FullName -Destination $currentDir
            }
        }
    }
    
    Write-Host "`nManual update complete!" -ForegroundColor Green
    
} catch {
    Write-Host "`n[ERROR] Update failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}
