import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { LocalEncryption } from "@scope/primitives/local-encryption";
import { cliContext } from "../context.ts";

/**
 * AD (Associated Data) helpers
 */

// Salt for the HKDF that derives the AD
const SOME_SALT_FOR_LOCAL_ENCRYPTION_AD =
  "dofihqisfhqsdgfuyqfgueqfyqgfuqdygfhdqsgfhjdsqfggfsdquyfg";

// Text info for the HKDF that derives the AD
const SOME_TEXT_FOR_LOCAL_ENCRYPTION_AD = "some-text-for-local-encryption-ad";

// Encryption operation result
type EncryptedContent = Record<"cipher" | "iv" | "authTag", Buffer>;

// Encryption operation result holding base64 strings instead of Buffer
type EncryptedContentStringified = {
  [Property in keyof EncryptedContent]: string;
};

/**
 * Local encryption service
 */
export default class LocalEncryptionService {
  /**
   * Input Keying Material (IKM) for the AD the local encryption utils.
   * Used to store the last used IKM props data.
   */
  #ikmProps: Record<"userId" | "e2eeParticipantId", string> | null = null;

  /**
   * Getter of `@property #ikmProps`.
   * Makes sure that the IKM is set.
   */
  get ikmProps(): Record<"userId" | "e2eeParticipantId", string> {
    if (!cliContext.isAuthenticated) {
      throw new Error(
        "Cannot derive encryption AD without being authenticated.",
      );
    }
    if (!this.#ikmProps) {
      this.#ikmProps = {
        userId: cliContext.user.id,
        e2eeParticipantId: cliContext.e2eeParticipant.id,
      };
    }
    return this.#ikmProps;
  }

  /**
   * The Associated Data (AD) for the local encryption utils.
   */
  #ad: Buffer | null = null;

  /**
   * Getter for `@property #ad`.
   * Makes sure that the AD is set and the cached AD that is used was derived from the latest IKM.
   */
  get ad() {
    if (!cliContext.isAuthenticated) {
      throw new Error(
        "Cannot derive encryption AD without being authenticated.",
      );
    }
    if (
      !this.ad || this.ikmProps.userId !== cliContext.user?.id ||
      this.ikmProps.e2eeParticipantId !== cliContext.e2eeParticipant?.id
    ) {
      const ikm = `${this.ikmProps.userId}-${this.ikmProps.e2eeParticipantId}`;
      this.#ad = Buffer.from(
        crypto.hkdfSync(
          "sha256",
          ikm,
          SOME_SALT_FOR_LOCAL_ENCRYPTION_AD,
          SOME_TEXT_FOR_LOCAL_ENCRYPTION_AD,
          32,
        ),
      );
      this.#ikmProps = {
        userId: cliContext.user.id,
        e2eeParticipantId: cliContext.e2eeParticipant.id,
      };
    }
    return this.#ad as Buffer;
  }

  /**
   * Local variable to store the last used encryption key by the local encryption utilities `LocalEncryption`.
   * Whenever the local encryption key from the CLI context differ from its value, we update the key of the `LocalEncryption` instance.
   */
  #encryptionKey: Buffer | null = null;

  /**
  //  * Getter of `@property #encryptionKey`.
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
    const { cipher, iv, authTag } = this.localEncryption.encrypt(
      buffer,
      this.ad,
    );
    const stringifiedEncryptedContent: EncryptedContentStringified = {
      cipher: cipher.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
    };
    return Buffer.from(JSON.stringify(stringifiedEncryptedContent), "utf-8");
  }

  /**
   * Decrypts the buffer of an encryption result
   *
   * @param buffer The buffer of an encryption result
   * @returns The original plain text buffer
   */
  decrypt(buffer: Buffer): Buffer {
    const encryptedContentStringified = JSON.parse(
      buffer.toString("utf-8"),
    ) as EncryptedContentStringified;
    const cipher = Buffer.from(encryptedContentStringified.cipher, "base64");
    const iv = Buffer.from(encryptedContentStringified.iv, "base64");
    const authTag = Buffer.from(encryptedContentStringified.authTag, "base64");
    return this.localEncryption.decrypt(cipher, this.ad, iv, authTag);
  }
}
