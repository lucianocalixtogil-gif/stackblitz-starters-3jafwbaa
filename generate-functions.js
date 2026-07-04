/**
 * Gera manifestos Copilot para o Turminha MCP.
 *
 * Uso:
 *   node generate-functions.js
 *   node generate-functions.js --update
 *   node generate-functions.js --oauth
 *   MCP_AUTH_TOKEN=xxx node generate-functions.js   # tenta tools/list dinâmico
 */

import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { buildManifest, buildTurminhaOAuthManifest } from "./lib/manifest.js";

async function writeManifest(file, manifest) {
  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ ${file}`);
  console.log(`  funções: ${manifest.functions.length} (tools MCP: ${manifest.tool_count})`);
  console.log(`  origem tools: ${manifest.tools_source}`);
}

async function main() {
  const update = process.argv.includes("--update");
  const oauthOnly = process.argv.includes("--oauth");
  const dynamic = !process.argv.includes("--static");

  if (oauthOnly) {
    const oauth = await buildTurminhaOAuthManifest({ dynamic });
    await writeManifest("copilot-tool-turminha-oauth.json", oauth);
    return;
  }

  const bridge = await buildManifest({ dynamic });
  const bridgeFile = update ? "copilot-tool.json" : "copilot-tool.generated.json";
  await writeManifest(bridgeFile, bridge);

  const oauth = await buildTurminhaOAuthManifest({ dynamic });
  await writeManifest("copilot-tool-turminha-oauth.json", oauth);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});