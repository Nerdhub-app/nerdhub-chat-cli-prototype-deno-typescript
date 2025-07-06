import { type JWTVerificationError, verifyJWT } from "../utils/jwt.utils.ts";
import type {
  AccessTokenPayload,
  RequestAccessTokenContext,
} from "../server.d.ts";
import AppException from "../helpers/app-exception.helper.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";

export default async function requireBearerToken(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const { request } = req;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    throw new AppException({
      status: HttpReponseStatus.UNAUTHORIZED,
      message: "The `Authorization` header is required",
    });
  }

  try {
    const access_token = authHeader.replace("Bearer ", "");
    const payload = await verifyJWT(access_token) as AccessTokenPayload;
    const context = req.context as RequestAccessTokenContext;
    context.authUserId = payload.sub;
    context.e2eeParticipantId = payload.e2eeParticipantId;
    context.access_token = access_token;
    next();
  } catch (error) {
    const e = error as JWTVerificationError | Error;
    if ("code" in e) {
      throw new AppException({
        message: "Failed to verify bearer token authorization header",
        status: HttpReponseStatus.UNAUTHORIZED,
      });
    }
    throw e;
  }
}
