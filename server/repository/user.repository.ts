import type { Pool, ResultSetHeader } from "mysql2/promise";
import injectConnectionsPool from "../database/db.pool.ts";
import type { User } from "../database/db.d.ts";
import { DbTableName } from "../database/db.const.ts";

export class UserRepository {
  #connPool!: Pool;

  constructor(connPool: Pool) {
    this.#connPool = connPool;
  }

  async findById(id: number): Promise<User | null> {
    const sql = `
    SELECT * FROM ${DbTableName.User} WHERE id = ?
    `;
    const [rows] = await this.#connPool.execute(sql, [id]);
    return (rows as User[])[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const sql = `
    SELECT * FROM ${DbTableName.User} WHERE email = ?
    `;
    const [rows] = await this.#connPool.execute(sql, [email]);
    return (rows as User[])[0] ?? null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const sql = `
    SELECT EXISTS(SELECT 1 FROM ${DbTableName.User} WHERE username = ?) as 'exists'
    `;
    const [rows] = await this.#connPool.execute(sql, [username]);
    return (rows as { exists: number }[])[0].exists === 1;
  }

  async emailExists(email: string): Promise<boolean> {
    const sql = `
    SELECT EXISTS(SELECT 1 FROM ${DbTableName.User} WHERE email = ?) as 'exists'
    `;
    const [rows] = await this.#connPool.execute(sql, [email]);
    return (rows as { exists: number }[])[0].exists === 1;
  }

  async create(payload: CreateUserRecord): Promise<ResultSetHeader> {
    const sql = `
    INSERT INTO ${DbTableName.User} (firstname, lastname, username, email, password) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await this.#connPool.execute(sql, [
      payload.firstname,
      payload.lastname,
      payload.username,
      payload.email,
      payload.password,
    ]);
    return result as ResultSetHeader;
  }
}

// UserRepository singleton
let userRepository: UserRepository;

/**
 * Injects UserRepository
 * @returns UserRepository instance
 */
export const injectUserRepository = () => {
  if (!userRepository) {
    userRepository = new UserRepository(injectConnectionsPool());
  }
  return userRepository;
};

export type CreateUserRecord = Record<
  "firstname" | "lastname" | "username" | "email" | "password",
  string
>;

export default UserRepository;
