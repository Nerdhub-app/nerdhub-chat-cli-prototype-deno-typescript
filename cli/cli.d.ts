import type { Buffer } from "node:buffer";
import type {
  E2EEParticipant as ServerE2EEParticipant,
  UserWithoutPassword,
} from "@scope/server/types";

export type Nullable<T> = T | null;

export type Replace<T, TKeys extends keyof T, TField> =
  & Omit<T, TKeys>
  & Record<TKeys, TField>;

export type ReplaceRowTimestamps<
  T extends Record<"created_at" | "updated_at", Date>,
> = Replace<T, "created_at" | "updated_at", number>;

export type User = UserWithoutPassword;

export type E2EEParticipant = ServerE2EEParticipant;

export type DbTableName =
  | "e2ee_participant_onetime_prekeys"
  | "e2ee_participant_prekey_bundles";

export type E2EEParticipantPrekeyBundle = {
  user_id: number;
  pub_identity_key: Buffer;
  priv_identity_key: Buffer;
  pub_signed_prekey: Buffer;
  priv_signed_prekey: Buffer;
  signed_prekey_signature: Buffer;
  is_published: boolean;
  participant_id: Nullable<number>;
  created_at: Date;
  updated_at: Date;
};

export type E2EEParticipantPrekeyBundleRow = ReplaceRowTimestamps<
  Replace<
    Replace<
      E2EEParticipantPrekeyBundle,
      | "pub_identity_key"
      | "priv_identity_key"
      | "pub_signed_prekey"
      | "priv_signed_prekey",
      Uint8Array
    >,
    "is_published",
    number
  >
>;

export type E2EEParticipantOnetimePrekey = {
  id: string;
  pub_key: Buffer;
  priv_key: Buffer;
  is_published: boolean;
  user_id: number;
  participant_id: Nullable<number>;
  created_at: Date;
  updated_at: Date;
};

export type E2EEParticipantOnetimePrekeyRow = ReplaceRowTimestamps<
  Replace<
    Replace<
      E2EEParticipantOnetimePrekey,
      | "pub_key"
      | "priv_key",
      Uint8Array
    >,
    "is_published",
    number
  >
>;
