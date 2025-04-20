import crypto, { type KeyObject } from "node:crypto";
import { Buffer } from "node:buffer";
import type {
  PreKeyBundle,
  X3DHPrimitives,
  XEdDSAPrimitives,
} from "./x3dh.d.ts";

// X3DH text info
const X3DH_TEXT_INFO = "Nerdhub X3DH Protocol specific info";
// X3DH secret key length
const X3DH_SECRET_KEY_LENGTH = 32;
// X3DH salt
const x3dfHkdfSalt = Buffer.alloc(X3DH_SECRET_KEY_LENGTH, 0x00);

/**
 * Wraps a key buffer inside a key object
 *
 * @param keyBuffer The key buffer
 * @param keyType The type of the key
 * @returns The key object wrapper
 */
function wrapKeyBufferInsideKeyObject(
  keyBuffer: Buffer,
  keyType: "public" | "private",
): KeyObject {
  if (keyType === "private") {
    return crypto.createPrivateKey({
      key: keyBuffer,
      format: "der",
      type: "pkcs8",
    });
  } else {
    return crypto.createPublicKey({
      key: keyBuffer,
      format: "der",
      type: "spki",
    });
  }
}

export default class X3DH implements X3DHPrimitives {
  /**
   * The private parts of the E2EE participant's PreKey bundle
   */
  preKeyBundle!: PreKeyBundle;

  // The XEdDSA dependency for performing XEdDSA operations
  xEdDSA!: XEdDSAPrimitives;

  constructor(preKeyBundle: PreKeyBundle, xEdDSA: XEdDSAPrimitives) {
    this.preKeyBundle = preKeyBundle;
    this.xEdDSA = xEdDSA;
  }

