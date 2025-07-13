import type {
  E2EEParticipant,
  OnetimePreKey,
  UserWithoutPassword,
} from "../server.d.ts";
import type {
  userLoginPayloadSchema,
  userRegistrationPayloadSchema,
} from "./validator/auth.schema.ts";

// #region Auth

export type UserRegistrationRequestPayload = ReturnType<
  typeof userRegistrationPayloadSchema.parse
>;
export type UserRegistrationResponsePayload = {
  user: UserWithoutPassword;
  access_token: string;
};

export type UserLoginRequestPayload = ReturnType<
  typeof userLoginPayloadSchema.parse
>;
export type UserLoginResponsePayload = UserRegistrationResponsePayload & {
  e2eeParticipant: E2EEParticipant | null;
};

// #endregion

// #region E2EE participant

export type CreateE2EEParticipantRequestPayload = Record<
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature",
  string
>;
export type CreateE2EEParticipantResponsePayload = E2EEParticipant;

export type UpdateE2EEParticipantPreKeyBundleRequestPayload = Record<
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature",
  string
>;
export type UpdateE2EEParticipantPreKeyBundleResponsePayload = E2EEParticipant;

// #endregion

// #region E2EE participant one-time prekeys

export type CreateManyOnetimePreKeysRequestPayload = {
  id: string;
  pubKey: string;
}[];
export type CreateManyOnetimePreKeysResponsePayload = OnetimePreKey[];

// #endregion
