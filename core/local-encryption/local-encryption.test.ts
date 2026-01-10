import { assertEquals, assertInstanceOf, assertNotEquals } from "@std/assert";
import { Buffer } from "node:buffer";
import { ConcreteLocalEncryption } from "./local-encryption.ts";

const key = Buffer.from("12345678901234567890123456789012"); // 32 bytes for AES-256

Deno.test("ConcreteLocalEncryption - encrypt", async (t) => {
  const localEncryption = new ConcreteLocalEncryption(key);

  await t.step(
    "should encrypt data returning a result tuple with encrypted buffer and iv",
    () => {
      const data = Buffer.from("test-data");
      const [encrypted, iv] = localEncryption.encrypt(data);

      assertInstanceOf(encrypted, Buffer);
      assertInstanceOf(iv, Buffer);
      // Encrypted data should not be equal to original data
      assertNotEquals(encrypted.toString("hex"), data.toString("hex"));
      // IV length should be 16
      assertEquals(iv.length, 16);
    },
  );

  await t.step(
    "should produce different ciphertexts for the same data due to random IV",
    () => {
      const data = Buffer.from("test-data");
      const [encrypted1, iv1] = localEncryption.encrypt(data);
      const [encrypted2, iv2] = localEncryption.encrypt(data);

      assertNotEquals(iv1.toString("hex"), iv2.toString("hex"));
      assertNotEquals(encrypted1.toString("hex"), encrypted2.toString("hex"));
    },
  );
});

Deno.test("ConcreteLocalEncryption - decrypt", async (t) => {
  const localEncryption = new ConcreteLocalEncryption(key);

  await t.step("should decrypt encrypted data back to original value", () => {
    const data = Buffer.from("another-secret-message");
    const encryptionResult = localEncryption.encrypt(data);
    const decrypted = localEncryption.decrypt(encryptionResult);

    assertEquals(decrypted.toString(), data.toString());
  });

  await t.step("should be able to decrypt empty buffer", () => {
    const data = Buffer.alloc(0);
    const encryptionResult = localEncryption.encrypt(data);
    const decrypted = localEncryption.decrypt(encryptionResult);

    assertEquals(decrypted.length, 0);
    assertEquals(decrypted.toString(), "");
  });
});

Deno.test("ConcreteLocalEncryption - key property", async (t) => {
  await t.step("should allow getting and setting the key", () => {
    const newKey = Buffer.from("09876543210987654321098765432109");
    const instance = new ConcreteLocalEncryption(key);

    assertEquals(instance.key, key);

    instance.key = newKey;
    assertEquals(instance.key, newKey);

    // Verify it uses the new key
    const data = Buffer.from("verify-new-key");
    const encryptionResult = instance.encrypt(data);
    const decrypted = instance.decrypt(encryptionResult);
    assertEquals(decrypted.toString(), data.toString());
  });
});
