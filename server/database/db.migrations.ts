import getConnectionsPool from "./db.pool.ts";
import type { DBTableName } from "../server.d.ts";

export type TableName = DBTableName;

export type TableMigrationItem = {
  tableName: TableName;
  up(): Promise<void>;
  down(): Promise<void>;
};

const tablesMigrations: TableMigrationItem[] = [
  {
    tableName: "users",
    async up() {
      const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        has_e2ee_participant BOOL NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
      `;
      await getConnectionsPool().execute(sql);
    },
    async down() {
      const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
      await getConnectionsPool().execute(sql);
    },
  },
  {
    tableName: "e2ee_participants",
    async up() {
      const usersTableName: TableName = "users";
      const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        pub_identity_key TINYTEXT NOT NULL,
        pub_signed_prekey TINYTEXT NOT NULL,
        signed_prekey_signature TINYTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES ${usersTableName}(id) ON DELETE CASCADE,
        UNIQUE KEY uq_idx_user_id_device_id (user_id, device_id)
      )
      `;
      await getConnectionsPool().execute(sql);
    },
    async down() {
      const sql = `
      DROP TABLE IF EXISTS ${this.tableName}
      `;
      await getConnectionsPool().execute(sql);
    },
  },
  {
    tableName: "e2ee_participant_onetime_prekeys",
    async up() {
      const participantsTableName: TableName = "e2ee_participants";
      let sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        pub_key TINYTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        participant_id INT NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES ${participantsTableName}(id) ON DELETE CASCADE
      )
      `;
      await getConnectionsPool().execute(sql);
      sql = `
      CREATE INDEX idx_participant_id_created_at ON ${this.tableName} (participant_id, created_at)
      `;
      await getConnectionsPool().execute(sql);
    },
    async down() {
      const sql = `
      DROP TABLE IF EXISTS ${this.tableName}
      `;
      await getConnectionsPool().execute(sql);
    },
  },
];

export function getTableMigration(tableName: TableName): TableMigrationItem {
  const migration = tablesMigrations.find(
    (migration) => migration.tableName === tableName,
  );
  if (!migration) {
    throw new Error(`Table migration not found for table ${tableName}`);
  }
  return migration;
}

export default tablesMigrations;
