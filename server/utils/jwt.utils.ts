import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import { parseArgs } from "@std/cli";

const args = parseArgs(Deno.args, {
  string: ["jwt-secret"],
  default: {
    "jwt-secret": Deno.env.get("JWT_SECRET") || "my-secret-jwt",
  },
});

const SECRET = new TextEncoder().encode(args["jwt-secret"]);

export function createJWT<T extends JWTPayload = JWTPayload>(
  payload: T,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload;
}

export type JWTVerificationError = {
  code: string;
  name: string;
};
