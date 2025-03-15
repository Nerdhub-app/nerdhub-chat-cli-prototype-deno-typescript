import { parseArgs } from "@std/cli";
import { resetLocalKV } from "./kv.connection.ts";

const args = parseArgs(Deno.args, {
  string: ["path"],
  default: {
    path: Deno.env.get("KV_PATH"),
  },
});

resetLocalKV(args.path);
