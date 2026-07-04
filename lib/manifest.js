/**
 * Geração do manifesto copilot-tool.json (estático ou dinâmico).
 */

import { listMCPTools } from "./mcp-client.js";

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

export async function buildManifest({ tools, dynamic = true } = {}) {
  let remoteTools = tools;

  if (dynamic && !remoteTools) {
    remoteTools = await listMCPTools({ refresh: true });
  }

  const dynamicFunctions = (remoteTools || []).map(toolToFunction);

  return {
    schema_version: "v1",
    name: process.env.COPILOT_TOOL_NAME || "mcp_supabase_connector",
    description:
      "Ferramenta Copilot que conecta ao servidor MCP hospedado no Supabase. Inclui funções base + ferramentas MCP descobertas dinamicamente.",
    auth: {
      type: process.env.BRIDGE_AUTH_TOKEN ? "bearer" : "none",
      header: "Authorization",
    },
    base_url: process.env.BRIDGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    transport: {
      http: true,
      websocket: Boolean(process.env.MCP_WS_URL),
    },
    functions: [...BASE_FUNCTIONS, ...dynamicFunctions],
    generated_at: new Date().toISOString(),
    mcp_url: process.env.MCP_URL,
    tool_count: dynamicFunctions.length,
  };
}