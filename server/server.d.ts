import type { JWTPayload } from "jose";
export * from "./database/db.d.ts";
export * from "./dtos/index.d.ts";

export interface AccessTokenPayload extends JWTPayload {
  e2eeParticipantId: number | null;
}

export interface RefreshTokenPayload extends JWTPayload {}
