$ErrorActionPreference = 'Stop'
$consoleRoot = Split-Path -Parent $PSScriptRoot
Set-Location $consoleRoot
$staticSource = Join-Path $consoleRoot 'src\razor_console\static'

uv sync --extra desktop --group build
if ($LASTEXITCODE -ne 0) { throw 'Dependency synchronization failed.' }
uv run --extra desktop --group build pyinstaller `
    --noconfirm `
    --clean `
    --windowed `
    --onedir `
    --name RazorConsole `
    --icon "$staticSource\razor.ico" `
    --specpath build `
    --paths src `
    --add-data "$staticSource;razor_console/static" `
    --collect-all webview `
    desktop.py
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }

Write-Output "Desktop build created at: $consoleRoot\dist\RazorConsole\RazorConsole.exe"
