function Check-NodeJS {
    Write-Host "🔍 Checking for Node.js..." -ForegroundColor Cyan
    $node = Get-Command node -ErrorAction SilentlyContinue
    
    if (-not $node) {
        Write-Host "❌ Node.js is not installed!" -ForegroundColor Yellow
        $choice = Read-Host "Would you like to install Node.js automatically? (Y/N)"
        if ($choice -eq 'Y' -or $choice -eq 'y') {
            if (Get-Command winget -ErrorAction SilentlyContinue) {
                Write-Host "🚀 Installing Node.js via winget..." -ForegroundColor Green
                winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
                Write-Host "✅ Node.js installation started. You may need to restart this script after it completes." -ForegroundColor Green
                pause
                exit
            } else {
                Write-Host "🌐 Opening Node.js download page..." -ForegroundColor Green
                Start-Process "https://nodejs.org/"
                Write-Host "Please install Node.js and run this script again."
                pause
                exit
            }
        } else {
            Write-Host "⚠️ Warning: The application requires Node.js to run folder discovery." -ForegroundColor Yellow
        }
    } else {
        $version = node -v
        Write-Host "✅ Node.js found: $version" -ForegroundColor Green
    }
}

Check-NodeJS

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Schema Editor.lnk"

# Paths relative to the script location
$ToolsPath = Split-Path $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path $ToolsPath
$TargetPath = Join-Path $ToolsPath "start_app.bat"
$IconPath = Join-Path $ToolsPath "MediXtract-Circular-logo.ico"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"$TargetPath`""
$Shortcut.WorkingDirectory = $ProjectPath
$Shortcut.IconLocation = $IconPath
$Shortcut.Description = "Launch MediXtract Schema Editor"
$Shortcut.Save()

Write-Host "✅ Shortcut created on Desktop with custom icon!" -ForegroundColor Green
