import { assert } from "@std/assert";
import type { Buffer } from "node:buffer";
import { generateKeyPairSync, type KeyObject, randomBytes } from "node:crypto";
import XEdDSA from "./xeddsa.ts";

const xeddsa = new XEdDSA();

/**
 * Converts a key object to a raw key buffer
 *
 * @param keyObject The key object
 * @param type The type of the export
 * @returns The raw key buffer
 */
function convertKeyObjectToRawKeyBuffer(
  keyObject: KeyObject,
  type: "pkcs8" | "spki",
): Buffer {
  // The last 32 bytes of the export is the raw key
  return keyObject.export({ type, format: "der" })
    .subarray(-32);
}

Deno.test("XEdDSA signature and verification succeeds", () => {
  const { privateKey, publicKey } = generateKeyPairSync("x25519");
  const rawPrivateKey = convertKeyObjectToRawKeyBuffer(privateKey, "pkcs8");
  const rawPublicKey = convertKeyObjectToRawKeyBuffer(publicKey, "spki");
  const message = randomBytes(128);
  const signature = xeddsa.sign(message, rawPrivateKey);
  const verified = xeddsa.verify(signature, message, rawPublicKey);
  assert(verified);
});
