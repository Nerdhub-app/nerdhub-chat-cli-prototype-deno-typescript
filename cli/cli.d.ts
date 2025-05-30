import type { Buffer } from "node:buffer";
import type {
  E2EEParticipant as ServerE2EEParticipant,
  UserWithoutPassword,
} from "@scope/server/types";

export type User = UserWithoutPassword;

export type E2EEParticipant = ServerE2EEParticipant;

export type E2EEParticipantPrekeyBundle = {
  user_id: string;
  participant_id: string;
  pub_identity_key: Buffer;
  priv_identity_key: Buffer;
  pub_signed_prekey: Buffer;
  pub_signed_prekey_signature: Buffer;
  priv_signed_prekey: Buffer;
};
