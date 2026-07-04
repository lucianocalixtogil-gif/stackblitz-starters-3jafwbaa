import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Caminhos do class-map-pro no seu PC (mesma pasta GitHub no OneDrive). */
const TURMINHA_CANDIDATES = [
  path.resolve(__dirname, "../../../class-map-pro"),
  path.resolve(__dirname, "../../../../OneDrive/Documents/GitHub/class-map-pro"),
  "C:/Users/lucia/OneDrive/Documents/GitHub/class-map-pro",
];

export async function findTurminhaRoot() {
  for (const dir of TURMINHA_CANDIDATES) {
    try {
      await access(path.join(dir, "package.json"));
      return dir;
    } catch {
      // tenta próximo
    }
  }
  return null;
}

export async function loadTurminhaEnv() {
  const root = await findTurminhaRoot();
  if (!root) return null;

  const envPath = path.join(root, ".env");
  const content = await readFile(envPath, "utf8");
  const vars = {};

  for (const raw of content.split("\n")) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[m[1]] = val;
  }

  return {
    root,
    projectId: vars.VITE_SUPABASE_PROJECT_ID,
    url: vars.VITE_SUPABASE_URL,
    publishableKey: vars.VITE_SUPABASE_PUBLISHABLE_KEY,
    mcpUrl: vars.VITE_SUPABASE_URL
      ? `${vars.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/mcp`
      : vars.VITE_SUPABASE_PROJECT_ID
        ? `https://${vars.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`
        : null,
  };
}