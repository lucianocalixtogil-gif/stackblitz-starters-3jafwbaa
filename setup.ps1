# Setup automático — Windows PowerShell
# Uso: .\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== MCP Supabase Connector — Setup ===" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando dependencias..." -ForegroundColor Yellow
  npm install
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ""
  Write-Host "Arquivo .env criado." -ForegroundColor Green
  Write-Host "EDITE .env e coloque MCP_AUTH_TOKEN=seu_token" -ForegroundColor Yellow
  Write-Host "Use o mesmo token que funciona no Claude/Grok." -ForegroundColor Yellow
  Write-Host ""
  notepad .env
  Read-Host "Pressione Enter depois de salvar o .env"
}

$token = (Get-Content .env | Where-Object { $_ -match "^MCP_AUTH_TOKEN=(.+)$" }) -replace "^MCP_AUTH_TOKEN=", ""
if (-not $token) {
  Write-Host "MCP_AUTH_TOKEN vazio no .env. Gerando manifesto base apenas." -ForegroundColor Yellow
  npm run generate:copilot-tool
} else {
  Write-Host "Gerando manifesto com ferramentas dinamicas..." -ForegroundColor Yellow
  npm run generate:copilot-tool:update
}

Write-Host ""
Write-Host "=== Pronto! Proximos comandos ===" -ForegroundColor Green
Write-Host "  npm run bridge     # sobe o handler HTTP"
Write-Host "  npm run mcp        # sobe o conector stdio (Copilot CLI)"
Write-Host ""
Write-Host "Publicar extensao: extension/openapi.yaml + URL publica do bridge"