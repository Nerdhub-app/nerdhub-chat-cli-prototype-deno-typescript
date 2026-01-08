import path from "node:path";
import { parseArgs } from "@std/cli";
import { KV_STORAGE_PATH, KV_URI } from "../configs/kv.config.ts";
import { KV_STORAGE_FILE } from "./kv.consts.ts";

const args = parseArgs(Deno.args, {
  string: ["kv-path", "kv-uri"],
  boolean: ["kv-memory"],
  default: {
    "kv-path": KV_STORAGE_PATH,
    "kv-memory": false,
    "kv-uri": KV_URI,
  },
});

// KV connection singleton
let kv: Deno.Kv;

/**
 * Connects to KV and returns the connection singleton
 * @returns KV connection
 */
export async function connectToKv() {
  if (!kv) {
    let kvPath: string;
    if (args["kv-memory"]) {
      kvPath = ":memory:";
    } else if (args["kv-uri"]) {
      kvPath = args["kv-uri"];
    } else {
      kvPath = path.join(args["kv-path"], KV_STORAGE_FILE);
      // Creating the KV local storage file if it does not exist yet
      let kvStorageFileExists: boolean;
      try {
        const stat = Deno.statSync(kvPath);
        kvStorageFileExists = stat.isFile;
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          kvStorageFileExists = false;
        } else throw e;
      }
      if (!kvStorageFileExists) {
        Deno.mkdirSync(path.dirname(kvPath), { recursive: true });
        Deno.writeFileSync(kvPath, new Uint8Array());
      }
    }
    kv = await Deno.openKv(kvPath);
  }
  return kv;
}
