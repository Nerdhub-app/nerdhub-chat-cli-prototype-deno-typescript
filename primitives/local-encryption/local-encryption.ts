import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import type {
  LocalEncryptionPrimitives,
  LocalEncryptionResult,
} from "./local-encryption.d.ts";

/**
 * The AES algorithm to use for encryption.
 * AES-CTR because we only need the IV for encryption security for the data storage.
 */
const AES_ALGORITHM = "aes-256-ctr";

/**
 * The length of the encryption key.
 * The length of the encryption key must be 32 bytes (256 bits)
 * because we are using the aes-256-ctr algorithms which requires a key of a length of 256 bits.
 */
export const ENCRYPTION_KEY_LENGTH = 32;

/**
 * Bytes length of the Initialization Vector.
 * aes-256-ctr must be 16 bytes (128 bits) length.
 */
const IV_BYTES_LENGTH = 16;

/**
 * Local encryption utility
 */
class LocalEncryption implements LocalEncryptionPrimitives {
  /**
   * The encryption key
   */
  key: Buffer;

  constructor(key: Buffer) {
    this.key = key;
  }

  encrypt(data: Buffer): LocalEncryptionResult {
    const iv = crypto.randomBytes(IV_BYTES_LENGTH);
    const cipher = crypto.createCipheriv(AES_ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return [encrypted, iv];
  }

  decrypt(encryptionResult: LocalEncryptionResult): Buffer {
    const [encrypted, iv] = encryptionResult;
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, this.key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

export { LocalEncryption };
