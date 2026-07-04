/**
 * Gera copilot-tool.json completo a partir das ferramentas do MCP remoto.
 *
 * Uso:
 *   MCP_AUTH_TOKEN=xxx node generate-functions.js
 *   MCP_AUTH_TOKEN=xxx node generate-functions.js --output copilot-tool.generated.json
 *   MCP_AUTH_TOKEN=xxx node generate-functions.js --update
 */

import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { buildManifest } from "./lib/manifest.js";

async function main() {
  const outputArg = process.argv.indexOf("--output");
  const update = process.argv.includes("--update");
  const outputFile =
    outputArg !== -1
      ? process.argv[outputArg + 1]
      : update
        ? "copilot-tool.json"
        : "copilot-tool.generated.json";

  const manifest = await buildManifest({ dynamic: true });

  await writeFile(outputFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Manifesto salvo em ${outputFile}`);
  console.log(`Total de funções: ${manifest.functions.length}`);
  console.log(`Ferramentas MCP dinâmicas: ${manifest.tool_count}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});