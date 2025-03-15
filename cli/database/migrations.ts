import type { DatabaseSync } from "node:sqlite";
import { colors } from "@cliffy/ansi/colors";

type TableMigrationLifecycles = {
  up(db: DatabaseSync): void;
  down(db: DatabaseSync): void;
};

const migrations: Record<string, TableMigrationLifecycles> = {
  e2eeParticipantsPublicKeys: {
    up(db) {
      const sql = `
      CREATE TABLE IF NOT EXISTS e2ee_participants_prekey_bundles (
        user_id TEXT NOT NULL PRIMARY KEY,
        participant_id TEXT NOT NULL,
        pub_identity_key BLOB NOT NULL,
        priv_identity_key BLOB NOT NULL,
        pub_signed_prekey BLOB NOT NULL,
        pub_signed_prekey_signature BLOB NOT NULL,
        priv_signed_prekey BLOB NOT NULL
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
