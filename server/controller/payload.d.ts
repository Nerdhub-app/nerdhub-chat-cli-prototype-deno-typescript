import type {
  E2EEParticipant,
  OnetimePreKey,
  UserWithoutPassword,
} from "../server.d.ts";
import type {
  userLoginPayloadSchema,
  userRegistrationPayloadSchema,
} from "./validator/auth.schema.ts";
import type {
  createE2EEParticipantPayloadSchema,
  updateE2EEParticipantPreKeyBundlePayloadSchema,
} from "./validator/e2ee-participant.schema.ts";

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

export type CreateE2EEParticipantRequestPayload = ReturnType<
  typeof createE2EEParticipantPayloadSchema.parse
>;
export type CreateE2EEParticipantResponsePayload = E2EEParticipant;

export type UpdateE2EEParticipantPreKeyBundleRequestPayload = ReturnType<
  typeof updateE2EEParticipantPreKeyBundlePayloadSchema.parse
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
