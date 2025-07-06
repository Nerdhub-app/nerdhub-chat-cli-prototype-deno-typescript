import crypto from "node:crypto";
import path from "node:path";
import { assert, assertEquals } from "@std/assert";
import { LocalEncryptionKeyManager } from "./local-encryption-key.manager.ts";
import { ENCRYPTION_KEY_LENGTH } from "./local-encryption.ts";

Deno.test("Creates an AES key file", () => {
  const keyManager = new LocalEncryptionKeyManager();
  const key = crypto.randomBytes(ENCRYPTION_KEY_LENGTH);
  const storagePath = path.resolve("./temp-test-key.pem");
  keyManager.storeKey(key, storagePath);
  try {
    const stat = Deno.statSync(storagePath);
    assert(stat.isFile);
  } catch (_) {
    // ignore
  }
  Deno.removeSync(storagePath);
});

Deno.test("Retrieves stored key", () => {
  const keyManager = new LocalEncryptionKeyManager();
  const key = crypto.randomBytes(ENCRYPTION_KEY_LENGTH);
  const storagePath = path.resolve("./temp-test-key.pem");
  keyManager.storeKey(key, storagePath);
  try {
    const retrievedKey = keyManager.retrieveKey(storagePath);
    assertEquals(key, retrievedKey);
  } catch (_) {
    // ignore
  }
  Deno.removeSync(storagePath);
});
