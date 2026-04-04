# ============================================================
#  Fleeterzen UAT Startup Script
#  Run from an Administrator PowerShell window:
#    cd C:\LogiTrack
#    .\start-uat.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fleeterzen UAT Session Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Kill any existing node / ngrok processes ---
Write-Host "[1/6] Stopping any running servers..." -ForegroundColor Yellow
Get-Process node  -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# --- 2. Start backend ---
Write-Host "[2/6] Starting backend..." -ForegroundColor Yellow
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
    -ArgumentList "src\app.js" `
    -WorkingDirectory "C:\LogiTrack\backend" `
    -WindowStyle Minimized
Start-Sleep -Seconds 2

# --- 3. Start ngrok (frontend only) ---
Write-Host "[3/6] Starting ngrok tunnel..." -ForegroundColor Yellow
$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
$ngrokPath = if ($ngrokCmd) { $ngrokCmd.Source } else { $null }
if (-not $ngrokPath) {
    $candidates = @(
        "C:\ngrok\ngrok.exe",
        "$env:LOCALAPPDATA\ngrok\ngrok.exe",
        "$env:ProgramFiles\ngrok\ngrok.exe",
        "$env:USERPROFILE\ngrok\ngrok.exe"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { $ngrokPath = $c; break } }
}
if (-not $ngrokPath) {
    Write-Host ""
    Write-Host "ERROR: ngrok not found. Please install it first:" -ForegroundColor Red
    Write-Host "  1. Go to https://ngrok.com/download" -ForegroundColor White
    Write-Host "  2. Download the Windows version and extract ngrok.exe to C:\ngrok\" -ForegroundColor White
    Write-Host "  3. Run: C:\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host "  4. Re-run this script" -ForegroundColor White
    exit 1
}

$ngrokDefault = "$env:LOCALAPPDATA\ngrok\ngrok.yml"
Start-Process -FilePath $ngrokPath `
    -ArgumentList "start --all --config `"$ngrokDefault`" --config C:\LogiTrack\ngrok.yml" `
    -WindowStyle Minimized

# --- 4. Wait for ngrok URL ---
Write-Host "[4/6] Waiting for ngrok to initialise..." -ForegroundColor Yellow
$frontendUrl = $null
$attempts = 0
while (-not $frontendUrl -and $attempts -lt 20) {
    Start-Sleep -Seconds 2
    $attempts++
    try {
        $tunnels = (Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop).tunnels
        foreach ($t in $tunnels) {
            if ($t.public_url -match "^https://") {
                $frontendUrl = $t.public_url
                break
            }
        }
    } catch { }
}

if (-not $frontendUrl) {
    Write-Host "ERROR: Could not get ngrok URL after 40 seconds." -ForegroundColor Red
    Write-Host "Check that ngrok is authenticated: C:\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN" -ForegroundColor White
    exit 1
}

# --- 5. Update env files ---
Write-Host "[5/6] Updating env files with ngrok URL..." -ForegroundColor Yellow

# frontend/.env.local — API calls go through the Next.js proxy
$envLocal = "NEXT_PUBLIC_API_URL=$frontendUrl/proxy-api`nNEXT_PUBLIC_MAPS_API_KEY=AIzaSyCgZgu0rXFYE27GEtKhzpAjkCJIqFDvok8`n"
Set-Content "C:\LogiTrack\frontend\.env.local" $envLocal -NoNewline

# backend/.env — add ngrok URL to CORS
$envBackend = Get-Content "C:\LogiTrack\backend\.env" -Raw
$envBackend = $envBackend -replace "CORS_ORIGIN=.*", "CORS_ORIGIN=http://localhost:3000,http://192.168.0.100:3000,$frontendUrl"
Set-Content "C:\LogiTrack\backend\.env" $envBackend -NoNewline

# Restart backend with updated CORS
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
    -ArgumentList "src\app.js" `
    -WorkingDirectory "C:\LogiTrack\backend" `
    -WindowStyle Minimized
Start-Sleep -Seconds 2

# --- 6. Start frontend ---
Write-Host "[6/6] Starting frontend (this takes ~15 seconds)..." -ForegroundColor Yellow
Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", "cd C:\LogiTrack\frontend; `$env:BACKEND_URL='http://localhost:4000'; npm run dev" `
    -WindowStyle Normal

Start-Sleep -Seconds 5

# --- Done ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  UAT SESSION READY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Share this URL with testers:" -ForegroundColor White
Write-Host ""
Write-Host "  $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  (Wait ~15 seconds for the frontend to finish compiling)" -ForegroundColor Gray
Write-Host ""
Write-Host "  ngrok panel : http://localhost:4040" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C or close this window to end the session." -ForegroundColor Gray
Write-Host ""
