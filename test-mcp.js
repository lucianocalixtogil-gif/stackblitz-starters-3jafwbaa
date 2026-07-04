#!/usr/bin/env node
/**
 * Teste ponta a ponta: initialize + tools/list
 * Uso: npm run test:mcp
 */

import "dotenv/config";
import { getSupabaseToken, isAuthConfigured } from "./lib/auth.js";
import { initializeMCP, listMCPTools } from "./lib/mcp-client.js";

async function main() {
  console.log("=== Teste MCP Supabase ===\n");
  console.log("URL:", process.env.MCP_URL);
  console.log("Auth:", isAuthConfigured() ? "configurado" : "AUSENTE");

  if (!isAuthConfigured()) {
    console.error("\n⚠️  Turminha MCP usa OAuth 2.1 — anon key NÃO funciona.");
    console.error("   Validação em class-map-pro: JWT anon → 401 (esperado).");
    console.error("\n   Conecte assim (OAuth interativo):");
    console.error("   URL: https://eeypnycefljwkyhxttzo.supabase.co/functions/v1/mcp");
    console.error("   Transport: Streamable HTTP");
    console.error("   Grok/Copilot/Claude: Conectores → colar URL → login SeatSmart");
    console.error("\n   Ou rode no class-map-pro: npm run validate:mcp:inspector");
    process.exit(1);
  }

  console.log("\n→ initialize...");
  const init = await initializeMCP();
  console.log(JSON.stringify(init, null, 2));

  console.log("\n→ tools/list...");
  const tools = await listMCPTools({ refresh: true });
  console.log(`Ferramentas encontradas: ${tools.length}`);
  for (const t of tools) {
    console.log(`  - ${t.name}: ${t.description || "(sem descrição)"}`);
  }

  console.log("\n✓ Teste OK. Rode: npm run generate:copilot-tool:update");
}

main().catch((err) => {
  console.error("\n✗ Falhou:", err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});