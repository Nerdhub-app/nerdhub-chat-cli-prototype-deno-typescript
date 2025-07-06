import { assertEquals } from "@std/assert";
import crypto from "node:crypto";
import { cliContext } from "../context.ts";
import { db, initDatabase } from "../database/db.connection.ts";
import { runMigrations, runMigrationsDown } from "../database/migrations.ts";
import OnetimePreKeyService, {
  ONETIME_PREKEYS_UPLOAD_BATCH_SIZE,
} from "./onetime-prekey.service.ts";
import OnetimePreKeyRepository, {
  type CreateOnetimePreKeyDTO,
} from "../repository/e2ee-participant-onetime-prekeys.repository.ts";
import { PreKeyBundleFactory, XEdDSA } from "@scope/primitives";
import { ENCRYPTION_KEY_LENGTH } from "./local-encryption.service.ts";

const onetimePreKeyService = new OnetimePreKeyService();

Deno.test("Replenishes the one-time prekeys of the authenticated user if below the threshold", () => {
  cliContext.isAuthenticated = true;
  cliContext.user = {
    id: "12sd1qfs2dqf1sdf",
    firstName: "Tolotra",
    lastName: "Rabefaly",
    email: "tolotor@yahoo.fr",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  cliContext.e2eeParticipant = {
    id: "dsfdsfdsfdsfsdfsd",
    userId: "qgfdgsfdgdfgsdfgsdfg",
    deviceId: "fsfggdgdfsgsdfgsdfgsdfgsdfg",
    pubIdentityKey: "dsdsfsdfsdgsfgdggfggdf",
    pubSignedPreKey: "dsdsfsdfsdgsfgdggfggdf",
    signedPreKeySignature: "dsdsfsdfsdgsfgdggfggdf",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  cliContext.localEncryptionKey = crypto.randomBytes(ENCRYPTION_KEY_LENGTH);

  initDatabase({
    isLocal: false,
    path: ":memory:",
  });

  runMigrations(db, true);

  const xEdDSA = new XEdDSA();
  const prekeyBundleFactory = new PreKeyBundleFactory(xEdDSA);
  const ONETIME_PREKEYS_SEED_COUNT = 5;
  const onetimePreKeys = prekeyBundleFactory.createManyOneTimePreKeys(
    ONETIME_PREKEYS_SEED_COUNT,
  );

  const oneTimePreKeysDTO = onetimePreKeys.map<CreateOnetimePreKeyDTO>(
    (opk) => {
      if (!cliContext.isAuthenticated || !cliContext.e2eeParticipant) {
        throw new Error(
          "The e2ee participant must be set before filling the one-time prekeys",
        );
      }
      return {
        id: opk.id,
        participantId: cliContext.e2eeParticipant.id,
        userId: cliContext.user?.id,
        privKey: opk.keyPair[0],
        pubKey: opk.keyPair[1],
      };
    },
  );
  OnetimePreKeyRepository.createMany(oneTimePreKeysDTO);

  onetimePreKeyService.replenishOnetimePreKeysIfBelowThreshold();

  const sql = `
  SELECT COUNT(*) as count
  FROM e2ee_participant_onetime_prekeys
  WHERE participant_id = ?
  `;
  const query = db.prepare(sql);
  const result = query.get(cliContext.e2eeParticipant.id) as
    | { count: number }
    | undefined;

  assertEquals(
    result?.count,
    ONETIME_PREKEYS_UPLOAD_BATCH_SIZE + ONETIME_PREKEYS_SEED_COUNT,
  );

  runMigrationsDown(db);

  db.close();
});
