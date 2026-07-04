/**
 * Cache TTL para ferramentas MCP dinâmicas.
 */

const DEFAULT_TTL_MS = Number(process.env.MCP_TOOLS_CACHE_TTL_MS || 60_000);

let cache = {
  tools: [],
  fetchedAt: 0,
};

export function getCachedTools() {
  if (!cache.tools.length) return null;
  if (Date.now() - cache.fetchedAt > DEFAULT_TTL_MS) return null;
  return cache.tools;
}

export function setCachedTools(tools) {
  cache = { tools, fetchedAt: Date.now() };
  return tools;
}

export function clearToolCache() {
  cache = { tools: [], fetchedAt: 0 };
}

export function getCacheMeta() {
  return {
    count: cache.tools.length,
    fetched_at: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    ttl_ms: DEFAULT_TTL_MS,
    stale: cache.fetchedAt
      ? Date.now() - cache.fetchedAt > DEFAULT_TTL_MS
      : true,
  };
}