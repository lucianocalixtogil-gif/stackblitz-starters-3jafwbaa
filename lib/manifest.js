/**
 * Geração do manifesto copilot-tool.json (estático ou dinâmico).
 */

import { listMCPTools } from "./mcp-client.js";
import {
  TURMINHA_CONSENT_URL,
  TURMINHA_MCP_URL,
  TURMINHA_OAUTH_ISSUER,
  TURMINHA_OAUTH_RESOURCE,
  TURMINHA_STATIC_TOOLS,
} from "./turminha-tools-static.js";

const BASE_FUNCTIONS = [
  {
    name: "mcp_initialize",
    description: "Inicializa o servidor MCP e retorna suas capacidades.",
    method: "POST",
    url: "/mcp/initialize",
    input_schema: { type: "object", properties: {} },
    output_schema: { type: "object" },
  },
  {
    name: "mcp_list_tools",
    description: "Lista todas as ferramentas disponíveis no servidor MCP.",
    method: "POST",
    url: "/mcp/list-tools",
    input_schema: { type: "object", properties: {} },
    output_schema: { type: "object" },
  },
  {
    name: "mcp_call_tool",
    description: "Chama uma ferramenta MCP específica com argumentos.",
    method: "POST",
    url: "/mcp/call-tool",
    input_schema: {
      type: "object",
      properties: {
        tool: { type: "string", description: "Nome da ferramenta MCP" },
        args: {
          type: "object",
          description: "Argumentos da ferramenta",
          additionalProperties: true,
        },
      },
      required: ["tool"],
    },
    output_schema: { type: "object" },
  },
  {
    name: "mcp_proxy",
    description:
      "Proxy genérico para qualquer método MCP (initialize, tools/list, tools/call, etc.).",
    method: "POST",
    url: "/mcp/proxy",
    input_schema: {
      type: "object",
      properties: {
        method: { type: "string", description: "Método MCP (ex: tools/list)" },
        params: {
          type: "object",
          description: "Parâmetros do método",
          additionalProperties: true,
        },
      },
      required: ["method"],
    },
    output_schema: { type: "object" },
  },
  {
    name: "mcp_refresh_tools",
    description:
      "Atualiza o cache de ferramentas MCP e retorna o manifesto atualizado.",
    method: "POST",
    url: "/mcp/refresh",
    input_schema: { type: "object", properties: {} },
    output_schema: { type: "object" },
  },
];

function sanitizeName(name) {
  return `mcp_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function toolToFunction(tool) {
  const inputSchema = tool.inputSchema || { type: "object", properties: {} };

  return {
    name: sanitizeName(tool.name),
    description: tool.description || `Ferramenta MCP: ${tool.name}`,
    method: "POST",
    url: "/mcp/call-tool",
    input_schema: {
      type: "object",
      properties: {
        tool: { type: "string", const: tool.name },
        args: inputSchema,
      },
      required: ["tool"],
    },
    output_schema: tool.outputSchema || { type: "object" },
    _mcp_tool: tool.name,
  };
}

/** Função para manifesto OAuth direto (streamable HTTP MCP — sem bridge). */
function toolToOAuthFunction(tool) {
  const inputSchema = tool.inputSchema || { type: "object", properties: {} };

  return {
    name: sanitizeName(tool.name),
    description: tool.description || `Ferramenta MCP: ${tool.name}`,
    mcp_tool: tool.name,
    input_schema: inputSchema,
    invoke: {
      protocol: "mcp",
      transport: "streamable_http",
      method: "tools/call",
      arguments_key: "arguments",
    },
  };
}

async function resolveTools({ tools, dynamic = true } = {}) {
  if (tools) return { tools, source: "provided" };

  if (dynamic) {
    try {
      const remote = await listMCPTools({ refresh: true });
      if (remote?.length) return { tools: remote, source: "dynamic" };
    } catch (err) {
      console.warn(
        `[manifest] tools/list falhou (${err.message}) — usando catálogo estático Turminha.`,
      );
    }
  }

  return { tools: TURMINHA_STATIC_TOOLS, source: "static" };
}

export async function buildManifest({ tools, dynamic = true } = {}) {
  const resolved = await resolveTools({ tools, dynamic });
  const dynamicFunctions = (resolved.tools || []).map(toolToFunction);

  return {
    schema_version: "v1",
    name: process.env.COPILOT_TOOL_NAME || "turminha_mcp_bridge",
    description:
      "Bridge Copilot → Turminha MCP. Rode server.js localmente; o Copilot chama o bridge, que repassa ao MCP com token OAuth do usuário (não use SUPABASE_KEY).",
    auth: {
      type: process.env.BRIDGE_AUTH_TOKEN ? "bearer" : "none",
      header: "Authorization",
    },
    base_url: process.env.BRIDGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    transport: {
      http: true,
      streamable: true,
      websocket: Boolean(process.env.MCP_WS_URL),
    },
    functions: [...BASE_FUNCTIONS, ...dynamicFunctions],
    generated_at: new Date().toISOString(),
    mcp_url: process.env.MCP_URL || TURMINHA_MCP_URL,
    tool_count: dynamicFunctions.length,
    tools_source: resolved.source,
  };
}

/** Manifesto para conector Copilot direto (streamable HTTP + OAuth) — sem bridge. */
export async function buildTurminhaOAuthManifest({ tools, dynamic = false } = {}) {
  const resolved = await resolveTools({ tools, dynamic });
  const toolFunctions = (resolved.tools || []).map(toolToOAuthFunction);

  return {
    schema_version: "v1",
    name: "turminha_mcp",
    title: "Turminha (SeatSmart) MCP",
    description:
      "Conector MCP do Turminha para Copilot. Cole o MCP_URL, autentique via OAuth na Turminha e pergunte sobre turmas, alunos e mapas. Não requer SUPABASE_KEY.",
    mcp_url: process.env.MCP_URL || TURMINHA_MCP_URL,
    base_url: process.env.MCP_URL || TURMINHA_MCP_URL,
    transport: {
      type: "streamable_http",
      protocol: "mcp",
      http: true,
    },
    auth: {
      type: "oauth2",
      flow: "authorization_code",
      pkce: true,
      header: "Authorization",
      resource: TURMINHA_OAUTH_RESOURCE,
      authorization_server: TURMINHA_OAUTH_ISSUER,
      protected_resource_metadata: `${TURMINHA_OAUTH_RESOURCE}/.well-known/oauth-protected-resource`,
      consent_ui: TURMINHA_CONSENT_URL,
      note: "Token OAuth emitido após Aprovar no Turminha — não é anon key nem service role.",
    },
    oauth: {
      issuer: TURMINHA_OAUTH_ISSUER,
      resource: TURMINHA_OAUTH_RESOURCE,
      scopes_supported: ["openid", "email", "profile"],
    },
    instructions:
      "Comece com list_classes. Para criar dados: create_class → add_students → create_map → generate_seating.",
    functions: toolFunctions,
    generated_at: new Date().toISOString(),
    tool_count: toolFunctions.length,
    tools_source: resolved.source,
  };
}