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
