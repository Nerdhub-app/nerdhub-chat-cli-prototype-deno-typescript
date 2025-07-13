import type { JWTPayload } from "jose";

export type Entity<T> = T & {
  id: number;
  created_at: string;
  updated_at: string;
};

export type User = Entity<{
  firstname: string;
  lastname: string;
  username: string;
  has_e2ee_participant: boolean;
  email: string;
  password: string;
}>;

export type UserWithoutPassword = Omit<
  User,
  "password"
>;

export type E2EEParticipant = Entity<{
  device_id: string;
  pub_identity_key: string; // Public key as base64 string
  pub_signed_prekey: string; // Public key as base64 string
  signed_prekey_signature: string; // base64 string
  user_id: number;
}>;

export type OnetimePreKey = {
  id: string;
  pub_key: string; // Public key as base64 string
  created_at: string;
  participant_id: number;
};

export interface AccessTokenPayload extends JWTPayload {
  e2eeParticipantId: number | null;
}

export type RequestAccessTokenContext = {
  access_token: string;
  authUserId: number;
  e2eeParticipantId: number | null;
};

export type RequestAuthUserContext = {
  authUser: User;
};

export type RequestDeviceHashContext = {
  deviceHash: string;
};

export type RequestE2EEParticipantContext = {
  e2eeParticipant: E2EEParticipant;
};

export type DBTableName =
  | "users"
  | "e2ee_participants"
  | "e2ee_participant_onetime_prekeys";
