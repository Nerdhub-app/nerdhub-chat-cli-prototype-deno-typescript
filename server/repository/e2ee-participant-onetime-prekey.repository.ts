import type { Pool, ResultSetHeader } from "mysql2/promise";
import injectConnectionsPool from "../database/db.pool.ts";
import type { OnetimePreKey } from "../database/db.d.ts";
import { DbTableName } from "../database/db.const.ts";

export class E2EEParticipantOnetimePreKeyRepository {
  #connPool!: Pool;

  constructor(connPool: Pool) {
    this.#connPool = connPool;
  }

  async findManyByParticipantId(
    participantId: number,
  ): Promise<OnetimePreKey[]> {
    const sql = `
    SELECT * FROM ${DbTableName.E2EEParticipantOnetimePreKey}
    WHERE participant_id = ?
    ORDER BY created_at ASC
    `;
    const [rows] = await this.#connPool.execute(sql, [participantId]);
    return rows as OnetimePreKey[];
  }

  async createManyByParticipantId(
    participantId: number,
    dto: CreateManyOnetimePreKeysDTO,
    flush = false,
  ): Promise<ResultSetHeader> {
    const conn = await this.#connPool.getConnection();

    await conn.beginTransaction();

    try {
      if (flush) {
        const sql = `
        DELETE FROM ${DbTableName.E2EEParticipantOnetimePreKey}
        WHERE participant_id = ?
        `;
        await conn.execute(sql, [participantId]);
      }

      const valuesPlaceholder = dto.reduce((p, _, i) => {
        return p + (i > 0 ? ", " : "") + "(?, ?, ?)";
      }, "");
      const sql = `
      INSERT INTO ${DbTableName.E2EEParticipantOnetimePreKey} (id, pub_key, participant_id)
      VALUES ${valuesPlaceholder}
      `;
      const values = dto.flatMap((opk) => [opk.id, opk.pubKey, participantId]);
      const [result] = await conn.execute(sql, values);

      await conn.commit();

      conn.release();

      return result as ResultSetHeader;
    } catch (error) {
      await conn.commit();
      conn.release();
      throw error;
    }
  }

  async popByParticipantId(
    participantId: number,
  ): Promise<OnetimePreKey | null> {
    const conn = await this.#connPool.getConnection();

    try {
      await conn.beginTransaction();

      let sql = `
      SELECT * FROM ${DbTableName.E2EEParticipantOnetimePreKey}
      WHERE participant_id = ?
      ORDER BY created_at ASC
      LIMIT 1
      `;
      const [rows] = await conn.execute(sql, [participantId]);
      const [opk] = rows as OnetimePreKey[];

      if (opk) {
        sql = `
        DELETE FROM ${DbTableName.E2EEParticipantOnetimePreKey}
        WHERE id = ?
        `;
        await conn.execute(sql, [opk.id]);
      }

      await conn.commit();

      conn.release();

      return opk ?? null;
    } catch (error) {
      await conn.commit();
      conn.release();
      throw error;
    }
  }
}

// E2EEParticipantOnetimePreKeyRepository singleton
let e2eeParticipantOnetimePreKeyRepository:
  E2EEParticipantOnetimePreKeyRepository;

/**
 * Injects E2EEParticipantOnetimePreKeyRepository
 * @returns E2EEParticipantOnetimePreKeyRepository instance
 */
export const injectE2EEParticipantOnetimePreKeyRepository = () => {
  if (!e2eeParticipantOnetimePreKeyRepository) {
    e2eeParticipantOnetimePreKeyRepository =
      new E2EEParticipantOnetimePreKeyRepository(injectConnectionsPool());
  }
  return e2eeParticipantOnetimePreKeyRepository;
};

export type CreateManyOnetimePreKeysDTO = { id: string; pubKey: string }[];

export default E2EEParticipantOnetimePreKeyRepository;
