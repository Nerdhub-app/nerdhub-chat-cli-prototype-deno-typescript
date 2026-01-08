import { createRouter } from "@scope/core/router";
import { authenticateRoute } from "../middlewares/auth-route.middleware.ts";
import validateRequestBodySchema from "../middlewares/validate-body-schema.middleware.ts";
import { createManyOnetimePreKeysRequestSchema } from "../dtos/e2ee-participant-onetime-prekey.dto.ts";
import { injectE2EEParticipantOnetimePreKeyController } from "../controller/e2ee-participant-onetime-prekey.controller.ts";
import requireDeviceHash from "../middlewares/require-device-hash.middleware.ts";

const e2eeParticipantOnetimePreKeyController =
  injectE2EEParticipantOnetimePreKeyController();

export const userE2EEParticipantOnetimePreKeyRoutes = createRouter();

// Create many one-time prekeys
userE2EEParticipantOnetimePreKeyRoutes.post(
  "/",
  authenticateRoute({ fetchAuthUser: true, fetchE2EEParticipant: true }),
  requireDeviceHash,
  validateRequestBodySchema(createManyOnetimePreKeysRequestSchema),
  e2eeParticipantOnetimePreKeyController.handleCreateManyOnetimePreKeys,
);

export default userE2EEParticipantOnetimePreKeyRoutes;
