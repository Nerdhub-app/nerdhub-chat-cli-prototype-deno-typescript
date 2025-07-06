import { Buffer } from "node:buffer";
import { db } from "../database/db.connection.ts";
import type { E2EEParticipantPrekeyBundle } from "../cli.d.ts";

export type GetE2EEParticipantPrekeyBundlesRow =
  & Pick<E2EEParticipantPrekeyBundle, "user_id" | "participant_id">
  & Record<
    | "pub_identity_key"
    | "priv_identity_key"
    | "pub_signed_prekey"
    | "pub_signed_prekey_signature"
    | "priv_signed_prekey",
    Uint8Array
  >
  & { is_published: number; created_at: number; updated_at: number };

export type CreateE2EEParticipantPrekeyBundlesDTO = {
  userId: string;
  pubIdentityKey: Buffer;
  privIdentityKey: Buffer;
  pubSignedPreKey: Buffer;
  pubSignedPreKeySignature: Buffer;
  privSignedPreKey: Buffer;
};

export type ResetE2EEParticipantPreKeyBundleDTO = Omit<
  CreateE2EEParticipantPrekeyBundlesDTO,
  "userId"
>;

export type UpdateE2EEParticipantIsPublishedDTO = {
  userId: string;
  participantId?: string;
};

export default class E2EEParticipantPrekeyBundleRepository {
  static getByUserId(
    userId: string,
  ): E2EEParticipantPrekeyBundle | null {
    const sql = `
    SELECT * FROM e2ee_participants_prekey_bundles
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const prekeyBundle = query.get(userId) as
      | GetE2EEParticipantPrekeyBundlesRow
      | undefined;
    if (!prekeyBundle) return null;
    return {
      user_id: prekeyBundle.user_id,
      pub_identity_key: Buffer.from(prekeyBundle.pub_identity_key),
      priv_identity_key: Buffer.from(prekeyBundle.priv_identity_key),
      pub_signed_prekey: Buffer.from(prekeyBundle.pub_signed_prekey),
      pub_signed_prekey_signature: Buffer.from(
        prekeyBundle.pub_signed_prekey_signature,
      ),
      priv_signed_prekey: Buffer.from(prekeyBundle.priv_signed_prekey),
      is_published: !!prekeyBundle.is_published,
      participant_id: prekeyBundle.participant_id,
      created_at: new Date(prekeyBundle.created_at),
      updated_at: new Date(prekeyBundle.updated_at),
    };
  }

  static create(
    dto: CreateE2EEParticipantPrekeyBundlesDTO,
  ): E2EEParticipantPrekeyBundle {
    const now = Date.now();
    const sql = `
    INSERT INTO e2ee_participants_prekey_bundles (
      user_id,
      pub_identity_key,
      priv_identity_key,
      pub_signed_prekey,
      pub_signed_prekey_signature,
      priv_signed_prekey,
      is_published,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const query = db.prepare(sql);
    query.run(
      dto.userId,
      dto.pubIdentityKey,
      dto.privIdentityKey,
      dto.pubSignedPreKey,
      dto.pubSignedPreKeySignature,
      dto.privSignedPreKey,
      0,
      now,
      now,
    );
    return {
      user_id: dto.userId,
      pub_identity_key: dto.pubIdentityKey,
      priv_identity_key: dto.privIdentityKey,
      pub_signed_prekey: dto.pubSignedPreKey,
      pub_signed_prekey_signature: dto.pubSignedPreKeySignature,
      priv_signed_prekey: dto.privSignedPreKey,
      is_published: false,
      participant_id: null,
      created_at: new Date(now),
      updated_at: new Date(now),
    };
  }

  static publishForUserId(dto: UpdateE2EEParticipantIsPublishedDTO) {
    const sql = `
    UPDATE e2ee_participants_prekey_bundles
    SET is_published = 1, participant_id = ?, updated_at = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(dto.participantId ?? null, Date.now(), dto.userId);
    return res;
  }

  static resetForUser(
    userId: string,
    dto: ResetE2EEParticipantPreKeyBundleDTO,
  ) {
    const sql = `
    UPDATE e2ee_participants_prekey_bundles
    SET is_published = false, updated_at = ?, pub_identity_key = ?, priv_identity_key = ?, pub_signed_prekey = ?, pub_signed_prekey_signature = ?, priv_signed_prekey = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(
      Date.now(),
      dto.pubIdentityKey,
      dto.privIdentityKey,
      dto.pubSignedPreKey,
      dto.pubSignedPreKeySignature,
      dto.privSignedPreKey,
      userId,
    );
    return res;
  }

  static clearForUserId(userId: string) {
    const sql = `
    DELETE FROM e2ee_participants_prekey_bundles
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(userId);
    return res;
  }
}
