import { ulid } from "@std/ulid";
import { kv } from "../database/kv.connection.ts";
import type { User, UserRegistrationDTO } from "../server.d.ts";
import { hashPassword } from "../utils/password.utils.ts";

export default class UserRepository {
  static async getById(id: string) {
    return (await kv.get<User>(["users", id]))?.value;
  }

  static async getByEmail(email: string) {
    const { value: userId } = await kv.get<string>(["userIdsByEmail", email]);
    if (!userId) return null;
    return (await kv.get<User>(["users", userId]))?.value;
  }

  static async create(dto: UserRegistrationDTO) {
    const id = ulid();
    const password = await hashPassword(dto.password);
    const currentTimestamp = Date.now();
    const user: User = {
      ...dto,
      id,
      password,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    };
    await kv.set(["users", id], user);
    await kv.set(["userIdsByEmail", dto.email], id);
    return user;
  }
}
