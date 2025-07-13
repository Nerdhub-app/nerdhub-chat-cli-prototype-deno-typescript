import type { ResultSetHeader } from "mysql2/promise";
import type { DBTableName, E2EEParticipant } from "../server.d.ts";
import getConnectionsPool from "../database/db.pool.ts";

const tableName: DBTableName = "e2ee_participants";
const usersTableName: DBTableName = "users";

export default class E2EEParticipantRepository {
  static async findById(id: number): Promise<E2EEParticipant | null> {
    const sql = `
    SELECT * FROM ${tableName}
    WHERE id = ?
    `;
    const [rows] = await getConnectionsPool().execute(sql, [id]);
    const [e2eeParticipant] = rows as E2EEParticipant[];
    return e2eeParticipant ?? null;
  }

  static async findByUserIdAndDeviceId(
    userId: number,
    deviceId: string,
  ): Promise<E2EEParticipant | null> {
    const sql = `
    SELECT * FROM ${tableName}
    WHERE user_id = ? AND device_id = ?
    `;
    const [rows] = await getConnectionsPool().execute(sql, [userId, deviceId]);
    const [e2eeParticipant] = rows as E2EEParticipant[];
    return e2eeParticipant ?? null;
  }

  static async create(
    userId: number,
    deviceId: string,
    dto: CreateE2EEParticipantDTO,
  ): Promise<ResultSetHeader> {
    const conn = await getConnectionsPool().getConnection();

    await conn.beginTransaction();

    let sql = `
    INSERT INTO ${tableName} (device_id, pub_identity_key, pub_signed_prekey, signed_prekey_signature, user_id)
    VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await conn.execute(sql, [
      deviceId,
      dto.pubIdentityKey,
      dto.pubSignedPreKey,
      dto.signedPreKeySignature,
      userId,
    ]);

    sql = `
    SELECT COUNT(id) as count FROM ${tableName} WHERE user_id = ?
    `;
    const [rows] = await conn.execute(sql, [userId]);
    const countRes = rows as { count: number }[];

    const hasE2EEParticipant = countRes[0]?.count > 0;
    sql = `
    UPDATE ${usersTableName} SET has_e2ee_participant = ? WHERE id = ?
    `;
    await conn.execute(sql, [hasE2EEParticipant, userId]);

    await conn.commit();

    conn.release();

    return result as ResultSetHeader;
  }

  static async updatePreKeyBundleById(
    id: number,
    dto: UpdateE2EEParticipantPreKeyBundleDTO,
  ): Promise<ResultSetHeader> {
    const sql = `
    UPDATE ${tableName}
    SET pub_identity_key = ?, pub_signed_prekey = ?, signed_prekey_signature = ?
    WHERE id = ?
    `;
    const [result] = await getConnectionsPool().execute(sql, [
      dto.pubIdentityKey,
      dto.pubSignedPreKey,
      dto.signedPreKeySignature,
      id,
    ]);
    return result as ResultSetHeader;
  }
}

export type CreateE2EEParticipantDTO = Record<
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature",
  string
>;

export type UpdateE2EEParticipantPreKeyBundleDTO = CreateE2EEParticipantDTO;
