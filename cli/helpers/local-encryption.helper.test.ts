import crypto from "node:crypto";
import { assertEquals } from "@std/assert";
import { cliContext } from "../context.ts";
import { decryptBuffer, encryptBuffer } from "./local-encryption.helper.ts";

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
  const cipher = encryptBuffer(data);
  const decrypted = decryptBuffer(cipher);
  assertEquals(data, decrypted);
});
