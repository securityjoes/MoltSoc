# MoltSOC – add install directory to user PATH (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/add-path.ps1 -TargetDir "C:\path\to\MoltSoc"
# Or from repo root: .\scripts\add-path.ps1 -TargetDir (Get-Location).Path

param(
    [Parameter(Mandatory = $true)]
    [string]$TargetDir
)

$ErrorActionPreference = "Stop"
$dir = (Resolve-Path -LiteralPath $TargetDir -ErrorAction SilentlyContinue).Path
if (-not $dir -or -not (Test-Path -LiteralPath $dir -PathType Container)) {
    Write-Error "Target directory does not exist: $TargetDir"
    exit 1
}

# Ensure moltsoc.cmd exists in target (so we're adding the right folder)
$cmdPath = Join-Path $dir "moltsoc.cmd"
if (-not (Test-Path -LiteralPath $cmdPath -PathType Leaf)) {
    Write-Error "moltsoc.cmd not found in $dir – run this from the MoltSOC repo root."
    exit 1
}

$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $currentPath) { $currentPath = "" }

$separator = ";"
$entries = $currentPath -split $separator | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
$normalizedDir = $dir.TrimEnd('\', '/')
$alreadyInPath = $entries | Where-Object {
    $normalized = $_.TrimEnd('\', '/')
    $normalized -eq $normalizedDir -or $_.ToLowerInvariant() -eq $normalizedDir.ToLowerInvariant()
}

if ($alreadyInPath) {
    Write-Host "MoltSOC is already on your PATH."
    exit 0
}

$newPath = $normalizedDir + $separator + $currentPath
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
Write-Host "Added MoltSOC to your PATH: $normalizedDir"
Write-Host ""
Write-Host "Restart your terminal (or open a new one) for 'moltsoc' to be available everywhere."
Write-Host "You can also run: moltsoc.cmd <command> from this folder."
