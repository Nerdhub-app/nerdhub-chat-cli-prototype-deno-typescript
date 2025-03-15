import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export let db!: DatabaseSync;

const DEFAULT_DB_DIR = "db/cli";
const DEFAULT_DB_FILE = "cli.db";

export type InitDatabaseOptions = {
  path?: string;
  isLocal?: boolean;
};

export function initDatabase(options: InitDatabaseOptions) {
  if (!options.path) {
    options.path = path.resolve(Deno.cwd(), DEFAULT_DB_DIR);
    if (typeof options.isLocal === "undefined") {
      options.isLocal = true;
    }
  }

  let dbPath: string;

  if (options.isLocal) {
    const dir = path.resolve(options.path);

    try {
      const stat = Deno.statSync(dir);
      if (!stat.isDirectory) {
        throw new Error("The database path is not a directory");
      }
    } catch (_) {
      Deno.mkdirSync(dir, { recursive: true });
    }

    dbPath = path.join(dir, DEFAULT_DB_FILE);
  } else {
    dbPath = options.path;
  }

  db = new DatabaseSync(dbPath);
  console.log("SQLite database has been initialized.");

  return db;
}
