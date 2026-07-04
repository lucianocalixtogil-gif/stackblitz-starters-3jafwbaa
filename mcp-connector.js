#!/usr/bin/env node
/**
 * Conector MCP stdio → Supabase JSON-RPC (produção)
 * Ferramentas dinâmicas com cache TTL e refresh sob demanda.
 */

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  callMCPTool,
  initializeMCP,
  listMCPTools,
  refreshMCPTools,
} from "./lib/mcp-client.js";

const SERVER_NAME = process.env.MCP_CONNECTOR_NAME || "supabase-mcp";
const SERVER_VERSION = "1.0.0";

const CONTROL_TOOLS = [
  {
    name: "mcp_initialize",
    description: "Inicializa o servidor MCP remoto e retorna capacidades.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "mcp_list_tools",
    description: "Lista todas as ferramentas disponíveis no servidor MCP remoto.",
    inputSchema: {
      type: "object",
      properties: {
        refresh: {
          type: "boolean",
          description: "Força atualização do cache de ferramentas",
        },
      },
    },
  },
  {
    name: "mcp_call",
    description: "Chama qualquer ferramenta MCP remota pelo nome.",
    inputSchema: {
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
  },
  {
    name: "mcp_refresh_tools",
    description: "Atualiza o cache de ferramentas MCP dinâmicas.",
    inputSchema: { type: "object", properties: {} },
  },
];

function toolResult(data) {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

function normalizeInputSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }
  return schema;
}

async function loadRemoteTools(refresh = false) {
  return refresh ? refreshMCPTools() : listMCPTools();
}

function toExposedTools(remoteTools) {
  return [
    ...CONTROL_TOOLS,
    ...remoteTools.map((tool) => ({
      name: tool.name,
      description: tool.description || `Ferramenta MCP: ${tool.name}`,
      inputSchema: normalizeInputSchema(tool.inputSchema),
    })),
  ];
}

async function main() {
  let remoteTools = [];

  try {
    remoteTools = await loadRemoteTools(false);
  } catch (err) {
    console.error(
      `[${SERVER_NAME}] Aviso: não foi possível carregar ferramentas remotas: ${err.message}`
    );
  }

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      remoteTools = await loadRemoteTools(false);
    } catch {
      // mantém lista anterior em caso de falha transitória
    }
    return { tools: toExposedTools(remoteTools) };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      if (name === "mcp_initialize") {
        return toolResult(await initializeMCP());
      }

      if (name === "mcp_list_tools") {
        const tools = await loadRemoteTools(Boolean(args.refresh));
        remoteTools = tools;
        return toolResult({ tools });
      }

      if (name === "mcp_refresh_tools") {
        remoteTools = await refreshMCPTools();
        return toolResult({
          refreshed: true,
          tool_count: remoteTools.length,
          tools: remoteTools,
        });
      }

      if (name === "mcp_call") {
        const toolName = args.tool;
        if (!toolName) throw new Error("Parâmetro 'tool' é obrigatório");
        return toolResult(await callMCPTool(toolName, args.args || {}));
      }

      const remote = remoteTools.find((t) => t.name === name);
      if (remote) {
        return toolResult(await callMCPTool(name, args));
      }

      throw new Error(`Ferramenta desconhecida: ${name}`);
    } catch (err) {
      return {
        content: [{ type: "text", text: `Erro: ${err.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[${SERVER_NAME}] Conector ativo — ${remoteTools.length} ferramenta(s) remota(s)`
  );
}

main().catch((err) => {
  console.error(`[mcp-connector] Erro fatal: ${err.message}`);
  process.exit(1);
});