import type { ResultSetHeader } from "mysql2/promise";
import getConnectionsPool from "../database/db.pool.ts";
import type { DBTableName, User } from "../server.d.ts";

const tableName: DBTableName = "users";

export default class UserRepository {
  static async findById(id: number): Promise<User | null> {
    const sql = `
    SELECT * FROM ${tableName} WHERE id = ?
    `;
    const [rows] = await getConnectionsPool().execute(sql, [id]);
    return (rows as User[])[0] ?? null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const sql = `
    SELECT * FROM ${tableName} WHERE email = ?
    `;
    const [rows] = await getConnectionsPool().execute(sql, [email]);
    return (rows as User[])[0] ?? null;
  }

  static async usernameExists(username: string): Promise<boolean> {
    const sql = `
    SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE username = ?) as 'exists'
    `;
    const [rows] = await getConnectionsPool().execute(sql, [username]);
    return (rows as { exists: number }[])[0].exists === 1;
  }

  static async emailExists(email: string): Promise<boolean> {
    const sql = `
    SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE email = ?) as 'exists'
    `;
    const [rows] = await getConnectionsPool().execute(sql, [email]);
    return (rows as { exists: number }[])[0].exists === 1;
  }

  static async create(payload: CreateUserDTO): Promise<ResultSetHeader> {
    const sql = `
    INSERT INTO ${tableName} (firstname, lastname, username, email, password) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await getConnectionsPool().execute(sql, [
      payload.firstname,
      payload.lastname,
      payload.username,
      payload.email,
      payload.password,
    ]);
    return result as ResultSetHeader;
  }
}

export type CreateUserDTO = Record<
  "firstname" | "lastname" | "username" | "email" | "password",
  string
>;
