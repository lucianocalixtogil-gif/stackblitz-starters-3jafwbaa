#!/usr/bin/env sh
# Setup automático — Linux/macOS/Termux/iSH
# Uso: sh setup.sh

set -e

echo "=== MCP Supabase Connector — Setup ==="

if [ ! -d node_modules ]; then
  echo "Instalando dependências..."
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "Arquivo .env criado."
  echo "EDITE .env e coloque MCP_AUTH_TOKEN=seu_token"
  echo "Use o mesmo token que funciona no Claude/Grok."
  echo ""
fi

if grep -q '^MCP_AUTH_TOKEN=$' .env 2>/dev/null || ! grep -q '^MCP_AUTH_TOKEN=' .env 2>/dev/null; then
  echo "MCP_AUTH_TOKEN vazio. Gerando manifesto base apenas."
  npm run generate:copilot-tool
else
  echo "Gerando manifesto com ferramentas dinâmicas..."
  npm run generate:copilot-tool:update
fi

echo ""
echo "=== Pronto! Próximos comandos ==="
echo "  npm run bridge     # sobe o handler HTTP"
echo "  npm run mcp        # sobe o conector stdio (Copilot CLI)"
echo ""
echo "Publicar extensão: extension/openapi.yaml + URL pública do bridge"