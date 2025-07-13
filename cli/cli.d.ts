import type { Buffer } from "node:buffer";
import type {
  E2EEParticipant as ServerE2EEParticipant,
  UserWithoutPassword,
} from "@scope/server/types";

export type Nullable<T> = T | null;

export type User = UserWithoutPassword;

export type E2EEParticipant = ServerE2EEParticipant;

export type E2EEParticipantPrekeyBundle = {
  user_id: string;
  pub_identity_key: Buffer;
  priv_identity_key: Buffer;
  pub_signed_prekey: Buffer;
  pub_signed_prekey_signature: Buffer;
  priv_signed_prekey: Buffer;
  is_published: boolean;
  participant_id: Nullable<string>;
  created_at: Date;
  updated_at: Date;
};

export type E2EEParticipantOnetimePrekey = {
  id: string;
  pub_key: Buffer;
  priv_key: Buffer;
  is_published: boolean;
  user_id: string;
  participant_id: Nullable<string>;
  created_at: Date;
  updated_at: Date;
};
