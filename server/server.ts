import { parseArgs } from "@std/cli";
import getConnectionsPool from "./database/db.pool.ts";
// import { initKV } from "./database/kv.connection.ts";
import createRouter from "./router.ts";

// Controllers
import AuthController from "./controller/auth.controller.ts";
import E2EEParticipantController from "./controller/e2ee-participant.controller.ts";
import E2EEParticipantOnetimePreKeysController from "./controller/e2ee-participant-onetime-prekeys.controller.ts";
import RealTimeController from "./controller/real-time.controller.ts";

// Middlewares
import appExceptionHandler from "./middlewares/app-exception-handler.middleware.ts";
import mysqlErrorHandler from "./middlewares/mysql-error-handler.middleware.ts";
import requireBearerToken from "./middlewares/require-bearer-token.middleware.ts";
import authUserMustExist from "./middlewares/auth-user-must-exist.middleware.ts";
import userIdRequestParamMatchesAuthUser from "./middlewares/user-id-param-matches.middleware.ts";
import requireDeviceHash from "./middlewares/require-device-hash.middleware.ts";
import e2eeParticipantMustExist from "./middlewares/e2ee-participant-must-exist.middleware.ts";
import e2eeParticipantIdParamMatchesAuthE2EEParticipant from "./middlewares/e2ee-participant-id-param-matches.middleware.ts";
import validateRequestBodySchema from "./middlewares/validate-body-schema.middleware.ts";

// Request payload schemas
import {
  userLoginPayloadSchema,
  userRegistrationPayloadSchema,
} from "./controller/validator/auth.schema.ts";
import {
  createE2EEParticipantPayloadSchema,
  updateE2EEParticipantPreKeyBundlePayloadSchema,
} from "./controller/validator/e2ee-participant.schema.ts";

// #region MySQL connection

const conn = await getConnectionsPool().getConnection();
console.log("Connected the MySQL database ...");
conn.release();

// #endregion

// #region Deno args

const args = parseArgs(Deno.args, {
  string: ["port", "kv"],
  boolean: ["local-kv"],
  default: {
    port: Deno.env.get("PORT") || "8000",
    kv: Deno.env.get("KV_PATH"),
  },
});

// #endregion

// // #region KV database setup

// await initKV({
//   isLocal: args["local-kv"],
//   path: args.kv,
// });

// // #endregion

// #region Routing

const router = createRouter();

// Auth
router.post(
  "/api/auth/register",
  validateRequestBodySchema(userRegistrationPayloadSchema),
  AuthController.handleRegistration,
);
router.post(
  "/api/auth/login",
  validateRequestBodySchema(userLoginPayloadSchema),
  AuthController.handleLogin,
);
router.get(
  "/api/auth/me",
  requireBearerToken,
  authUserMustExist,
  AuthController.handleGetAuthUser,
);
router.get(
  "/api/auth/access_token",
  requireBearerToken,
  authUserMustExist,
  AuthController.handleGetAccessToken,
);

// E2EE participants
router.post(
  "/api/users/:userId/e2ee_participants",
  requireBearerToken,
  authUserMustExist,
  userIdRequestParamMatchesAuthUser,
  requireDeviceHash,
  validateRequestBodySchema(createE2EEParticipantPayloadSchema),
  E2EEParticipantController.handleCreateE2EEParticipant,
);
router.patch(
  "/api/users/:userId/e2ee_participants/:e2eeParticipantId/prekey_bundle",
  requireBearerToken,
  authUserMustExist,
  userIdRequestParamMatchesAuthUser,
  e2eeParticipantMustExist,
  e2eeParticipantIdParamMatchesAuthE2EEParticipant,
  validateRequestBodySchema(updateE2EEParticipantPreKeyBundlePayloadSchema),
  E2EEParticipantController.handleUpdateE2EEParticipantPreKeyBundle,
);

// E2EE participants one-time prekeys
router.post(
  "/api/users/:userId/e2ee_participants/:e2eeParticipantId/onetime_prekeys",
  requireBearerToken,
  authUserMustExist,
  userIdRequestParamMatchesAuthUser,
  e2eeParticipantMustExist,
  e2eeParticipantIdParamMatchesAuthE2EEParticipant,
  E2EEParticipantOnetimePreKeysController.handleCreateManyOnetimePreKeys,
);

// Real-Time communications through websockets
router.use("/rt", RealTimeController.handleRealTimeHandshake);

// MySQL error handler
router.use(mysqlErrorHandler);

// App exception handler
router.use(appExceptionHandler);

// #endregion

// #region Server setup

router.listen(args.port);
