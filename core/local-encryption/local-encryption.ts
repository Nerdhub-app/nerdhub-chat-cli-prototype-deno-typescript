import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import type {
  LocalEncryption,
  LocalEncryptionResult,
} from "./local-encryption.d.ts";
import {
  AES_ALGORITHM,
  IV_BYTES_LENGTH,
} from "./local-encryption.core.const.ts";

export class ConcreteLocalEncryption implements LocalEncryption {
  /**
   * The encryption key
   */
  #key: Buffer;
  get key() {
    return this.#key;
  }
  set key(key: Buffer) {
    this.#key = key;
  }

  constructor(key: Buffer) {
    this.#key = key;
  }

  encrypt(data: Buffer): LocalEncryptionResult {
    const iv = crypto.randomBytes(IV_BYTES_LENGTH);
    const cipher = crypto.createCipheriv(AES_ALGORITHM, this.#key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return [encrypted, iv];
  }

  decrypt(encryptionResult: LocalEncryptionResult): Buffer {
    const [encrypted, iv] = encryptionResult;
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, this.#key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

/**
 * Creates a local encryption instance
 *
 * @param key The encryption key
 * @returns The local encryption instance
 */
export function createLocalEncryption(key: Buffer): LocalEncryption {
  return new ConcreteLocalEncryption(key);
}

export default ConcreteLocalEncryption;
