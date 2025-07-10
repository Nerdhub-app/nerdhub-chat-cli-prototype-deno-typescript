import { parseArgs } from "@std/cli";
import tablesMigrations from "./database/db.migrations.ts";

const args = parseArgs(Deno.args, {
  boolean: ["up", "down"],
  default: {
    up: false,
    down: false,
  },
});

const runUp = args.up || !args.down;
const runDown = args.down || !args.up;
if (runDown) {
  for (let i = tablesMigrations.length - 1; i >= 0; i--) {
    const migration = tablesMigrations[i];
    console.log(
      `%cDeleting the ${migration.tableName} table ...`,
      "color: red",
    );
    await migration.down();
  }
}
if (runUp) {
  for (const migration of tablesMigrations) {
    console.log(
      `%cCreating the ${migration.tableName} table ...`,
      "color: blue",
    );
    await migration.up();
  }
}

Deno.exit();
