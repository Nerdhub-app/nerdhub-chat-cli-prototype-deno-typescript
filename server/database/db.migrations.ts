import injectConnectionsPool from "./db.pool.ts";
import { DbTableName } from "./db.const.ts";

export type TableName = DbTableName;

const dbPool = injectConnectionsPool();

export type TableMigrationItem = {
  tableName: TableName;
  up(): Promise<void>;
  down(): Promise<void>;
};

const tablesMigrations: TableMigrationItem[] = [
  {
    tableName: DbTableName.User,
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
      await dbPool.execute(sql);
    },
    async down() {
      const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
      await dbPool.execute(sql);
    },
  },
  {
    tableName: DbTableName.E2EEParticipant,
    async up() {
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
        FOREIGN KEY (user_id) REFERENCES ${DbTableName.User}(id) ON DELETE CASCADE,
        UNIQUE KEY uq_idx_user_id_device_id (user_id, device_id)
      )
      `;
      await dbPool.execute(sql);
    },
    async down() {
      const sql = `
      DROP TABLE IF EXISTS ${this.tableName}
      `;
      await dbPool.execute(sql);
    },
  },
  {
    tableName: DbTableName.E2EEParticipantOnetimePreKey,
    async up() {
      let sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        pub_key TINYTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        participant_id INT NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES ${DbTableName.E2EEParticipant}(id) ON DELETE CASCADE
      )
      `;
      await dbPool.execute(sql);
      sql = `
      CREATE INDEX idx_participant_id_created_at ON ${this.tableName} (participant_id, created_at)
      `;
      await dbPool.execute(sql);
    },
    async down() {
      const sql = `
      DROP TABLE IF EXISTS ${this.tableName}
      `;
      await dbPool.execute(sql);
    },
  },
];

/**
 * Gets table migration
 * @param tableName Table name
 * @returns Table migration
 */
export function getTableMigration(tableName: TableName): TableMigrationItem {
  const migration = tablesMigrations.find(
    (migration) => migration.tableName === tableName,
  );
  if (!migration) {
    throw new Error(`Table migration not found for table ${tableName}`);
  }
  return migration;
}

/**
 * Runs migrations
 * @param up Run up migrations
 * @param down Run down migrations
 */
export async function runMigrations(up: boolean, down: boolean) {
  if (down) {
    for (let i = tablesMigrations.length - 1; i >= 0; i--) {
      const migration = tablesMigrations[i];
      console.log(
        `%cDeleting the ${migration.tableName} table ...`,
        "color: red",
      );
      await migration.down();
    }
  }
  if (up) {
    for (const migration of tablesMigrations) {
      console.log(
        `%cCreating the ${migration.tableName} table ...`,
        "color: blue",
      );
      await migration.up();
    }
  }
}

export default tablesMigrations;
