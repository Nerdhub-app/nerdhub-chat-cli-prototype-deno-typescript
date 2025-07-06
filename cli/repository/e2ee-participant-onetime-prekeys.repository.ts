import { Buffer } from "node:buffer";
import { db } from "../database/db.connection.ts";
import type { E2EEParticipantOnetimePrekey } from "../cli.d.ts";

export type CreateOnetimePreKeyDTO = {
  id: string;
  pubKey: Buffer;
  privKey: Buffer;
  userId: string;
  participantId?: string;
};

export type PublishUserOnetimePreKeysDTO = {
  participantId: string;
};

export default class E2EEParticipantOnetimePreKeyRepository {
  static getLatestForUser(userId: string) {
    const sql = `
    SELECT *
    FROM e2ee_participant_onetime_prekeys
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `;
    const query = db.prepare(sql);
    let opk = query.get(userId) as
      | E2EEParticipantOnetimePrekey
      | null;
    if (opk) {
      opk = {
        ...opk,
        pub_key: Buffer.from(opk.pub_key),
        priv_key: Buffer.from(opk.priv_key),
      };
    }
    return opk;
  }

  static getNonPublishedForUser(userId: string) {
    const sql = `
    SELECT * FROM e2ee_participant_onetime_prekeys
    WHERE user_id = ? AND is_published = 0
    `;
    const query = db.prepare(sql);
    let onetimePreKeys = query.all(userId) as E2EEParticipantOnetimePrekey[];
    if (onetimePreKeys) {
      onetimePreKeys = onetimePreKeys.map((opk) => ({
        ...opk,
        pub_key: Buffer.from(opk.pub_key),
        priv_key: Buffer.from(opk.priv_key),
      }));
    }
    return onetimePreKeys;
  }

  static countForUserId(userId: string) {
    const sql = `
    SELECT COUNT(id) AS count
    FROM e2ee_participant_onetime_prekeys
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const result = query.get(userId) as { count: number } | undefined;
    return result?.count ?? 0;
  }

  static isEmptyForUserId(userId: string) {
    const sql = `
    SELECT COUNT(id) AS count
    FROM e2ee_participant_onetime_prekeys
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const result = query.get(userId) as { count: number } | undefined;
    return !result || result.count === 0;
  }

  static createMany(onetimePreKeys: CreateOnetimePreKeyDTO[]) {
    const now = Date.now();
    const valuesPlaceholder = onetimePreKeys.map(() => {
      return "(?, ?, ?, ?, ?, ?, ?, ?)";
    })
      .join(", ");
    const sql = `
    INSERT INTO e2ee_participant_onetime_prekeys (id, pub_key, priv_key, is_published, user_id, participant_id, created_at, updated_at)
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
    const result = query.run(...values);
    return {
      result,
      onetimePreKeys: onetimePreKeys.map<E2EEParticipantOnetimePrekey>((
        opk,
      ) => ({
        id: opk.id,
        pub_key: opk.pubKey,
        priv_key: opk.privKey,
        is_published: false,
        user_id: opk.userId,
        participant_id: opk.participantId ?? null,
        created_at: new Date(now),
        updated_at: new Date(now),
      })),
    };
  }

  static publishForUserId(userId: string, dto: PublishUserOnetimePreKeysDTO) {
    const sql = `
    UPDATE e2ee_participant_onetime_prekeys
    SET is_published = true, participant_id = ?, updated_at = ?
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(dto.participantId, Date.now(), userId);
    return res;
  }

  static clearForUserId(userId: string) {
    const sql = `
    DELETE FROM e2ee_participant_onetime_prekeys
    WHERE user_id = ?
    `;
    const query = db.prepare(sql);
    const res = query.run(userId);
    return res;
  }
}
