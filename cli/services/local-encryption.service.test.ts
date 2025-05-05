import crypto from "node:crypto";
import { assertEquals } from "@std/assert";
import { cliContext } from "../context.ts";
import LocalEncryptionService from "./local-encryption.service.ts";

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
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
cliContext.localEncryptionKey = crypto.randomBytes(32);

Deno.test("Correct encryption and decryption", () => {
  const data = crypto.randomBytes(128);
  const localEncryptionService = new LocalEncryptionService();
  const cipher = localEncryptionService.encrypt(data);
  const decrypted = localEncryptionService.decrypt(cipher);
  assertEquals(data, decrypted);
});
