/**
 * Cliente WebSocket opcional para MCP com streaming.
 * Ativado quando MCP_WS_URL está definido.
 */

import WebSocket from "ws";
import { buildHeaders } from "./auth.js";

function wsUrl() {
  return process.env.MCP_WS_URL || null;
}

let pending = new Map();
let socket = null;
let connectPromise = null;
let requestId = 0;

function nextId() {
  requestId += 1;
  return String(requestId);
}

function getSocket() {
  const url = wsUrl();
  if (!url) {
    throw new Error("MCP_WS_URL não configurado");
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    return Promise.resolve(socket);
  }

  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve, reject) => {
    const headers = buildHeaders();
    socket = new WebSocket(url, { headers });

    socket.on("open", () => {
      connectPromise = null;
      resolve(socket);
    });

    socket.on("message", (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const id = data.id || data.requestId;
      if (id && pending.has(id)) {
        const { resolve: done, reject: fail, timer } = pending.get(id);
        clearTimeout(timer);
        pending.delete(id);
        if (data.error) {
          fail(new Error(data.error.message || JSON.stringify(data.error)));
        } else {
          done(data.result ?? data);
        }
      }
    });

    socket.on("error", (err) => {
      connectPromise = null;
      reject(err);
    });

    socket.on("close", () => {
      socket = null;
      for (const [, { reject: fail, timer }] of pending) {
        clearTimeout(timer);
        fail(new Error("WebSocket fechado"));
      }
      pending.clear();
    });
  });

  return connectPromise;
}

export function isWebSocketEnabled() {
  return Boolean(wsUrl());
}

export async function callMCPWebSocket(method, params = {}, options = {}) {
  const ws = await getSocket();
  const id = nextId();
  const timeout = Number(options.timeout || process.env.MCP_WS_TIMEOUT_MS || 30_000);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`WebSocket timeout (${timeout}ms) para ${method}`));
    }, timeout);

    pending.set(id, { resolve, reject, timer });

    ws.send(
      JSON.stringify({
        id,
        method,
        params,
      })
    );
  });
}

export async function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}