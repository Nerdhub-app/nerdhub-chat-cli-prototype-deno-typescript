import type {
  RequestHandlerNextFunction,
  RouterRequest,
  RouterResponse,
} from "@scope/core/router";
import type { E2EEParticipant, User } from "../database/db.d.ts";
import UnauthorizedException from "../exceptions/unauthorized.exception.ts";
import { type JWTVerificationError, verifyJWT } from "../utils/jwt.utils.ts";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "@scope/server/types";
import { injectUserRepository } from "../repository/user.repository.ts";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from "../configs/auth.config.ts";
import { connectToKv } from "../kv/kv.connection.ts";
import { KVNamespace } from "../kv/kv.consts.ts";
import ForbiddenException from "../exceptions/forbidden.exception.ts";
import { injectE2EEParticipantRepository } from "../repository/e2ee-participant.repository.ts";

const userRepository = injectUserRepository();
const e2eeParticipantRepository = injectE2EEParticipantRepository();

const kv = await connectToKv();

/**
 * Context object for the authenticateRoute middleware.
 */
export type AuthRouteMiddlewareContext<TContext = Record<string, unknown>> = {
  authUserId: number;
  authUser: User;
  e2eeParticipantId?: number | null;
  e2eeParticipant?: E2EEParticipant;
  access_token?: string;
  refresh_token?: string;
  tokenExpiresAt?: number;
} & TContext;

/**
 * Options to configure the authenticateRoute middleware.
 */
export type AuthRouteMiddlewareOptions = {
  /**
   * Whether to fetch the authenticated user from the database.
   * If true, the context will contain the authenticated user in the `authUser` property.
   */
  fetchAuthUser?: boolean;
  /**
   * Whether to use verify the bearer token as a refresh token.
   */
  refreshToken?: boolean;
  /**
   * Whether to fetch the authenticated e2ee participant from the database.
   * If true, the context will contain the authenticated e2ee participant in the `e2eeParticipant` property.
   */
  fetchE2EEParticipant?: boolean;
};

/**
 * Middleware to authenticate a route using a bearer token.
 *
 * @param options - Options to configure the middleware.
 * @returns A middleware function that authenticates the route.
 */
export function authenticateRoute(options?: AuthRouteMiddlewareOptions) {
  const {
    fetchAuthUser = true,
    refreshToken = false,
    fetchE2EEParticipant = false,
  } = options ?? {};

  return async function (
    req: RouterRequest<
      Record<string, unknown>,
      Record<string, string>,
      AuthRouteMiddlewareContext,
      unknown
    >,
    _res: RouterResponse,
    next: RequestHandlerNextFunction,
  ) {
    const { _request: request } = req;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      throw new UnauthorizedException("The `Authorization` header is required");
    }

    try {
      const token = authHeader.replace("Bearer ", "");

      // Making sure that the refresh token is still valid
      if (refreshToken) {
        const { value: refreshTokenIsBlackListed } = await kv.get<boolean>(
          [KVNamespace.BlackListRefreshToken, token],
        );
        if (refreshTokenIsBlackListed) {
          throw new ForbiddenException(
            "Blacklisted refresh token",
          );
        }
      }

      const secret = refreshToken ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
      const payload = await verifyJWT(token, secret) as
        | AccessTokenPayload
        | RefreshTokenPayload;

      let authUserId: number | null = null;

      // Extracting user-related and e2ee participant-related data from the access token
      const context = req.context;
      if (payload.sub) {
        authUserId = parseInt(payload.sub);
        context.authUserId = authUserId;
      }
      if (payload.e2eeParticipantId) {
        const e2eeParticipantId = payload.e2eeParticipantId as number | null;
        context.e2eeParticipantId = e2eeParticipantId;

        // Fetching the authenticated e2ee participant from the database if required
        if (fetchE2EEParticipant && e2eeParticipantId !== null) {
          const e2eeParticipant = await e2eeParticipantRepository.findById(
            e2eeParticipantId,
          );
          if (!e2eeParticipant) {
            throw new UnauthorizedException(
              "Could not find the authenticated e2ee participant specified by access token",
            );
          }
          context.e2eeParticipant = e2eeParticipant;
        }
      }
      if (refreshToken) {
        context.refresh_token = token;
      } else {
        context.access_token = token;
      }
      context.tokenExpiresAt = payload.exp;

      // Fetching the authenticated user from the database if required
      if (fetchAuthUser && authUserId !== null) {
        const authUser = await userRepository.findById(authUserId);
        if (!authUser) {
          throw new UnauthorizedException(
            "Could not find the authenticated user specified by access token",
          );
        }
        context.authUser = authUser;
      }

      next();
    } catch (error) {
      const e = error as JWTVerificationError | Error;
      if ("code" in e) {
        throw new UnauthorizedException(
          "Failed to verify the bearer token authorization header",
        );
      }
      throw e;
    }
  };
}
