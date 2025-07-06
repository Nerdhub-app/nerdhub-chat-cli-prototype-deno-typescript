import { ulid } from "@std/ulid";
import { kv } from "../database/kv.connection.ts";
import type { User, UserRegistrationDTO } from "../server.d.ts";
import { hashPassword } from "../utils/password.utils.ts";

const ROOT_KEYSPACE = "users";
const EMAIL_INDEX_KEYSPACE = "userIdsByEmail";

export default class UserRepository {
  static async getById(id: string) {
    return (await kv.get<User>([ROOT_KEYSPACE, id]))?.value;
  }

  static async getByEmail(email: string) {
    const { value: userId } = await kv.get<string>([
      EMAIL_INDEX_KEYSPACE,
      email,
    ]);
    if (!userId) return null;
    return (await kv.get<User>([ROOT_KEYSPACE, userId]))?.value;
  }

  static async create(dto: UserRegistrationDTO) {
    const id = ulid();
    const password = await hashPassword(dto.password);
    const currentTimestamp = Date.now();
    const user: User = {
      ...dto,
      id,
      password,
      e2eeParticipantsIds: [],
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    await kv.set([ROOT_KEYSPACE, id], user);
    await kv.set([EMAIL_INDEX_KEYSPACE, dto.email], id);
    return user;
  }

  static async addE2EEParticipantId(
    userId: string,
    e2eeParticipantId: string,
  ) {
    let user: User | null = null;

    let writeRes = { ok: false };
    while (!writeRes.ok) {
      const userRes = await kv.get<User>([ROOT_KEYSPACE, userId]);
      user = userRes.value;

      if (!user) {
        throw new Error(
          "Cannot add e2ee participant id to a non-existing user",
        );
      }

      const e2eeParticipantsIds: string[] = [
        ...user.e2eeParticipantsIds,
        e2eeParticipantId,
      ];
      user = { ...user, e2eeParticipantsIds };
      writeRes = await kv.atomic().check(userRes).set(
        [ROOT_KEYSPACE, userId],
        user,
      ).commit();
    }

    return user;
  }

  static async removeE2EEParticipantId(
    userId: string,
    e2eeParticipantId: string,
  ) {
    let user: User | null = null;

    let writeRes = { ok: false };
    while (!writeRes.ok) {
      const userRes = await kv.get<User>([ROOT_KEYSPACE, userId]);
      user = userRes.value;

      if (!user) {
        throw new Error(
          "Cannot remove e2ee participant id to a non-existing user",
        );
      }

      const e2eeParticipantsIds: string[] = user.e2eeParticipantsIds.filter(
        (id) => id !== e2eeParticipantId,
      );
      user = { ...user, e2eeParticipantsIds };
      writeRes = await kv.atomic().check(userRes).set(
        [ROOT_KEYSPACE, userId],
        user,
      ).commit();
    }

    return user;
  }
}
