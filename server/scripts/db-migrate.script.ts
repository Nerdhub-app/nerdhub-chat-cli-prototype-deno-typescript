import { parseArgs } from "@std/cli";
import { runMigrations } from "../database/db.migrations.ts";

const args = parseArgs(Deno.args, {
  boolean: ["up", "down"],
  default: {
    up: false,
    down: false,
  },
});

const runUp = args.up || !args.down;
const runDown = args.down || !args.up;

await runMigrations(runUp, runDown);

Deno.exit();
