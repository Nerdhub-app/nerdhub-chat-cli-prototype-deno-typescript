import { createRouter } from "@scope/core/router";
import { injectUserController } from "../controller/user.controller.ts";
import userE2EEParticipantRoutes from "./user.e2ee-participant.routes.ts";

const userController = injectUserController();

export const userRoutes = createRouter();

// Check username exists
userRoutes.get(
  "/check-username-exists/:username",
  userController.handleCheckUsernameExists,
);

// Check email exists
userRoutes.get(
  "/check-email-exists",
  userController.handleCheckEmailExists,
);

// E2EE participants routes
userRoutes.use("/:userId/e2ee_participants", userE2EEParticipantRoutes);

export default userRoutes;
