import { Buffer } from "node:buffer";
import type { StatementResultingChanges } from "node:sqlite";
import { db } from "../database/db.connection.ts";
import type {
  DbTableName,
  E2EEParticipantPrekeyBundle,
  E2EEParticipantPrekeyBundleRow,
} from "../cli.d.ts";

const tableName: DbTableName = "e2ee_participant_prekey_bundles";

export default class E2EEParticipantPrekeyBundleRepository {
  static findByUserId(
    userId: number,
  ): E2EEParticipantPrekeyBundle | null {
    const sql = `
    SELECT * FROM ${tableName}
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const row = query.get(userId) as
      | E2EEParticipantPrekeyBundleRow
      | undefined;
    return row ? toE2EEParticipantPreKeyBundle(row) : null;
  }

  static createByUserId(
    userId: number,
    dto: CreateE2EEParticipantPrekeyBundlesDTO,
  ): StatementResultingChanges {
    const now = Date.now();
    const sql = `
    INSERT INTO ${tableName} (
      user_id,
      pub_identity_key,
      priv_identity_key,
      pub_signed_prekey,
      signed_prekey_signature,
      priv_signed_prekey,
      is_published,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const query = db.prepare(sql);
    return query.run(
      userId,
      dto.pubIdentityKey,
      dto.privIdentityKey,
      dto.pubSignedPreKey,
      dto.signedPreKeySignature,
      dto.privSignedPreKey,
      0,
      now,
      now,
    );
  }

  static publishByUserId(
    userId: number,
    dto: PublishE2EEParticipantPreKeyBundleDTO,
  ): StatementResultingChanges {
    const sql = `
    UPDATE ${tableName}
    SET is_published = 1, participant_id = ?, updated_at = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(dto.participantId ?? null, Date.now(), userId);
    return res;
  }

  static resetByUserId(
    userId: number,
    dto: ResetE2EEParticipantPreKeyBundleDTO,
  ): StatementResultingChanges {
    const sql = `
    UPDATE ${tableName}
    SET is_published = false, updated_at = ?, pub_identity_key = ?, priv_identity_key = ?, pub_signed_prekey = ?, signed_prekey_signature = ?, priv_signed_prekey = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(
      Date.now(),
      dto.pubIdentityKey,
      dto.privIdentityKey,
      dto.pubSignedPreKey,
      dto.signedPreKeySignature,
      dto.privSignedPreKey,
      userId,
    );
    return res;
  }

  static deleteByUserId(userId: number): StatementResultingChanges {
    const sql = `
    DELETE FROM ${tableName}
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(userId);
    return res;
  }
}

function toE2EEParticipantPreKeyBundle(
  row: E2EEParticipantPrekeyBundleRow,
): E2EEParticipantPrekeyBundle {
  return {
    user_id: row.user_id,
    pub_identity_key: Buffer.from(row.pub_identity_key),
    priv_identity_key: Buffer.from(row.priv_identity_key),
    pub_signed_prekey: Buffer.from(row.pub_signed_prekey),
    signed_prekey_signature: Buffer.from(
      row.signed_prekey_signature,
    ),
    priv_signed_prekey: Buffer.from(row.priv_signed_prekey),
    is_published: !!row.is_published,
    participant_id: row.participant_id,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export type CreateE2EEParticipantPrekeyBundlesDTO = {
  pubIdentityKey: Buffer;
  privIdentityKey: Buffer;
  pubSignedPreKey: Buffer;
  signedPreKeySignature: Buffer;
  privSignedPreKey: Buffer;
};

export type ResetE2EEParticipantPreKeyBundleDTO =
  CreateE2EEParticipantPrekeyBundlesDTO;

export type PublishE2EEParticipantPreKeyBundleDTO = {
  participantId?: number;
};
