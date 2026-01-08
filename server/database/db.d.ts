export type Nullable<T> = T | null;

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
