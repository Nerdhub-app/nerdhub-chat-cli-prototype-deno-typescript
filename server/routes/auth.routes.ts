import { createRouter } from "@scope/core/router";
import { injectAuthController } from "../controller/auth.controller.ts";
import validateRequestBodySchema from "../middlewares/validate-body-schema.middleware.ts";
import {
  userSigninRequestSchema,
  userSignupRequestSchema,
} from "../dtos/auth.dto.ts";
import { authenticateRoute } from "../middlewares/auth-route.middleware.ts";

const authController = injectAuthController();

export const authRoutes = createRouter();

// User sign up
authRoutes.post(
  "/signup",
  validateRequestBodySchema(userSignupRequestSchema),
  authController.handleSignup,
);

// User sign in
authRoutes.post(
  "/signin",
  validateRequestBodySchema(userSigninRequestSchema),
  authController.handleSignin,
);

// Get auth user
authRoutes.get("/me", authenticateRoute(), authController.handleGetAuthUser);

// Refresh auth token
authRoutes.get(
  "/refresh-token",
  authenticateRoute({ refreshToken: true }),
  authController.handleRefreshToken,
);

// Sign out
authRoutes.delete(
  "/signout",
  authenticateRoute({ refreshToken: true }),
  authController.handleSignout,
);

export default authRoutes;
