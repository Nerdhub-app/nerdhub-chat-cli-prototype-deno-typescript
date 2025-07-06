import { Command } from "@cliffy/command";
import { runMigrations } from "../database/migrations.ts";
import { db } from "../database/db.connection.ts";

export const DB_RESET_COMMAND = "db-reset";

const dbResetCommand = new Command()
  .description("Resets the database")
  .action(() => {
    runMigrations(db, true);
    Deno.exit();
  });

export default dbResetCommand;
