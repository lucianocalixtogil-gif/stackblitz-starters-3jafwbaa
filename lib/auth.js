/**
 * Autenticação Supabase para o MCP.
 *
 * Prioridade do token (Authorization: Bearer):
 *   SUPABASE_KEY  → recomendado pelo Copilot (anon, JWT ou service role)
 *   MCP_AUTH_TOKEN → alias legado
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 */

export function getSupabaseToken() {
  return (
    process.env.SUPABASE_KEY ||
    process.env.MCP_AUTH_TOKEN ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

export function buildHeaders(extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };

  // Token do request (OAuth Copilot) tem prioridade sobre .env
  if (!headers.Authorization) {
    const token = getSupabaseToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Supabase Edge Functions também aceitam apikey
  const apiKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.SUPABASE_KEY?.startsWith("eyJ") ? process.env.SUPABASE_KEY : null);

  if (apiKey) {
    headers.apikey = apiKey;
  }

  return headers;
}

export function isAuthConfigured() {
  return Boolean(getSupabaseToken());
}

/** Repassa Authorization: Bearer do Copilot para o MCP remoto. */
export function authOptionsFromRequest(req) {
  const auth = req.headers.authorization || "";
  if (/^Bearer\s+\S+/i.test(auth)) {
    return { headers: { Authorization: auth } };
  }
  return {};
}