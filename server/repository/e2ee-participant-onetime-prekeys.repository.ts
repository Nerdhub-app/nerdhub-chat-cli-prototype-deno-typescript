import { kv } from "../database/kv.connection.ts";
import type { OnetimePreKey } from "@scope/server/types";

export type CreateManyOnetimePreKeysPayload = { id: string; pubKey: string }[];

export type AppendManyOnetimePreKeysPayload = CreateManyOnetimePreKeysPayload;

const ROOT_KEYSPACE = "e2eeParticipantOnetimePreKeys";

export default class E2EEParticipantOnetimePreKeysRepository {
  /**
   * @param keys The keyspace keys.
   * [0]: userId, [1]: participantId
   */
  static async getForParticipant(
    keys: [string, string],
  ): Promise<OnetimePreKey[]> {
    const onetimePreKeys = await kv.get<OnetimePreKey[]>([
      ROOT_KEYSPACE,
      ...keys,
    ]);
    return onetimePreKeys.value ?? [];
  }

  /**
   * @param keys The keyspace keys.
   * [0]: userId, [1]: participantId
   */
  static async createMany(
    keys: [string, string],
    onetimePreKeysPayload: CreateManyOnetimePreKeysPayload,
  ): Promise<OnetimePreKey[]> {
    const onetimePreKeys = onetimePreKeysPayload.map<OnetimePreKey>((opk) => ({
      ...opk,
      createdAt: Date.now(),
    }));
    await kv.set([ROOT_KEYSPACE, ...keys], onetimePreKeys);
    return onetimePreKeys;
  }

  static async appendManyForParticipant(
    keys: [string, string],
    onetimePreKeysPayload: AppendManyOnetimePreKeysPayload,
  ) {
    let newOPKs!: OnetimePreKey[];
    let writeRes = { ok: false };
    while (!writeRes.ok) {
      const onetimePreKeysRes = await kv.get<OnetimePreKey[]>([
        ROOT_KEYSPACE,
        ...keys,
      ]);
      const onetimePreKeys = onetimePreKeysRes.value ?? [];
      const opkIds = new Set(onetimePreKeys.map((opk) => opk.id));
      newOPKs = [];
      for (const opk of onetimePreKeysPayload) {
        if (opkIds.has(opk.id)) continue;
        newOPKs.push({ ...opk, createdAt: Date.now() });
      }
      onetimePreKeys.concat(...newOPKs);
      writeRes = await kv.atomic()
        .check(onetimePreKeysRes)
        .set(
          [ROOT_KEYSPACE, ...keys],
          onetimePreKeys,
        )
        .commit();
    }
    return newOPKs;
  }

  /**
   * @param keys The keyspace keys.
   * [0]: userId, [1]: participantId
   */
  static async deleteForParticipant(keys: [string, string]) {
    await kv.delete([ROOT_KEYSPACE, ...keys]);
  }
}
