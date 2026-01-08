import { parseArgs } from "@std/cli";
import {
  SERVER_PORT,
  UNRETURNED_HTTP_RESPONSE_TIMEOUT,
} from "./configs/server.config.ts";
import injectConnectionsPool from "./database/db.pool.ts";
import { connectToKv } from "./kv/kv.connection.ts";

// Controllers
import { injectRealTimeController } from "./controller/real-time.controller.ts";

// Middlewares
import mysqlErrorHandler from "./middlewares/mysql-error-handler.middleware.ts";

// Request payload schemas
import { createAppRouter } from "@scope/core/router";
import userRoutes from "./routes/user.routes.ts";
import requestExceptionHandler from "./middlewares/request-exception-handler.middleware.ts";
import authRoutes from "./routes/auth.routes.ts";

// #region MySQL connection

const conn = await injectConnectionsPool().getConnection();
console.log("Connected the MySQL database ...");
conn.release();

// #endregion

// #region KV connection

await connectToKv();
console.log("Connected to KV ...");

// #endregion

// #region Routing

// Inject controllers
const realTimeController = injectRealTimeController();

const router = createAppRouter({
  unreturnedRequestTimeout: UNRETURNED_HTTP_RESPONSE_TIMEOUT,
});

// Auth API routes
router.use("/api/auth", authRoutes);

// User API routes
router.use("/api/users", userRoutes);

// Real-Time communications through websockets
router.use(
  "/rt",
  realTimeController.handleRealTimeHandshake,
);

// MySQL error handler
router.use(mysqlErrorHandler);

// Request exceptions handler
router.use(requestExceptionHandler);

// #endregion

// #region Server setup

const args = parseArgs(Deno.args, {
  string: ["port"],
  default: {
    port: SERVER_PORT,
  },
});

Deno.serve({
  port: Number(args.port),
  handler: router.handleDenoRequest,
});
