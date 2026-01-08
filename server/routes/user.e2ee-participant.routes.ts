import { createRouter } from "@scope/core/router";
import { authenticateRoute } from "../middlewares/auth-route.middleware.ts";
import validateRequestBodySchema from "../middlewares/validate-body-schema.middleware.ts";
import {
  createE2EEParticipantRequestSchema,
  updateE2EEParticipantPreKeyBundleRequestSchema,
} from "../dtos/e2ee-participant.dto.ts";
import requireDeviceHash from "../middlewares/require-device-hash.middleware.ts";
import { injectE2EEParticipantController } from "../controller/e2ee-participant.controller.ts";
import userE2EEParticipantOnetimePreKeyRoutes from "./user.e2ee-participant.onetime-prekey.routes.ts";

const e2eeParticipantController = injectE2EEParticipantController();

export const userE2EEParticipantRoutes = createRouter();

// Create E2EE participant
userE2EEParticipantRoutes.post(
  "/",
  authenticateRoute({ fetchAuthUser: true }),
  requireDeviceHash,
  validateRequestBodySchema(createE2EEParticipantRequestSchema),
  e2eeParticipantController.handleCreateE2EEParticipant,
);

// Update E2EE participant prekey bundle
userE2EEParticipantRoutes.patch(
  "/:e2eeParticipantId/prekey_bundle",
  authenticateRoute({ fetchAuthUser: true, fetchE2EEParticipant: true }),
  requireDeviceHash,
  validateRequestBodySchema(updateE2EEParticipantPreKeyBundleRequestSchema),
  e2eeParticipantController.handleUpdateE2EEParticipantPreKeyBundle,
);

// One-time prekeys routes
userE2EEParticipantRoutes.use(
  "/:e2eeParticipantId/onetime_prekeys",
  userE2EEParticipantOnetimePreKeyRoutes,
);

export default userE2EEParticipantRoutes;
