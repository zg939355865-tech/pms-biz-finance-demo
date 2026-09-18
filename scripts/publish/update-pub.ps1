[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$publishRoot = Join-Path $projectRoot 'pub'

if (-not (Test-Path -LiteralPath $publishRoot)) {
    New-Item -ItemType Directory -Path $publishRoot | Out-Null
}

function Sync-PublicDirectory {
    param(
        [Parameter(Mandatory)] [string] $SourceRelativePath,
        [Parameter(Mandatory)] [string] $TargetRelativePath
    )

    $source = Join-Path $projectRoot $SourceRelativePath
    $target = Join-Path $publishRoot $TargetRelativePath

    if (-not (Test-Path -LiteralPath $source)) {
        throw "Publish source directory does not exist: $SourceRelativePath"
    }

    New-Item -ItemType Directory -Force -Path $target | Out-Null
    & robocopy $source $target /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "Publish sync failed: $SourceRelativePath"
    }
}

Sync-PublicDirectory -SourceRelativePath 'assets' -TargetRelativePath 'assets'
Sync-PublicDirectory -SourceRelativePath 'menu' -TargetRelativePath 'menu'
Sync-PublicDirectory -SourceRelativePath 'pages' -TargetRelativePath 'pages'
Sync-PublicDirectory -SourceRelativePath 'prototype-resources\components' -TargetRelativePath 'prototype-resources\components'

$monitorImage = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs\images') -File |
    Where-Object { $_.Length -gt 1MB } |
    Select-Object -First 1

if (-not $monitorImage) {
    throw 'The monitor illustration required by the public page was not found.'
}

$publicFiles = @(
    @{ Source = $monitorImage.FullName; Target = Join-Path 'docs\images' $monitorImage.Name },
    @{ Source = Join-Path $projectRoot 'outputs\reports\visual\live-project-requirement-login-state.png'; Target = 'outputs\reports\visual\live-project-requirement-login-state.png' }
)

foreach ($item in $publicFiles) {
    $sourceRelativePath = $item['Source']
    $targetRelativePath = $item['Target']
    $source = if ([System.IO.Path]::IsPathRooted($sourceRelativePath)) { $sourceRelativePath } else { Join-Path $projectRoot $sourceRelativePath }
    $target = Join-Path $publishRoot $targetRelativePath
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Publish source file does not exist: $sourceRelativePath"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
}

$indexContent = @'
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=menu/login.html">
  <title>PMS&#x4E1A;&#x8D22;&#x4E00;&#x4F53;&#x5316;&#x7CFB;&#x7EDF;</title>
  <script>window.location.replace('menu/login.html');</script>
</head>
<body>
  <p>&#x6B63;&#x5728;&#x8FDB;&#x5165; PMS &#x4E1A;&#x8D22;&#x4E00;&#x4F53;&#x5316;&#x7CFB;&#x7EDF;&hellip;</p>
  <p><a href="menu/login.html">&#x5982;&#x679C;&#x9875;&#x9762;&#x6CA1;&#x6709;&#x81EA;&#x52A8;&#x8DF3;&#x8F6C;&#xFF0C;&#x8BF7;&#x70B9;&#x51FB;&#x8FD9;&#x91CC;</a></p>
</body>
</html>
'@

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $publishRoot 'index.html'), $indexContent, $utf8WithoutBom)
[System.IO.File]::WriteAllBytes((Join-Path $publishRoot '.nojekyll'), [byte[]]@())

$fileCount = @(Get-ChildItem -LiteralPath $publishRoot -Recurse -File -Force | Where-Object { $_.FullName -notlike "*\.git\*" }).Count
Write-Host "Publish snapshot updated: $publishRoot ($fileCount files)"
