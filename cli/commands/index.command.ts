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
import { LocalEncryptionKeyManager } from "../../primitives/local-encryption/local-encryption-key.manager.ts";
import { WrappedFetchResponseError } from "../helpers/api-fetch.helper.ts";

// CRON jobs
import "../crons/index.ts";

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
  .globalEnv(
    "LOCAL_ENCRYPTION_KEY_PATH <path:string>",
    "The path the to the `.pem` file of local encryption key.",
  )
  .globalOption(
    "-lk, --local-encryption-key-path <path:string>",
    "The path the to the `.pem` file of local encryption key.",
  )
  .globalOption(
    "-cred.e, --auth-credentials.email <email:string>",
    "Authentication credentials: Email",
  )
  .globalOption(
    "-cred.p, --auth-credentials.password <password:string>",
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
      let res: Awaited<ReturnType<typeof AuthAPI.login>>;
      try {
        console.log("Logging in using the login credentials ...");
        res = await AuthAPI.login(cred as Required<typeof cred>);
      } catch (e) {
        if (e instanceof WrappedFetchResponseError) {
          const error = e as WrappedFetchResponseError<{ message: string }>;
          console.log(
            colors.red(`The login failed: ${error.bodyJSON.message}`),
          );
          Deno.exit();
        } else throw e;
      }
      const { user, access_token } = res.bodyJSON;
      cliContext.isAuthenticated = true;
      cliContext.user = user;
      cliContext.jwt = access_token;
    } else if (options.authJwt) {
      cliContext.jwt = options.authJwt as string;
      let res: Awaited<ReturnType<typeof AuthAPI.getAuthUser>>;
      try {
        console.log(
          "Getting the authenticated user specified by the provided JWT ...",
        );
        res = await AuthAPI.getAuthUser();
      } catch (e) {
        if (e instanceof WrappedFetchResponseError) {
          const error = e as WrappedFetchResponseError<{ message: string }>;
          console.log(
            colors.red(
              `Could not retrieve the authenticated user: ${error.bodyJSON.message}`,
            ),
          );
          Deno.exit();
        } else throw e;
      }
      const { user, e2eeParticipant } = res.bodyJSON;
      cliContext.isAuthenticated = true;
      cliContext.user = user;
      cliContext.e2eeParticipant = e2eeParticipant;
    }
    if (options.localEncryptionKeyPath) {
      console.log(
        "Retrieving the local encryption key from the provided `.pem` file path ...",
      );
      const keyManager = new LocalEncryptionKeyManager();
      cliContext.localEncryptionKey = keyManager.retrieveKey(
        options.localEncryptionKeyPath,
      );
    }
    // Initializing the database
    console.log("Database setup ...");
    initDatabase({
      path: options.sqliteDb,
      isLocal: options.localSqliteDb,
    });
    console.clear();
  })
  .action(async () => {
    // Router initialization
    await CLIRouter.init({ name: "Index" });
  })
  // Subcommands
  .command(DB_RESET_COMMAND, dbResetCommand);
