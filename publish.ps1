[CmdletBinding()]
param(
    [string] $Message = "Update PMS prototype"
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path $PSScriptRoot).Path
$publishRoot = Join-Path $projectRoot 'pub'

& (Join-Path $projectRoot 'scripts\publish\update-pub.ps1')

if (-not (Test-Path -LiteralPath (Join-Path $publishRoot '.git'))) {
    throw 'The pub directory is not connected to the GitHub repository.'
}

$internetSettingsPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$internetSettings = Get-ItemProperty -Path $internetSettingsPath -ErrorAction SilentlyContinue
if ($internetSettings.ProxyEnable -eq 1 -and $internetSettings.ProxyServer) {
    $proxyServer = [string] $internetSettings.ProxyServer
    if ($proxyServer -match '(?:^|;)https=([^;]+)') {
        $proxyServer = $Matches[1]
    }
    elseif ($proxyServer -match '(?:^|;)http=([^;]+)') {
        $proxyServer = $Matches[1]
    }

    if ($proxyServer -notmatch '^https?://') {
        $proxyServer = "http://$proxyServer"
    }

    git -C $publishRoot config http.proxy $proxyServer
    git -C $publishRoot config https.proxy $proxyServer
}
else {
    git -C $publishRoot config --unset-all http.proxy 2>$null
    git -C $publishRoot config --unset-all https.proxy 2>$null
}

Push-Location $publishRoot
try {
    git add --all
    git diff --cached --quiet
    $diffExitCode = $LASTEXITCODE

    if ($diffExitCode -eq 1) {
        git commit -m $Message
        if ($LASTEXITCODE -ne 0) {
            throw 'Git commit failed.'
        }
        git push origin main
        if ($LASTEXITCODE -ne 0) {
            throw 'Git push failed.'
        }
        Write-Host 'GitHub publish completed.'
    }
    elseif ($diffExitCode -eq 0) {
        Write-Host 'No publish changes detected.'
    }
    else {
        throw 'Unable to inspect publish changes.'
    }
}
finally {
    Pop-Location
}
