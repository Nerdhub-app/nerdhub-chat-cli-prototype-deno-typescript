import { ulid } from "@std/ulid";
import type { E2EEParticipant } from "../server.d.ts";
import { kv } from "../database/kv.connection.ts";

export type CreateE2EEParticipantPayload = Pick<
  E2EEParticipant,
  "pubIdentityKey" | "pubSignedPreKey" | "signedPreKeySignature"
>;

export type UpdateE2EEParticipantPreKeyBundlePayload =
  CreateE2EEParticipantPayload;

export type DeleteE2EEParticipantKeys = Record<
  "userId" | "deviceId" | "participantId",
  string
>;

const ROOT_KEYSPACE = "e2eeParticipants";
const DEVICE_ID_INDEX_KEYSPACE = "e2eeParticipantIdsByDeviceId";

export default class E2EEParticipantRepository {
  /**
   * @param keys The query keys.
   * [0]: userId, [1]: participantId
   */
  static async getById(keys: [string, string]) {
    const [userId, participantId] = keys;
    return (await kv.get<E2EEParticipant>([
      ROOT_KEYSPACE,
      userId,
      participantId,
    ]))?.value;
  }

  /**
   * @param keys The query keys.
   * [0]: userId, [1]: deviceId
   */
  static async getByDeviceId(keys: [string, string]) {
    const [userId, deviceId] = keys;
    const { value: participantId } = await kv.get<string>([
      DEVICE_ID_INDEX_KEYSPACE,
      userId,
      deviceId,
    ]);
    if (!participantId) return null;

    const entry = await kv.get<E2EEParticipant>([
      ROOT_KEYSPACE,
      userId,
      participantId,
    ]);
    return entry?.value;
  }

  /**
   * @param keys The keyspace keys.
   * [0]: userId, [1]: deviceId
   */
  static async create(
    keys: [string, string],
    payload: CreateE2EEParticipantPayload,
  ) {
    const [userId, deviceId] = keys;

    const id = ulid();
    const currentTimestamp = Date.now();
    const participant: E2EEParticipant = {
      id,
      userId,
      deviceId,
      ...payload,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };

    await kv.set([ROOT_KEYSPACE, userId, id], participant);
    await kv.set(
      [DEVICE_ID_INDEX_KEYSPACE, userId, deviceId],
      id,
    );

    return participant;
  }

  /**
   * @param keys The keyspace keys.
   * [0]: user id, [1]: e2ee participant id
   */
  static async updatePreKeyBundle(
    keys: [string, string],
    prekeyBundle: UpdateE2EEParticipantPreKeyBundlePayload,
  ) {
    const [userId, participantId] = keys;

    let updatedParticipant!: E2EEParticipant;

    let writeRes = { ok: false };
    while (!writeRes.ok) {
      const e2eeParticipantRes = await kv.get<E2EEParticipant>([
        ROOT_KEYSPACE,
        userId,
        participantId,
      ]);
      const e2eeParticipant = e2eeParticipantRes.value;

      if (!e2eeParticipant) {
        throw new Error("E2EE participant not found");
      }

      updatedParticipant = {
        ...e2eeParticipant,
        pubIdentityKey: prekeyBundle.pubIdentityKey,
        pubSignedPreKey: prekeyBundle.pubSignedPreKey,
        signedPreKeySignature: prekeyBundle.signedPreKeySignature,
        updatedAt: Date.now(),
      };

      writeRes = await kv.atomic()
        .check(e2eeParticipantRes)
        .set([
          ROOT_KEYSPACE,
          userId,
          participantId,
        ], updatedParticipant)
        .commit();
    }

    return updatedParticipant;
  }

  static async delete(keys: DeleteE2EEParticipantKeys) {
    const { userId, deviceId, participantId } = keys;
    await kv.delete([ROOT_KEYSPACE, userId, participantId]);
    await kv.delete([DEVICE_ID_INDEX_KEYSPACE, userId, deviceId]);
  }
}
