$secrets = @(
    "GEMINI_API_KEY",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "BUNNY_API_KEY",
    "BUNNY_TOKEN_KEY",
    "BUNNY_STORAGE_ZONE_NAME",
    "BUNNY_STORAGE_HOSTNAME",
    "BUNNY_PULL_ZONE_URL",
    "BUNNY_WEBHOOK_SECRET",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "ZOHO_ORG_ID",
    "ZOHO_REFRESH_TOKEN",
    "ZOHO_CLIENT_ID",
    "ZOHO_CLIENT_SECRET",
    "RESEND_API_KEY"
)

Write-Host "Auditing Firebase Secrets..." -ForegroundColor Cyan
Write-Host "---------------------------"

foreach ($secret in $secrets) {
    # Execute command and capture combined stdout and stderr
    $output = firebase functions:secrets:get $secret *>&1 | Out-String
    
    if ($output -like "*versions*") {
        Write-Host -ForegroundColor Green "[OK] $secret exists"
    } elseif ($output -like "*404*" -or $output -like "*not found*") {
        Write-Host -ForegroundColor Red "[MISSING] $secret needs to be set"
    } else {
        Write-Host -ForegroundColor Yellow "[?" "] Checking $secret..."
        # If output is empty or unexpected, we can't be sure, but we'll flag it
        Write-Host -ForegroundColor Gray "$output"
    }
}

Write-Host "---------------------------"
Write-Host "Audit Complete." -ForegroundColor Cyan
