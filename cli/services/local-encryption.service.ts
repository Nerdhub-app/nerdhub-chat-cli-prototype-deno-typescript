import { Buffer } from "node:buffer";
import {
  LocalEncryption,
  type LocalEncryptionResult,
} from "@scope/primitives/local-encryption";
import { cliContext } from "../context.ts";

export { ENCRYPTION_KEY_LENGTH } from "@scope/primitives/local-encryption";

/**
 * Encryption operation result holding base64 strings instead of Buffer.
 * [0]: Cipher text
 * [1]: Initialization vector (IV)
 */
type EncryptionResultBase64 = [string, string];

/**
 * Local encryption service
 */
export default class LocalEncryptionService {
  /**
   * Local variable to store the last used encryption key by the local encryption utilities `LocalEncryption`.
   * Whenever the local encryption key from the CLI context differ from its value, we update the key of the `LocalEncryption` instance.
   */
  #encryptionKey: Buffer | null = null;

  /**
   * Getter of `@property #encryptionKey`.
   * Makes sure that the encryption key from the context exists and is in sync.
   */
  private get encryptionKey(): Buffer {
    if (!cliContext.localEncryptionKey) {
      throw new Error(
        "Cannot encrypt object without local encryption key in the context.",
      );
    }
    if (
      !this.#encryptionKey ||
      !this.#encryptionKey.equals(cliContext.localEncryptionKey)
    ) {
      this.#encryptionKey = cliContext.localEncryptionKey;
    }
    return this.#encryptionKey;
  }

  /**
   * The local encryption utils instance.
   */
  #localEncryption: LocalEncryption | null = null;

  /**
   * Getter of `@property #localEncryption`.
   * Makes sure that the local encryption key of the local encryption utils is in sync with `@property #encryptionKey`
   */
  private get localEncryption(): LocalEncryption {
    if (!this.#localEncryption) {
      this.#localEncryption = new LocalEncryption(this.encryptionKey);
    }
    this.#localEncryption.key = this.encryptionKey;
    return this.#localEncryption;
  }

  /**
   * Encrypts a buffer
   *
   * @param buffer The buffer to encrypt
   * @returns The buffer of the encryption JSONified result
   */
  encrypt(buffer: Buffer): Buffer {
    const [encrypted, iv] = this.localEncryption.encrypt(
      buffer,
    );
    const stringifiedEncryptionResult: EncryptionResultBase64 = [
      encrypted.toString("base64"),
      iv.toString("base64"),
    ];
    return Buffer.from(JSON.stringify(stringifiedEncryptionResult), "utf-8");
  }

  /**
   * Decrypts the buffer of an encryption result
   *
   * @param buffer The buffer of an encryption result
   * @returns The original plain text buffer
   */
  decrypt(buffer: Buffer): Buffer {
    const encryptionResultStringified = JSON.parse(
      buffer.toString("utf-8"),
    ) as EncryptionResultBase64;
    const [encryptedStringified, ivStringified] = encryptionResultStringified;
    const encryptionResult: LocalEncryptionResult = [
      Buffer.from(encryptedStringified, "base64"),
      Buffer.from(ivStringified, "base64"),
    ];
    return this.localEncryption.decrypt(encryptionResult);
  }
}
