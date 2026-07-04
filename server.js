/**
 * Bridge HTTP: Copilot Extensions / REST → MCP Supabase
 * Produção: auth, cache dinâmico, manifesto ao vivo, WebSocket opcional.
 */

import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { authOptionsFromRequest, isAuthConfigured } from "./lib/auth.js";
import {
  callMCP,
  callMCPTool,
  initializeMCP,
  listMCPTools,
  refreshMCPTools,
} from "./lib/mcp-client.js";
import { buildManifest } from "./lib/manifest.js";
import { getCacheMeta } from "./lib/tool-cache.js";
import {
  callMCPWebSocket,
  closeWebSocket,
  isWebSocketEnabled,
} from "./lib/mcp-ws-client.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const startedAt = new Date().toISOString();

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, apikey"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

if (process.env.NODE_ENV === "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

function bridgeAuth(req, res, next) {
  const bridgeToken = process.env.BRIDGE_AUTH_TOKEN;
  if (!bridgeToken) return next();

  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token !== bridgeToken) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    started_at: startedAt,
    mcp_url: process.env.MCP_URL || "default",
    websocket_enabled: isWebSocketEnabled(),
    auth_configured: isAuthConfigured(),
    tools_cache: getCacheMeta(),
  });
});

app.post("/mcp/initialize", bridgeAuth, async (req, res) => {
  try {
    res.json(await initializeMCP(authOptionsFromRequest(req)));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.body });
  }
});

app.post("/mcp/list-tools", bridgeAuth, async (req, res) => {
  try {
    const refresh = Boolean(req.body?.refresh);
    const authOpts = authOptionsFromRequest(req);
    const tools = refresh
      ? await refreshMCPTools(authOpts)
      : await listMCPTools(authOpts);
    res.json({ result: { tools }, cache: getCacheMeta() });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.body });
  }
});

app.post("/mcp/call-tool", bridgeAuth, async (req, res) => {
  try {
    const { tool, args, name, arguments: toolArgs } = req.body;
    const toolName = tool || name;

    if (!toolName) {
      return res.status(400).json({ error: "tool (ou name) é obrigatório" });
    }

    res.json(
      await callMCPTool(toolName, args ?? toolArgs ?? {}, authOptionsFromRequest(req)),
    );
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.body });
  }
});

app.post("/mcp/proxy", bridgeAuth, async (req, res) => {
  try {
    const { method, params } = req.body;
    if (!method) {
      return res.status(400).json({ error: "method é obrigatório" });
    }
    res.json(await callMCP(method, params || {}, authOptionsFromRequest(req)));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.body });
  }
});

app.post("/mcp/refresh", bridgeAuth, async (req, res) => {
  try {
    const tools = await refreshMCPTools(authOptionsFromRequest(req));
    const manifest = await buildManifest({ tools, dynamic: false });
    res.json({
      refreshed: true,
      tool_count: tools.length,
      cache: getCacheMeta(),
      manifest,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.body });
  }
});

app.get("/copilot-tool.json", bridgeAuth, async (req, res) => {
  try {
    const live = req.query.live !== "false";
    const manifest = live
      ? await buildManifest({ dynamic: true })
      : JSON.parse(
          await (await import("node:fs/promises")).readFile(
            "copilot-tool.json",
            "utf8"
          )
        );
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// WebSocket bridge para clientes que preferem streaming
if (isWebSocketEnabled()) {
  app.post("/mcp/ws-call", bridgeAuth, async (req, res) => {
    try {
      const { method, params } = req.body;
      if (!method) {
        return res.status(400).json({ error: "method é obrigatório" });
      }
      res.json(await callMCPWebSocket(method, params || {}));
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });
}

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Bridge MCP → Copilot [produção] em http://localhost:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  GET  /copilot-tool.json?live=true`);
  console.log(`  POST /mcp/initialize`);
  console.log(`  POST /mcp/list-tools`);
  console.log(`  POST /mcp/call-tool`);
  console.log(`  POST /mcp/proxy`);
  console.log(`  POST /mcp/refresh`);
  if (isWebSocketEnabled()) console.log(`  POST /mcp/ws-call`);
});

function shutdown(signal) {
  console.log(`Encerrando (${signal})...`);
  closeWebSocket().finally(() => {
    httpServer.close(() => process.exit(0));
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));