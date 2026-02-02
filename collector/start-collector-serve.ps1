# Start MoltSOC collector with HTTP server on 127.0.0.1:7777
# Run from repo root or from collector/. Leave this window open.
Set-Location $PSScriptRoot
Write-Host "Starting MoltSOC collector (--serve). Leave this window open. Ctrl+C to stop." -ForegroundColor Cyan
node src/cli.js --serve --source=openclaw-cli --out=../events.jsonl
