import { Buffer } from "node:buffer";
import { db } from "../database/db.connection.ts";
import type {
  E2EEParticipantOnetimePrekey,
  E2EEParticipantOnetimePrekeyRow,
} from "../cli.d.ts";
import type { StatementResultingChanges } from "node:sqlite";
import type { DbTableName } from "../cli.d.ts";

const tableName: DbTableName = "e2ee_participant_onetime_prekeys";

export default class E2EEParticipantOnetimePreKeyRepository {
  static findLatestByUserId(
    userId: number,
  ): E2EEParticipantOnetimePrekey | null {
    const sql = `
    SELECT *
    FROM ${tableName}
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `;
    const query = db.prepare(sql);
    const row = query.get(userId) as
      | E2EEParticipantOnetimePrekeyRow
      | null;
    return row ? toE2EEParticipantOnetimePreKey(row) : null;
  }

  static findManyNonPublishedByUserId(
    userId: number,
  ): E2EEParticipantOnetimePrekey[] {
    const sql = `
    SELECT * FROM ${tableName}
    WHERE user_id = ? AND is_published = 0
    `;
    const query = db.prepare(sql);
    const rows = query.all(userId) as E2EEParticipantOnetimePrekeyRow[];
    return rows.map((row) => toE2EEParticipantOnetimePreKey(row));
  }

  static countByUserId(userId: number): number {
    const sql = `
    SELECT COUNT(id) AS count
    FROM ${tableName}
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const result = query.get(userId) as { count: number } | undefined;
    return result?.count ?? 0;
  }

  static isEmptyByUserId(userId: number): boolean {
    const sql = `
    SELECT COUNT(id) AS count
    FROM ${tableName}
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const result = query.get(userId) as { count: number } | undefined;
    return !result || result.count === 0;
  }

  static createMany(
    onetimePreKeys: CreateOnetimePreKeyDTO[],
  ): StatementResultingChanges {
    const now = Date.now();
    const valuesPlaceholder = onetimePreKeys.map(() => {
      return "(?, ?, ?, ?, ?, ?, ?, ?)";
    })
      .join(", ");
    const sql = `
    INSERT INTO ${tableName} (id, pub_key, priv_key, is_published, user_id, participant_id, created_at, updated_at)
    VALUES ${valuesPlaceholder}
    `;
    const query = db.prepare(sql);
    const values = onetimePreKeys.flatMap(
      (opk) => [
        opk.id,
        opk.pubKey,
        opk.privKey,
        0,
        opk.userId,
        opk.participantId ?? null,
        now,
        now,
      ],
    );
    return query.run(...values);
  }

  static publishByUserId(
    userId: number,
    dto: PublishUserOnetimePreKeysDTO,
  ): StatementResultingChanges {
    const sql = `
    UPDATE ${tableName}
    SET is_published = true, participant_id = ?, updated_at = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(dto.participantId, Date.now(), userId);
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

export type CreateOnetimePreKeyDTO = {
  id: string;
  pubKey: Buffer;
  privKey: Buffer;
  userId: number;
  participantId?: number;
};

export type PublishUserOnetimePreKeysDTO = {
  participantId: number;
};

function toE2EEParticipantOnetimePreKey(
  row: E2EEParticipantOnetimePrekeyRow,
): E2EEParticipantOnetimePrekey {
  return {
    ...row,
    pub_key: Buffer.from(row.pub_key),
    priv_key: Buffer.from(row.priv_key),
    is_published: Boolean(row.is_published),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
