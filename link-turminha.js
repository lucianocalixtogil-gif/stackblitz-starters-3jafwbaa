#!/usr/bin/env node
/**
 * Lê config do class-map-pro (pasta irmã) e atualiza .env deste projeto.
 * Uso: npm run link:turminha
 */

import { writeFile } from "node:fs/promises";
import { loadTurminhaEnv, findTurminhaRoot } from "./lib/resolve-turminha.js";

async function main() {
  const root = await findTurminhaRoot();
  if (!root) {
    console.error("class-map-pro não encontrado.");
    console.error("Esperado em: C:\\Users\\lucia\\OneDrive\\Documents\\GitHub\\class-map-pro");
    process.exit(1);
  }

  const cfg = await loadTurminhaEnv();
  console.log("→ class-map-pro:", root);
  console.log("→ MCP URL:", cfg.mcpUrl);
  console.log("→ Projeto:", cfg.projectId);

  const env = `# Auto-gerado por link-turminha.js a partir do class-map-pro
# Auth: Turminha usa OAuth 2.1 — conecte pela URL, não por SUPABASE_KEY

MCP_URL=${cfg.mcpUrl}
TURMINHA_PROJECT_ID=${cfg.projectId}
TURMINHA_ROOT=${root.replace(/\\/g, "/")}

# OAuth interativo (Claude/Grok/Copilot Conectores):
# Cole só a MCP_URL — faça login no SeatSmart quando pedir

# Bridge local (opcional, só para testes):
PORT=3000
BRIDGE_BASE_URL=http://localhost:3000
MCP_CONNECTOR_NAME=turminha-mcp
`;

  await writeFile(".env", env);
  console.log("\n✓ .env atualizado.");
  console.log("\nPróximo passo — conectar com OAuth:");
  console.log("  URL:", cfg.mcpUrl);
  console.log("  Transport: Streamable HTTP");
  console.log("\nOu no class-map-pro:");
  console.log("  cd", root);
  console.log("  npm run validate:mcp:inspector");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});