import { onRequest } from "@scope/core/router";
import type { AuthRouteMiddlewareContext } from "../middlewares/auth-route.middleware.ts";
import ForbiddenException from "../exceptions/forbidden.exception.ts";

/**
 * Wrapper decorator that matches the auth user id with the request parameter
 * @param userIdParamName The name of the request parameter to match with the auth user id
 */
export function authUserMatchesUserIdParam(userIdParamName: string = "userId") {
  return onRequest<
    Record<string, unknown>,
    Record<string, string>,
    AuthRouteMiddlewareContext,
    unknown
  >((req) => {
    const { authUser } = req.context;
    const userIdParam = req.params[userIdParamName];
    if (authUser && authUser.id !== userIdParam) {
      throw new ForbiddenException(
        `Your user id does not match the \`${userIdParamName}\` request parameter`,
      );
    }
  });
}

/**
 * Wrapper decorator that matches the auth e2ee participant id with the request parameter
 * @param e2eeParticipantIdParamName The name of the request parameter to match with the auth e2ee participant id
 */
export function authE2EEParticipantMatchesE2EEParticipantIdParam(
  e2eeParticipantIdParamName = "e2eeParticipantId",
) {
  return onRequest<
    Record<string, unknown>,
    Record<string, string>,
    AuthRouteMiddlewareContext,
    unknown
  >((req) => {
    const { e2eeParticipant } = req.context;
    const e2eeParticipantIdParam = req.params[e2eeParticipantIdParamName];
    if (e2eeParticipant && e2eeParticipant.id !== e2eeParticipantIdParam) {
      throw new ForbiddenException(
        `Your e2ee participant id does not match the \`${e2eeParticipantIdParamName}\` request parameter`,
      );
    }
  });
}
