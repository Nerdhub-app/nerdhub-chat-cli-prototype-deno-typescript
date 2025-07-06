import crypto from "node:crypto";
import { assertEquals } from "@std/assert";
import { cliContext } from "../context.ts";
import LocalEncryptionService, {
  ENCRYPTION_KEY_LENGTH,
} from "./local-encryption.service.ts";

Deno.test("Correct encryption and decryption", () => {
  cliContext.isAuthenticated = true;
  cliContext.user = {
    id: "fdfsdfdsfdssfsdf",
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

  const data = crypto.randomBytes(128);
  const localEncryptionService = new LocalEncryptionService();
  const cipher = localEncryptionService.encrypt(data);
  const decrypted = localEncryptionService.decrypt(cipher);
  assertEquals(data, decrypted);
});
