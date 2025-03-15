import path from "node:path";

export let kv!: Deno.Kv;

const DEFAULT_DB_DIR = "db/server";
const DEFAULT_DB_FILE = "server.db";

export type KVConfigOptions = {
  path?: string;
  isLocal?: boolean;
};

export function createLocalKV(kvPath = DEFAULT_DB_DIR) {
  const dir = path.resolve(kvPath);

  try {
    const stat = Deno.statSync(dir);
    if (!stat.isDirectory) {
      throw new Error("The KV database path is not a directory");
    }
  } catch (_) {
    Deno.mkdirSync(dir, { recursive: true });
    console.log("Created a local KV database.");
  }

  return path.join(dir, DEFAULT_DB_FILE);
}

export function resetLocalKV(kvPath = DEFAULT_DB_DIR) {
  const dir = path.resolve(kvPath);
  try {
    Deno.removeSync(dir, { recursive: true });
    console.log("Removed the local KV database.");
    createLocalKV(kvPath);
  } catch (_) {
    // ignore
  }
}

export async function initKV(options: KVConfigOptions) {
  if (!options.path) {
    options.path = path.resolve(Deno.cwd(), DEFAULT_DB_DIR);
    if (typeof options.isLocal === "undefined") {
      options.isLocal = true;
    }
  }

  const dbPath = options.isLocal ? createLocalKV(options.path) : options.path;
  kv = await Deno.openKv(dbPath);
  console.log(`KV database initialized.`);

  return kv;
}
