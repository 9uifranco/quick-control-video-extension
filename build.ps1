# Build script - generates separate zips for Chrome and Firefox
# Usage: powershell -File build.ps1

$srcDir = "$PSScriptRoot\src"
$distDir = "$PSScriptRoot\dist"
$manifest = Get-Content "$srcDir\manifest.json" | ConvertFrom-Json

# Clean dist
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path "$distDir\chrome" | Out-Null
New-Item -ItemType Directory -Path "$distDir\firefox" | Out-Null

# --- Chrome build: remove "scripts" and "browser_specific_settings" ---
$chromeManifest = Get-Content "$srcDir\manifest.json" -Raw | ConvertFrom-Json
$chromeManifest.background.PSObject.Properties.Remove('scripts')
$chromeManifest.PSObject.Properties.Remove('browser_specific_settings')
Copy-Item "$srcDir\*" "$distDir\chrome" -Recurse
$chromeManifest | ConvertTo-Json -Depth 10 | Set-Content "$distDir\chrome\manifest.json"

# --- Firefox build: remove "service_worker" ---
$firefoxManifest = Get-Content "$srcDir\manifest.json" -Raw | ConvertFrom-Json
$firefoxManifest.background.PSObject.Properties.Remove('service_worker')
Copy-Item "$srcDir\*" "$distDir\firefox" -Recurse
$firefoxManifest | ConvertTo-Json -Depth 10 | Set-Content "$distDir\firefox\manifest.json"

# --- Create zips with forward slashes ---
$version = $manifest.version

Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-ZipFromDir($sourceDir, $zipPath) {
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
    $basePath = (Resolve-Path $sourceDir).Path
    Get-ChildItem $sourceDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($basePath.Length + 1) -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath) | Out-Null
    }
    $zip.Dispose()
}

New-ZipFromDir "$distDir\chrome" "$distDir\quick-control-video-chrome-v$version.zip"
New-ZipFromDir "$distDir\firefox" "$distDir\quick-control-video-firefox-v$version.zip"

Write-Host "Done! Built v$version"
Write-Host "  Chrome: dist\quick-control-video-chrome-v$version.zip"
Write-Host "  Firefox: dist\quick-control-video-firefox-v$version.zip"
