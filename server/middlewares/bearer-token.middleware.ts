import { type JWTVerificationError, verifyJWT } from "../utils/jwt.utils.ts";
import type { AccessTokenPayload } from "../server.d.ts";

export class BearerTokenError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function handleBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new BearerTokenError("The `Authorization` header is required");
  }

  try {
    const access_token = authHeader.replace("Bearer ", "");
    const payload = await verifyJWT(access_token) as AccessTokenPayload;
    return {
      payload,
      access_token,
    };
  } catch (error) {
    const e = error as JWTVerificationError | Error;
    if ("code" in e) {
      throw new BearerTokenError(
        "Failed to verify bearer token authorization header",
      );
    }
    throw e;
  }
}
