param([ValidateSet('Install', 'Uninstall', 'Start')][string]$Action = 'Install')
$ErrorActionPreference = 'Stop'
$consoleRoot = Split-Path -Parent $PSScriptRoot
$pythonWindowless = Join-Path $consoleRoot '.venv\Scripts\pythonw.exe'
$launcher = Join-Path $PSScriptRoot 'start-console.py'
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Razor Console.lnk'

if ($Action -eq 'Uninstall') {
    if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath }
    Write-Output 'Console autostart removed. Running instances are unchanged.'
    exit
}
if (!(Test-Path -LiteralPath $pythonWindowless)) {
    throw 'Run uv sync in the Razor-Console directory first.'
}
if ($Action -eq 'Start') {
    Start-Process -FilePath $pythonWindowless -ArgumentList ('"{0}"' -f $launcher) -WorkingDirectory $consoleRoot -WindowStyle Hidden
    exit
}
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $pythonWindowless
$shortcut.Arguments = '"{0}"' -f $launcher
$shortcut.WorkingDirectory = $consoleRoot
$shortcut.Description = 'Start Razor Console in the background at Windows login'
$shortcut.Save()
Write-Output "Console autostart installed: $shortcutPath"
