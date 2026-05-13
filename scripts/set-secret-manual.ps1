# Manual method to set Supabase secret using API
# This reads your credentials from the .env file to prevent security leaks

# Load .env file helper
function Load-Env {
    param($Path = ".env")
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $name, $value = $line.Split("=", 2)
                $name = $name.Trim()
                $value = $value.Trim().Trim('"').Trim("'")
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

Load-Env

$projectRef = $env:SUPABASE_PROJECT_ID
$accessToken = $env:SUPABASE_ACCESS_TOKEN
$apiKey = $env:OPENAI_API_KEY

if (-not $projectRef -or -not $accessToken -or -not $apiKey) {
    Write-Host "❌ Error: Missing required environment variables (SUPABASE_PROJECT_ID, SUPABASE_ACCESS_TOKEN, or OPENAI_API_KEY) in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Setting OPENAI_API_KEY secret for project $projectRef via Supabase Management API..." -ForegroundColor Cyan

$body = @(
    @{
        name = "OPENAI_API_KEY"
        value = $apiKey
    }
) | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$projectRef/secrets" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        } `
        -Body $body

    Write-Host "✅ Secret set successfully!" -ForegroundColor Green
    Write-Host "The Edge Function will now have access to OPENAI_API_KEY" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use the Dashboard method instead:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/$projectRef/settings/functions" -ForegroundColor Cyan
}

