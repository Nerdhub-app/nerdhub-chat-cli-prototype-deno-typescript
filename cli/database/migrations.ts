import type { DatabaseSync } from "node:sqlite";
import { colors } from "@cliffy/ansi/colors";

type TableMigrationLifecycles = {
  up(db: DatabaseSync): void;
  down(db: DatabaseSync): void;
};

const migrations: Record<string, TableMigrationLifecycles> = {
  e2eeParticipantOnetimePreKeys: {
    up(db) {
      const sql = `
      CREATE TABLE IF NOT EXISTS e2ee_participant_onetime_prekeys (
        id TEXT NOT NULL PRIMARY KEY,
        pub_key BLOB NOT NULL,
        priv_key BLOB NOT NULL,
        is_published INT NOT NULL,
        user_id TEXT NOT NULL,
        participant_id TEXT,
        created_at INT NOT NULL,
        updated_at INT NOT NULL
      )
      `;
      db.exec(sql);
    },
    down(db) {
      const sql = `DROP TABLE IF EXISTS e2ee_participant_onetime_prekeys`;
      db.exec(sql);
    },
  },
  e2eeParticipantPublicKeys: {
    up(db) {
      const sql = `
      CREATE TABLE IF NOT EXISTS e2ee_participants_prekey_bundles (
        user_id TEXT NOT NULL PRIMARY KEY,
        pub_identity_key BLOB NOT NULL,
        priv_identity_key BLOB NOT NULL,
        pub_signed_prekey BLOB NOT NULL,
        pub_signed_prekey_signature BLOB NOT NULL,
        priv_signed_prekey BLOB NOT NULL,
        is_published INT NOT NULL,
        participant_id TEXT,
        created_at INT NOT NULL,
        updated_at INT NOT NULL
      )
      `;
      db.exec(sql);
    },
    down(db) {
      const sql = `DROP TABLE IF EXISTS e2ee_participants_prekey_bundles`;
      db.exec(sql);
    },
  },
};

export function runMigrationsUp(db: DatabaseSync) {
  for (const table in migrations) {
    const migration = migrations[table];
    migration.up(db);
    console.log(colors.blue(`Created the "${table}" table.`));
  }
}

export function runMigrationsDown(db: DatabaseSync) {
  for (const table in migrations) {
    const migration = migrations[table];
    migration.down(db);
    console.log(colors.red(`Deleted the "${table}" table.`));
  }
}

export function runMigrations(db: DatabaseSync, flush = false) {
  if (flush) {
    for (const table in migrations) {
      const migration = migrations[table];
      migration.down(db);
      console.log(colors.red(`Deleted the "${table}" table.`));
    }
  }
  for (const table in migrations) {
    const migration = migrations[table];
    migration.up(db);
    console.log(colors.blue(`Created the "${table}" table.`));
  }
}
