import { Buffer } from "node:buffer";
import path from "node:path";
import type { LocalEncryptionKeyStorage } from "./local-encryption.d.ts";

/**
 * Error thrown when a local encryption key is not found
 */
class LocalEncryptionKeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ConcreteLocalEncryptionKeyStorage
  implements LocalEncryptionKeyStorage {
  #contentEncoder = new TextEncoder();

  #contentDecoder = new TextDecoder();

  storeKey(key: Buffer, _path: string) {
    const base64Key = key.toString("base64");
    const content = `-----BEGIN AES KEY-----\n` + base64Key +
      `\n-----END AES KEY-----`;
    const storagePath = path.resolve(_path);
    Deno.writeFileSync(storagePath, this.#contentEncoder.encode(content));
  }

  retrieveKey(_path: string): Buffer {
    const storagePath = path.resolve(_path);
    const content = this.#contentDecoder.decode(Deno.readFileSync(storagePath));

    const pemFormat =
      /-----BEGIN AES KEY-----\n([\s\S]+)\n-----END AES KEY-----/;
    const matches = content.match(pemFormat);
    if (!matches) {
      throw new LocalEncryptionKeyNotFoundError(
        "The pem file does not contain a valid AES key format",
      );
    }

    const base64Key = matches[1];
    return Buffer.from(base64Key, "base64");
  }
}

/**
 * Creates a local encryption key storage instance
 *
 * @returns The local encryption key storage instance
 */
export function createLocalEncryptionKeyStorage(): LocalEncryptionKeyStorage {
  return new ConcreteLocalEncryptionKeyStorage();
}

export default ConcreteLocalEncryptionKeyStorage;
