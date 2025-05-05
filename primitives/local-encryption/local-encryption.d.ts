import type { Buffer } from "node:buffer";

export interface LocalEncryptionKeyManagerPrimitives {
  /**
   * Generates a random 256-bits encryption key as an `Buffer`
   */
  generateKey(): Buffer;

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

export type LocalEncryptionResult = {
  cipher: Buffer;
  iv: Buffer;
  ad: Buffer;
  authTag: Buffer;
};

export interface LocalEncryptionPrimitives {
  /**
   * The 256-bits encryption key
   */
  key: Buffer;

  /**
   * Encrypts a buffer
   *
   * @param data The buffer to encrypt
   * @param ad The associated data
   * @return An object containing the encrypted buffer, the associated data and the initialization vector
   */
  encrypt(data: Buffer, ad: Buffer): LocalEncryptionResult;

  /**
   * Decrypts a buffer
   *
   * @param data The encrypted buffer
   * @param iv The initialization vector
   * @param ad The authentication data
   * @return The decrypted buffer
   */
  decrypt(cipher: Buffer, ad: Buffer, iv: Buffer, authTag: Buffer): Buffer;
}
