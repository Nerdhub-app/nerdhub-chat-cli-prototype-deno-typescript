import type { DatabaseSync } from "node:sqlite";
import { colors } from "@cliffy/ansi/colors";
import type { DbTableName } from "../cli.d.ts";

type TableMigrationLifecycles = {
  tableName: DbTableName;
  up(db: DatabaseSync): void;
  down(db: DatabaseSync): void;
};

const migrations: TableMigrationLifecycles[] = [
  {
    tableName: "e2ee_participant_onetime_prekeys",
    up(db) {
      let sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT NOT NULL PRIMARY KEY,
        pub_key BLOB NOT NULL,
        priv_key BLOB NOT NULL,
        is_published INT NOT NULL,
        user_id INT NOT NULL,
        participant_id INT,
        created_at INT NOT NULL,
        updated_at INT NOT NULL
      )
      `;
      db.exec(sql);
      sql = `
      CREATE INDEX idx_e2ee_participant_onetime_prekeys_user_id_is_published
      ON e2ee_participant_onetime_prekeys (user_id, is_published)
      `;
      db.exec(sql);
      sql = `
      CREATE INDEX idx_e2ee_participant_onetime_prekeys_user_id_created_at
      ON e2ee_participant_onetime_prekeys (user_id, created_at)
      `;
      db.exec(sql);
    },
    down(db) {
      const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
      db.exec(sql);
    },
  },
  {
    tableName: "e2ee_participant_prekey_bundles",
    up(db) {
      const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        user_id INT NOT NULL PRIMARY KEY,
        pub_identity_key BLOB NOT NULL,
        priv_identity_key BLOB NOT NULL,
        pub_signed_prekey BLOB NOT NULL,
        signed_prekey_signature BLOB NOT NULL,
        priv_signed_prekey BLOB NOT NULL,
        is_published INT NOT NULL,
        participant_id INT,
        created_at INT NOT NULL,
        updated_at INT NOT NULL
      )
      `;
      db.exec(sql);
    },
    down(db) {
      const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
      db.exec(sql);
    },
  },
];

export function runMigrationsUp(db: DatabaseSync) {
  for (const migration of migrations) {
    migration.up(db);
    console.log(colors.blue(`Created the "${migration.tableName}" table.`));
  }
}

export function runMigrationsDown(db: DatabaseSync) {
  for (const migration of migrations) {
    migration.down(db);
    console.log(colors.red(`Deleted the "${migration.tableName}" table.`));
  }
}

export function runMigrations(db: DatabaseSync, flush = false) {
  if (flush) {
    for (const migration of migrations) {
      migration.down(db);
      console.log(colors.red(`Deleted the "${migration.tableName}" table.`));
    }
  }
  for (const migration of migrations) {
    migration.up(db);
    console.log(colors.blue(`Created the "${migration.tableName}" table.`));
  }
}
