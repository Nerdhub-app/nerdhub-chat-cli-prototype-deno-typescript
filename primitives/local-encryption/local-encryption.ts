import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import type {
  LocalEncryptionPrimitives,
  LocalEncryptionResult,
} from "./local-encryption.d.ts";

/**
 * Local encryption utility
 */
class LocalEncryption implements LocalEncryptionPrimitives {
  /**
   * The encryption key
   */
  #key: Buffer;
  /**
   * Getter of `@property #key`
   */
  get key() {
    return this.#key;
  }
  /**
   * Setter of `@property #key`
   */
  set key(key: Buffer) {
    this.#key = key;
  }

  constructor(key: Buffer) {
    this.#key = key;
  }

  encrypt(data: Buffer, ad: Buffer): LocalEncryptionResult {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.#key, iv);
    cipher.setAAD(ad);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { cipher: encrypted, iv, ad, authTag };
  }

  decrypt(cipher: Buffer, ad: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.#key, iv);
    decipher.setAAD(ad);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(cipher), decipher.final()]);
  }
}

export { LocalEncryption };
