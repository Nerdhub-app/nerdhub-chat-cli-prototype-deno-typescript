import type { JWTPayload } from "jose";

export type Entity<T> = T & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type User = Entity<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  e2eeParticipantsIds: string[];
}>;

export type UserWithoutPassword = Omit<
  User,
  "password" | "e2eeParticipantsIds"
>;

export type UserRegistrationDTO = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type UserRegistrationResponseDTO = {
  user: UserWithoutPassword;
  access_token: string;
};

export type UserLoginDTO = Record<"email" | "password", string>;

export type OnetimePreKey = {
  id: string;
  pubKey: string; // Public key as base64 string
  createdAt: number;
};

export type E2EEParticipant = Entity<{
  userId: string;
  deviceId: string;
  pubIdentityKey: string; // Public key as base64 string
  pubSignedPreKey: string; // Public key as base64 string
  signedPreKeySignature: string; // base64 string
}>;

export type E2EEParticipantWithoutOnetimePreKeys = E2EEParticipant;

export type UserLoginResponseDTO =
  & UserRegistrationResponseDTO
  & {
    e2eeParticipant:
      | E2EEParticipantWithoutOnetimePreKeys
      | null;
  };

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  e2eeParticipantId: string | null;
}

export type RequestAccessTokenContext = {
  access_token: string;
  authUserId: string;
  e2eeParticipantId: string | null;
};

export type RequestAuthUserContext = {
  authUser: User;
  e2eeParticipant?: E2EEParticipant;
};

export type RequestDeviceHashContext = {
  deviceHash: string;
};

export type RequestE2EEParticipantContext = {
  e2eeParticipant: E2EEParticipant;
};
