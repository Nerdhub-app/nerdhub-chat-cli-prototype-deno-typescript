import type { Pool, ResultSetHeader } from "mysql2/promise";
import injectConnectionsPool from "../database/db.pool.ts";
import type { E2EEParticipant } from "../database/db.d.ts";
import { DbTableName } from "../database/db.const.ts";

export class E2EEParticipantRepository {
  #connPool!: Pool;

  constructor(connPool: Pool) {
    this.#connPool = connPool;
  }

  async findById(id: number): Promise<E2EEParticipant | null> {
    const sql = `
    SELECT * FROM ${DbTableName.E2EEParticipant}
    WHERE id = ?
    `;
    const [rows] = await this.#connPool.execute(sql, [id]);
    const [e2eeParticipant] = rows as E2EEParticipant[];
    return e2eeParticipant ?? null;
  }

  async findByUserIdAndDeviceId(
    userId: number,
    deviceId: string,
  ): Promise<E2EEParticipant | null> {
    const sql = `
    SELECT * FROM ${DbTableName.E2EEParticipant}
    WHERE user_id = ? AND device_id = ?
    `;
    const [rows] = await this.#connPool.execute(sql, [
      userId,
      deviceId,
    ]);
    const [e2eeParticipant] = rows as E2EEParticipant[];
    return e2eeParticipant ?? null;
  }

  async create(
    userId: number,
    deviceId: string,
    dto: CreateE2EEParticipantRecord,
  ): Promise<ResultSetHeader> {
    const conn = await this.#connPool.getConnection();

    await conn.beginTransaction();

    try {
      let sql = `
      INSERT INTO ${DbTableName.E2EEParticipant} (device_id, pub_identity_key, pub_signed_prekey, signed_prekey_signature, user_id)
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
      SELECT COUNT(id) as count FROM ${DbTableName.E2EEParticipant} WHERE user_id = ?
      `;
      const [rows] = await conn.execute(sql, [userId]);
      const countRes = rows as { count: number }[];

      const hasE2EEParticipant = countRes[0]?.count > 0;
      sql = `
      UPDATE ${DbTableName.User} SET has_e2ee_participant = ? WHERE id = ?
      `;
      await conn.execute(sql, [hasE2EEParticipant, userId]);

      await conn.commit();

      conn.release();

      return result as ResultSetHeader;
    } catch (error) {
      await conn.commit();
      conn.release();
      throw error;
    }
  }

  async updatePreKeyBundleById(
    id: number,
    dto: UpdateE2EEParticipantPreKeyBundleRecord,
  ): Promise<ResultSetHeader> {
    const sql = `
    UPDATE ${DbTableName.E2EEParticipant}
    SET pub_identity_key = ?, pub_signed_prekey = ?, signed_prekey_signature = ?
    WHERE id = ?
    `;
    const [result] = await this.#connPool.execute(sql, [
      dto.pubIdentityKey,
      dto.pubSignedPreKey,
      dto.signedPreKeySignature,
      id,
    ]);
    return result as ResultSetHeader;
  }
}

// E2EEParticipantRepository singleton
let e2eeParticipantRepository: E2EEParticipantRepository;

/**
 * Injects E2EEParticipantRepository
 * @returns E2EEParticipantRepository instance
 */
export const injectE2EEParticipantRepository = () => {
  if (!e2eeParticipantRepository) {
    e2eeParticipantRepository = new E2EEParticipantRepository(
      injectConnectionsPool(),
    );
  }
  return e2eeParticipantRepository;
};

export type CreateE2EEParticipantRecord = Record<
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature",
  string
>;

export type UpdateE2EEParticipantPreKeyBundleRecord =
  CreateE2EEParticipantRecord;

export default E2EEParticipantRepository;
