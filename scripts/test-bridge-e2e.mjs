#!/usr/bin/env node
/**
 * Teste E2E do bridge HTTP → Turminha MCP.
 * Uso: node scripts/test-bridge-e2e.mjs
 * Com OAuth: MCP_OAUTH_TOKEN=eyJ... node scripts/test-bridge-e2e.mjs
 */

const BASE = process.env.BRIDGE_BASE_URL || "http://localhost:3000";
const oauthToken = process.env.MCP_OAUTH_TOKEN?.trim();

async function post(path, body = {}, { auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && oauthToken) {
    headers.Authorization = `Bearer ${oauthToken}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log("=== Bridge E2E ===\n");
  console.log("Bridge:", BASE);

  const health = await fetch(`${BASE}/health`);
  const healthData = await health.json();
  console.log("\n1. GET /health →", health.status, healthData.status);

  const noAuth = await post("/mcp/call-tool", { tool: "list_classes", args: {} });
  console.log("\n2. POST /mcp/call-tool list_classes (sem token)");
  console.log("   HTTP", noAuth.status);
  console.log("   ", JSON.stringify(noAuth.data).slice(0, 200));
  const expect401 = noAuth.status === 401 || noAuth.data?.error === "unauthorized";
  console.log("   ", expect401 ? "✓ 401 esperado (OAuth obrigatório)" : "⚠ resposta inesperada");

  if (oauthToken) {
    const withAuth = await post(
      "/mcp/call-tool",
      { tool: "list_classes", args: {} },
      { auth: true },
    );
    console.log("\n3. POST /mcp/call-tool list_classes (OAuth token)");
    console.log("   HTTP", withAuth.status);
    const preview = JSON.stringify(withAuth.data).slice(0, 400);
    console.log("   ", preview);
    if (withAuth.status === 200) {
      console.log("\n✓ E2E completo com OAuth — list_classes OK");
      return;
    }
    console.log("\n✗ Token OAuth não aceito — verifique expiração ou escopo");
    process.exit(1);
  }

  console.log("\n→ Sem MCP_OAUTH_TOKEN: bridge OK, MCP exige OAuth (comportamento correto).");
  console.log("  Para teste completo: conecte no Copilot/Claude, copie o Bearer e rode:");
  console.log("  MCP_OAUTH_TOKEN=eyJ... node scripts/test-bridge-e2e.mjs");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});