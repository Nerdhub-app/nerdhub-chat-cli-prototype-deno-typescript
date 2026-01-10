import type { Buffer } from "node:buffer";

/**
 * Local encryption key storage facade interface
 */
export interface LocalEncryptionKeyStorage {
  /**
   * Stores a 256-bits encryption locally as a PEM file
   *
   * @param path The local path to the key's PEM file
   */
  storeKey(key: Buffer, path: string): void;

  /**
   * Retrieves a local encryption key from a PEM file
   *
   * @param path The path to the key's local PEM file
   */
  retrieveKey(path: string): Buffer;
}

/**
 * Encryption result by the local encryption key.
 * [0]: The cipher text
 * [1]: The IV (initialization vector)
 */
export type LocalEncryptionResult = [Buffer, Buffer];

/**
 * Local encryption facade interface
 */
export interface LocalEncryption {
  /**
   * The 256-bits encryption key
   */
  get key(): Buffer;
  set key(key: Buffer);

  /**
   * Encrypts a buffer
   *
   * @param data The buffer to encrypt
   * @return An object containing the encrypted buffer and the initialization vector
   */
  encrypt(data: Buffer): LocalEncryptionResult;

  /**
   * Decrypts a buffer
   *
   * @param encryptionResult The encryption result data to decrypt
   * @return The decrypted buffer
   */
  decrypt(encryptionResult: LocalEncryptionResult): Buffer;
}
