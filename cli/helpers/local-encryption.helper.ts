import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { LocalEncryptionService } from "@scope/primitives/local-encryption";
import { cliContext } from "../context.ts";

/**
 * AD (Associated Data) helpers
 */

// Salt for the HKDF that derives the AD
const SOME_SALT_FOR_LOCAL_ENCRYPTION_AD =
  "dofihqisfhqsdgfuyqfgueqfyqgfuqdygfhdqsgfhjdsqfggfsdquyfg";

// User-specific data that is used as discriminant
// to ensure that we only generate an AD only when the user-specific data change
const ikmProps: Record<"userId" | "e2eeParticipantId", string | null> = {
  userId: null,
  e2eeParticipantId: null,
};
// The AD
let ad: Buffer | null = null;

function deriveEncryptionAD(): Buffer {
  if (!cliContext.isAuthenticated) {
    throw new Error("Cannot derive encryption AD without being authenticated.");
  }
  if (
    !ad ||
    (ikmProps.userId !== cliContext.user.id ||
      ikmProps.e2eeParticipantId === cliContext.e2eeParticipant.id)
  ) {
    const ikm = `${cliContext.user.id}-${cliContext.e2eeParticipant.id}`;
    ad = Buffer.from(
      crypto.hkdfSync("sha256", ikm, SOME_SALT_FOR_LOCAL_ENCRYPTION_AD, "", 32),
    );
  }
  ikmProps.userId = cliContext.user.id;
  ikmProps.e2eeParticipantId = cliContext.e2eeParticipant.id;
  return ad;
}

/* **** */

/**
 * Local encryption service injection helpers *************
 */

// The result from an encryption operation
type EncryptedContent = Record<"cipher" | "iv" | "authTag", Buffer>;
// The previous result holding base64 strings instead of Buffer
type EncryptedContentStringified = {
  [Property in keyof EncryptedContent]: string;
};

// The encryption key to use as a discriminant
// in order to instanciate a new `LocalEncryptionService`
// only when the encryption key from the context changes.
let key: Buffer | null = null;
// The `LocalEncryptionService` instance
let localEncryptionService: LocalEncryptionService | null = null;

function injectLocalEncryptionService() {
  if (!cliContext.localEncryptionKey) {
    throw new Error(
      "Cannot encrypt object without local encryption key in the context.",
    );
  }
  if (!localEncryptionService || !key?.equals(cliContext.localEncryptionKey)) {
    localEncryptionService = new LocalEncryptionService(
      cliContext.localEncryptionKey,
    );
  }
  key = cliContext.localEncryptionKey;
  return localEncryptionService;
}

/* **** */

/**
 * Encrypts a buffer
 *
 * @param buffer The buffer to encrypt
 * @returns The buffer of the encryption JSONified result
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const localEncryptionService = injectLocalEncryptionService();
  const ad = deriveEncryptionAD();
  const { cipher, iv, authTag } = localEncryptionService.encrypt(buffer, ad);
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
export function decryptBuffer(buffer: Buffer): Buffer {
  const localEncryptionService = injectLocalEncryptionService();
  const ad = deriveEncryptionAD();
  const encryptedContentStringified = JSON.parse(
    buffer.toString("utf-8"),
  ) as EncryptedContentStringified;
  const cipher = Buffer.from(encryptedContentStringified.cipher, "base64");
  const iv = Buffer.from(encryptedContentStringified.iv, "base64");
  const authTag = Buffer.from(encryptedContentStringified.authTag, "base64");
  return localEncryptionService.decrypt(cipher, ad, iv, authTag);
}
