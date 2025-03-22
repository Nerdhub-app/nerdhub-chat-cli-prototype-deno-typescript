import { colors } from "@cliffy/ansi/colors";
import { Command } from "@cliffy/command";
import {
  cliContext,
  DEFAULT_SERVER_HOST,
  DEFAULT_SERVER_PORT,
} from "../context.ts";
import { CLIRouter } from "../router/router.ts";
import { initDatabase } from "../database/db.connection.ts";
import dbResetCommand, { DB_RESET_COMMAND } from "./db-reset.command.ts";
import AuthAPI from "../api/auth.api.ts";
import type { UserLoginResponseDTO } from "@scope/server/types";

export const indexCommand = new Command()
  .name("Signal Protocol chat CLI")
  .version("0.0.1")
  .description("Signal Protocol chat CLI Main Menu")
  .globalEnv("SERVER_PORT <server-port:integer>", "HTTP server port")
  .globalOption(
    "-sp, --server-port <server-port:integer>",
    "HTTP server port",
  )
  .globalEnv("SERVER_URL <server-url:string>", "HTTP server URL")
  .globalOption("-surl, --server-url <server-url:string>", "HTTP server URL")
  .globalEnv("SERVER_HOST <server-host:string>", "HTTP server host")
  .globalOption(
    "-shost, --server-host <server-host:string>",
    "HTTP server host",
  )
  .globalEnv("SQLITE_DB <sqlite-db:string>", "SQLite 3 database path")
  .globalOption(
    "-db, --sqlite-db <sqlite-db:string>",
    "SQLite 3 database path",
  )
  .globalEnv(
    "LOCAL_SQLITE_DB <local-db:boolean>",
    "Whether to use a local SQLite DB. If enabled, the SQLite database must be a directory path.",
  )
  .globalOption(
    "-ldb, --local-sqlite-db [local-db:boolean]",
    "Whether to use a local SQLite DB. If enabled, the SQLite database must be a directory path.",
  )
  .globalEnv("AUTH_JWT <token:string>", "Access token JWT")
  .globalOption("-jwt, --auth-jwt <jwt:string>", "Access token JWT")
  .globalOption(
    "-cred.e, --auth-credentials.email <jwt:string>",
    "Authentication credentials: Email",
  )
  .globalOption(
    "-cred.p, --auth-credentials.password <jwt:string>",
    "Authentication credentials: Password",
  )
  .globalAction(async (options) => {
    // Initializing the context
    if (options.serverUrl) {
      cliContext.serverURL = options.serverUrl;
    } else if (options.serverHost || options.serverPort) {
      const host = options.serverHost ?? DEFAULT_SERVER_HOST;
      const port = options.serverPort ?? DEFAULT_SERVER_PORT;
      cliContext.serverURL = `${host}:${port}`;
    }
    if (options.authCredentials) {
      const cred = options.authCredentials;
      if (!cred.email || !cred.password) {
        console.log(colors.red("The email or password is missing."));
        Deno.exit();
      }
      const res = await AuthAPI.login(cred as Required<typeof cred>);
      if (!res.ok) {
        const { message } = await res.json() as { message: string };
        console.log(colors.red(`The login failed: ${message}`));
        Deno.exit();
      }
      const { user, access_token } = await res.json() as UserLoginResponseDTO;
      cliContext.isAuthenticated = true;
      cliContext.user = user;
      cliContext.jwt = access_token;
    } else if (options.authJwt) {
      cliContext.jwt = options.authJwt as string;
      const res = await AuthAPI.getAuthUser();
      if (!res.ok) {
        const { message } = await res.json() as { message: string };
        console.log(colors.red(`The login failed: ${message}`));
        Deno.exit();
      }
      const { user, e2eeParticipant } = await res
        .json() as UserLoginResponseDTO;
      cliContext.isAuthenticated = true;
      cliContext.user = user;
      cliContext.e2eeParticipant = e2eeParticipant;
    }
    initDatabase({
      path: options.sqliteDb,
      isLocal: options.localSqliteDb,
    });
  })
  .action(async () => {
    await CLIRouter.init({ name: "Index" });
  })
  // Subcommands
  .command(DB_RESET_COMMAND, dbResetCommand);
