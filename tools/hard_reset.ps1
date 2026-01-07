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
    } else {
        Write-Host "[ERROR] Git not found in PATH." -ForegroundColor Red
    }
} else {
     Write-Host "[ERROR] Not a git repository. Cannot perform hard reset." -ForegroundColor Red
}
