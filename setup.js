#!/usr/bin/env node
/**
 * Setup cross-platform (PC, StackBlitz, Termux, iSH, Replit).
 * Uso: npm run setup
 */

import { copyFile, readFile, writeFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))
    );
  });
}

async function main() {
  console.log("=== MCP Supabase Connector — Setup automático ===\n");

  if (!(await exists("node_modules"))) {
    console.log("→ Instalando dependências...");
    await run("npm", ["install"]);
  }

  if (!(await exists(".env"))) {
    await copyFile(".env.example", ".env");
    console.log("→ .env criado a partir de .env.example");
    console.log("  Edite .env e defina SUPABASE_KEY=seu_token\n");
  }

  const envContent = await readFile(".env", "utf8");
  const tokenVars = ["SUPABASE_KEY", "MCP_AUTH_TOKEN", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const hasToken = tokenVars.some((v) => {
    const m = envContent.match(new RegExp(`^${v}=(.+)$`, "m"));
    return m && m[1].trim();
  });

  if (hasToken) {
    console.log("→ Token encontrado. Gerando manifesto com ferramentas dinâmicas...");
    await run("node", ["generate-functions.js", "--update"]);
  } else {
    console.log("→ Sem token. Gerando manifesto base (sem ferramentas remotas)...");
    const { buildManifest } = await import("./lib/manifest.js");
    const manifest = await buildManifest({ tools: [], dynamic: false });
    await writeFile(
      "copilot-tool.generated.json",
      JSON.stringify(manifest, null, 2) + "\n"
    );
    console.log("  Salvo em copilot-tool.generated.json");
    console.log("  Com token: npm run generate:copilot-tool:update\n");
  }

  console.log("=== Pronto! Rode agora ===");
  console.log("  npm run bridge   → handler HTTP (porta 3000)");
  console.log("  npm run mcp      → conector stdio (Copilot CLI)\n");
  console.log("Extensão oficial: extension/openapi.yaml");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});