import { type JWTPayload, jwtVerify, SignJWT } from "jose";

/**
 * Creates a JWT
 * @param payload The payload to be encoded
 * @param secret The secret to be used for encoding
 * @param expirationTime The expiration time of the JWT
 * @returns The encoded JWT
 */
export function createJWT<T extends JWTPayload = JWTPayload>(
  payload: T,
  secret: string,
  expirationTime: number | string | Date,
): Promise<string> {
  const encodedSecret = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(encodedSecret);
}

/**
 * Verifies a JWT
 * @param token The JWT to be verified
 * @param secret The secret to be used for verification
 * @returns The decoded JWT payload
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  const encodedSecret = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, encodedSecret);
  return payload;
}

export type JWTVerificationError = {
  code: string;
  name: string;
};