  deriveSecretKeyWithRecipient(
    ephemeralKey: Buffer,
    recipientPreKeyBundle: PreKeyBundle,
  ): Buffer {
    // Verification of the recipient's signed prekey
    const signedPreKeyVerified = this.xEdDSA.verify(
      recipientPreKeyBundle.signedPreKeySignature,
      recipientPreKeyBundle.signedPreKey,
      recipientPreKeyBundle.identityKey.subarray(-32), // Raw public identity key of the recipient
    );
    if (!signedPreKeyVerified) {
      // Abort the protocol when signed prekey verification fails
      throw new SignedPreKeyVerificationFailureException();
    }

    // `KeyObject` wrappers for the keys used in the protocol
    const initiatorPrivateIdentityKey = wrapKeyBufferInsideKeyObject(
      this.preKeyBundle.identityKey,
      "private",
    );
    const initiatorPrivateEphemeralKey = wrapKeyBufferInsideKeyObject(
      ephemeralKey,
      "private",
    );
    const recipientPublicIdentityKey = wrapKeyBufferInsideKeyObject(
      recipientPreKeyBundle.identityKey,
      "public",
    );
    const recipientPublicSignedPreKey = wrapKeyBufferInsideKeyObject(
      recipientPreKeyBundle.signedPreKey,
      "public",
    );

    // The list of DH outputs to derive the final secret key
    const dhOutputs: Buffer[] = [];
    // DH1: DH(<Initiator's private identity key>, <Recipient's public signed prekey>)
    const dh1Secret = crypto.diffieHellman({
      privateKey: initiatorPrivateIdentityKey,
      publicKey: recipientPublicSignedPreKey,
    });
    dhOutputs.push(dh1Secret);
    // DH2: DH(<Initiator's private ephemeral key>, <Recipient's public identity key>)
    const dh2Secret = crypto.diffieHellman({
      privateKey: initiatorPrivateEphemeralKey,
      publicKey: recipientPublicIdentityKey,
    });
    dhOutputs.push(dh2Secret);
    // DH3: DH(<Initiator's private ephemeral key>, <Recipient's public signed prekey>)
    const dh3Secret = crypto.diffieHellman({
      privateKey: initiatorPrivateEphemeralKey,
      publicKey: recipientPublicSignedPreKey,
    });
    dhOutputs.push(dh3Secret);
    // (Optionally) DH4: DH(<Initiator's private ephemeral key>, <Recipient's public one-time prekey>)
    if (recipientPreKeyBundle.onetimePreKey) {
      const recipientPublicOneTimePreKey = wrapKeyBufferInsideKeyObject(
        recipientPreKeyBundle.onetimePreKey,
        "public",
      );
      const dh4Secret = crypto.diffieHellman({
        privateKey: initiatorPrivateEphemeralKey,
        publicKey: recipientPublicOneTimePreKey,
      });
      dhOutputs.push(dh4Secret);
    }

    // Computing the final secret key
    const ikm = Buffer.concat([
      Buffer.alloc(1, 0xFF),
      Buffer.concat(dhOutputs),
    ]);
    const secretKey = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        ikm,
        x3dfHkdfSalt,
        X3DH_TEXT_INFO,
        X3DH_SECRET_KEY_LENGTH,
      ),
    );

    return secretKey;
  }

  deriveSecretKeyWithInitiator(
    identityKey: Buffer,
    ephemeralKey: Buffer,
  ): Buffer {
    // `KeyObject` wrappers for the keys used in the protocol
    const initiatorPublicIdentityKey = wrapKeyBufferInsideKeyObject(
      identityKey,
      "public",
    );
    const initiatorPublicEphemeralKey = wrapKeyBufferInsideKeyObject(
      ephemeralKey,
      "public",
    );
    const recipientPrivateIdentityKey = wrapKeyBufferInsideKeyObject(
      this.preKeyBundle.identityKey,
      "private",
    );
    const recipientPrivateSignedPreKey = wrapKeyBufferInsideKeyObject(
      this.preKeyBundle.signedPreKey,
      "private",
    );

    // The list of DH outputs to derive the final secret key
    const dhOutputs: Buffer[] = [];
    // DH1: DH(<Recipient's private signed prekey>, <Initiator's public identity key>)
    const dh1Secret = crypto.diffieHellman({
      privateKey: recipientPrivateSignedPreKey,
      publicKey: initiatorPublicIdentityKey,
    });
    dhOutputs.push(dh1Secret);
    // DH2: DH(<Recipient's private identity key>, <Initiator's public ephemeral key>)
    const dh2Secret = crypto.diffieHellman({
      privateKey: recipientPrivateIdentityKey,
      publicKey: initiatorPublicEphemeralKey,
    });
    dhOutputs.push(dh2Secret);
    // DH3: DH(<Recipient's private signed prekey>, <Initiator's public ephemeral key>)
    const dh3Secret = crypto.diffieHellman({
      privateKey: recipientPrivateSignedPreKey,
      publicKey: initiatorPublicEphemeralKey,
    });
    dhOutputs.push(dh3Secret);
    // (Optionally) DH4: DH(<Recipient's private one-time prekey>, <Initiator's public ephemeral key>)
    if (this.preKeyBundle.onetimePreKey) {
      const recipientPrivateOneTimePreKey = wrapKeyBufferInsideKeyObject(
        this.preKeyBundle.onetimePreKey,
        "private",
      );
      const dh4Secret = crypto.diffieHellman({
        privateKey: recipientPrivateOneTimePreKey,
        publicKey: initiatorPublicEphemeralKey,
      });
      dhOutputs.push(dh4Secret);
    }

    // Computing the final secret key
    const ikm = Buffer.concat([
      Buffer.alloc(1, 0xFF), // First byte is 0xFF for x25519
      Buffer.concat(dhOutputs),
    ]);
    const secretKey = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        ikm,
        x3dfHkdfSalt,
        X3DH_TEXT_INFO,
        X3DH_SECRET_KEY_LENGTH,
      ),
    );

    return secretKey;
  }
}

/**
 * Thrown when the verification of a signed prekey fails
 */
export class SignedPreKeyVerificationFailureException extends Error {
  constructor() {
    super("Signed PreKey verification failed.");
  }
}
