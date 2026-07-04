/**
 * Cliente HTTP/WebSocket para o servidor MCP hospedado no Supabase (JSON-RPC).
 */

import { buildHeaders } from "./auth.js";
import {
  callMCPWebSocket,
  isWebSocketEnabled,
} from "./mcp-ws-client.js";
import {
  clearToolCache,
  getCachedTools,
  setCachedTools,
} from "./tool-cache.js";

export { buildHeaders };

const DEFAULT_MCP_URL =
  "https://eeypnycefljwkyhxttzo.supabase.co/functions/v1/mcp";

export async function callMCP(method, params = {}, options = {}) {
  const url = options.url || process.env.MCP_URL || DEFAULT_MCP_URL;
  const headers = buildHeaders(options.headers);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ method, params }),
    signal: options.signal,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      `HTTP ${response.status}`;
    const err = new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
    err.status = response.status;
    err.body = data;
    throw err;
  }

  if (data.error) {
    const err = new Error(
      data.error.message || JSON.stringify(data.error)
    );
    err.body = data;
    throw err;
  }

  return data;
}

async function transportCall(method, params = {}, options = {}) {
  if (isWebSocketEnabled() && !options.forceHttp) {
    try {
      return await callMCPWebSocket(method, params, options);
    } catch (err) {
      if (!process.env.MCP_WS_FALLBACK_HTTP) throw err;
    }
  }
  return callMCP(method, params, options);
}

export async function listMCPTools(options = {}) {
  if (!options.refresh) {
    const cached = getCachedTools();
    if (cached) return cached;
  }

  const data = await transportCall("tools/list", {}, options);
  const tools = data.result?.tools || data.tools || [];
  return setCachedTools(tools);
}

export function refreshMCPTools(options = {}) {
  clearToolCache();
  return listMCPTools({ refresh: true, ...options });
}

export async function callMCPTool(name, args = {}, options = {}) {
  return transportCall(
    "tools/call",
    { name, arguments: args },
    options
  );
}

export async function initializeMCP(options = {}) {
  return transportCall("initialize", {}, options);
}