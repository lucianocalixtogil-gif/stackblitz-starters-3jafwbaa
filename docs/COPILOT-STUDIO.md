# Microsoft Copilot + Turminha MCP (caminho real)

## O que NÃO funciona

O **Copilot do consumidor** (copilot.microsoft.com, Windows, Edge, app móvel) **não tem** menu "Conectores" para colar URL MCP como Claude ou Grok.

Instruções do tipo "Configurações → cole o link" estavam **erradas** para esse produto.

## O que funciona: Copilot Studio

Documentação Microsoft: [Connect your agent to an existing MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)

### Passo a passo

1. Abra [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com) (conta Microsoft).
2. Crie ou abra um **agente**.
3. Ative **orquestração generativa** (obrigatório para MCP).
4. Vá em **Tools** → **Add a tool** → **New tool** → **Model Context Protocol**.
5. Preencha:
   - **Server name:** Turminha
   - **Server description:** Turmas, alunos e mapas do professor
   - **Server URL:** `https://eeypnycefljwkyhxttzo.supabase.co/functions/v1/mcp`
   - **Auth:** OAuth 2.0
6. Tente **Dynamic discovery** primeiro (o Turminha expõe `/.well-known/oauth-protected-resource`).
7. Se falhar, use **Dynamic** e informe manualmente os endpoints OAuth do Supabase Auth.
8. **Create** → **Create a new connection** → login Turminha → **Aprovar** → **Add to agent**.
9. Teste no **chat do agente** no Copilot Studio (não no Copilot do Windows).

### Transporte

Copilot Studio exige **Streamable HTTP** (não SSE).

## Alternativa imediata (2 minutos)

Use **Claude** ou **Grok**: cole o mesmo MCP_URL em Conectores → OAuth Turminha → pronto.

## Bridge local (dev)

O `server.js` + `copilot-tool.json` serve para experimentos com extensões/API — **não** substitui o wizard MCP do Copilot Studio para professores.