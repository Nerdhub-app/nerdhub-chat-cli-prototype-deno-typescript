import type { ResultSetHeader } from "mysql2/promise";
import getConnectionsPool from "../database/db.pool.ts";
import type { DBTableName, OnetimePreKey } from "@scope/server/types";

const tableName: DBTableName = "e2ee_participant_onetime_prekeys";

export default class E2EEParticipantOnetimePreKeysRepository {
  static async findManyByParticipantId(
    participantId: number,
  ): Promise<OnetimePreKey[]> {
    const sql = `
    SELECT * FROM ${tableName}
    WHERE participant_id = ?
    ORDER BY created_at ASC
    `;
    const [rows] = await getConnectionsPool().execute(sql, [participantId]);
    return rows as OnetimePreKey[];
  }

  static async createManyByParticipantId(
    participantId: number,
    dto: CreateManyOnetimePreKeysDTO,
    flush = false,
  ): Promise<ResultSetHeader> {
    const conn = await getConnectionsPool().getConnection();

    await conn.beginTransaction();

    if (flush) {
      const sql = `
      DELETE FROM ${tableName}
      WHERE participant_id = ?
      `;
      await conn.execute(sql, [participantId]);
    }

    const valuesPlaceholder = dto.reduce((p, _, i) => {
      return p + (i > 0 ? ", " : "") + "(?, ?)";
    }, "");
    const sql = `
    INSERT INTO ${tableName} (pub_key, participant_id)
    VALUES ${valuesPlaceholder}
    `;
    const values = dto.flatMap((opk) => [opk.pubKey, participantId]);
    const [result] = await conn.execute(sql, values);

    await conn.commit();

    conn.release();

    return result as ResultSetHeader;
  }

  static async popByParticipantId(
    participantId: number,
  ): Promise<OnetimePreKey | null> {
    const conn = await getConnectionsPool().getConnection();

    let sql = `
    SELECT * FROM ${tableName}
    WHERE participant_id = ?
    ORDER BY created_at ASC
    LIMIT 1
    `;
    const [rows] = await conn.execute(sql, [participantId]);
    const [opk] = rows as OnetimePreKey[];

    if (opk) {
      sql = `
      DELETE FROM ${tableName}
      WHERE id = ?
      `;
      await conn.execute(sql, [opk.id]);
    }

    await conn.commit();

    conn.release();

    return opk ?? null;
  }
}

export type CreateManyOnetimePreKeysDTO = { id: string; pubKey: string }[];
