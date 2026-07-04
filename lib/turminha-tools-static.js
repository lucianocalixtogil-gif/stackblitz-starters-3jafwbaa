/**
 * Catálogo estático das tools do Turminha MCP (espelha src/lib/mcp/tools em class-map-pro).
 * Usado quando listMCPTools falha sem OAuth (401).
 */
export const TURMINHA_MCP_URL =
  "https://eeypnycefljwkyhxttzo.supabase.co/functions/v1/mcp";

export const TURMINHA_OAUTH_RESOURCE =
  "https://eeypnycefljwkyhxttzo.supabase.co/functions/v1/mcp";

export const TURMINHA_OAUTH_ISSUER =
  "https://eeypnycefljwkyhxttzo.supabase.co/auth/v1";

export const TURMINHA_CONSENT_URL =
  "https://seatsmartapp.shop/.lovable/oauth/consent";

/** @type {import("./manifest.js").McpToolShape[]} */
export const TURMINHA_STATIC_TOOLS = [
  {
    name: "echo",
    description: "Echo the input text back. Use to verify MCP connectivity.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, description: "Text to echo back." },
      },
      required: ["text"],
    },
  },
  {
    name: "list_classes",
    description: "Lista as turmas do professor autenticado.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_students",
    description:
      "Lista os alunos de uma turma (id, nome, número, necessidades pedagógicas).",
    inputSchema: {
      type: "object",
      properties: {
        class_id: {
          type: "string",
          format: "uuid",
          description: "ID da turma (obtido em list_classes).",
        },
      },
      required: ["class_id"],
    },
  },
  {
    name: "list_maps",
    description: "Lista os mapas de assentos de uma turma.",
    inputSchema: {
      type: "object",
      properties: {
        class_id: { type: "string", format: "uuid", description: "ID da turma." },
      },
      required: ["class_id"],
    },
  },
  {
    name: "create_class",
    description: "Cria uma turma nova para o professor autenticado.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, description: "Nome da turma." },
        grade: { type: "string", description: "Série ou ano (opcional)." },
        room: { type: "string", description: "Sala (opcional)." },
      },
      required: ["name"],
    },
  },
  {
    name: "add_students",
    description: "Insere uma lista de alunos em uma turma existente.",
    inputSchema: {
      type: "object",
      properties: {
        class_id: { type: "string", format: "uuid" },
        students: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1 },
              roll_number: { type: "integer" },
              profile: { type: "string" },
              needs: { type: "string" },
              observation: { type: "string" },
              notes: { type: "string" },
              height_cm: { type: "number" },
              wall_seat: { type: "string", enum: ["sim", "nao", "qualquer"] },
              vision_issue: { type: "boolean" },
            },
            required: ["name"],
          },
        },
      },
      required: ["class_id", "students"],
    },
  },
  {
    name: "update_student",
    description: "Atualiza campos pedagógicos de um aluno (patch parcial).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", minLength: 1 },
        roll_number: { type: ["integer", "null"] },
        profile: { type: ["string", "null"] },
        needs: { type: ["string", "null"] },
        observation: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
        height_cm: { type: ["number", "null"] },
        wall_seat: { type: ["string", "null"], enum: ["sim", "nao", "qualquer", null] },
        vision_issue: { type: "boolean" },
        locked: { type: "boolean" },
        locked_row: { type: ["integer", "null"] },
        locked_col: { type: ["integer", "null"] },
        conflicts_with: { type: ["array", "null"], items: { type: "string", format: "uuid" } },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_student",
    description:
      "Remove um aluno da turma. Ação destrutiva — exige confirmação explícita do usuário.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "ID do aluno a remover." },
      },
      required: ["id"],
    },
  },
  {
    name: "create_map",
    description: "Cria um mapa vazio em uma turma.",
    inputSchema: {
      type: "object",
      properties: {
        class_id: { type: "string", format: "uuid" },
        name: { type: "string", description: "Nome do mapa (opcional)." },
      },
      required: ["class_id"],
    },
  },
  {
    name: "generate_seating",
    description:
      "Executa o motor de organização para uma turma+mapa e persiste o layout.",
    inputSchema: {
      type: "object",
      properties: {
        class_id: { type: "string", format: "uuid" },
        map_id: { type: "string", format: "uuid" },
      },
      required: ["class_id", "map_id"],
    },
  },
];