import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import path from "node:path";
import type { LocalEncryptionKeyManagerPrimitives } from "./local-encryption.d.ts";

const KEY_BYTES_LENGTH = 128;

class LocalEncryptionKeyManager implements LocalEncryptionKeyManagerPrimitives {
  #contentEncoder = new TextEncoder();

  #contentDecoder = new TextDecoder();

  generateKey() {
    return crypto.randomBytes(KEY_BYTES_LENGTH);
  }

  storeKey(key: Buffer, _path: string) {
    const base64Key = key.toString("base64");
    const content = `-----BEGIN AES KEY-----
    ${base64Key}
    -----END AES KEY-----`;
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
      throw new Error("The pem file does not contain a valid AES key format");
    }

    const base64Key = matches[1];
    return Buffer.from(base64Key);
  }
}

export { LocalEncryptionKeyManager };
