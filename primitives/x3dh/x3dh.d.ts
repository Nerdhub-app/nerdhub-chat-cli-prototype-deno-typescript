import type { Buffer } from "node:buffer";

/**
 * PreKey bundle of an E2EE participant that either contains only the private parts or only the public parts of the keys
 * except for the `signedPreKeySignature` which always represent the same data regardless of the part of the keys being used.
 */
export type OneSidedPreKeyBundle = {
  /**
   * Identity key
   */
  identityKey: Buffer;

  /**
   * Signed prekey
   */
  signedPreKey: Buffer;

  /**
   * Signature of the public part of the signed prekey by the private part of the identity key
   */
  signedPreKeySignature: Buffer;

  /**
   * Optional one-time prekey
   */
  onetimePreKey?: Buffer;
};

/**
 * PreKey bundle of an E2EE participant.
 * Each key is a tuple that contains the private part and the public part of the key pair.
 * [0]: Private key
 * [1]: Public key
 */
export interface PreKeyBundle {
  /**
   * Identity key pair
   */
  identityKey: [Buffer, Buffer];

  /**
   * Signed prekey pair
   */
  signedPreKey: [Buffer, Buffer];

  /**
   * Signature of the public part of the signed prekey by the private part of the identity key
   */
  signedPreKeySignature: Buffer;

  /**
   * Optional one-time prekey pair
   */
  onetimePreKey?: [Buffer, Buffer];

  /**
   * Gets a one-sided prekey bundle that either contains only the private parts or only the public parts of the keys.
   *
   * @param part Refers to either the public or the private part of the bundle to be returned.
   */
  toOneSidedPreKeyBundle(part: "private" | "public"): OneSidedPreKeyBundle;
}

/**
 * One-time prekey.
 */
export type OneTimePreKey = {
  /**
   * The id of the one-time prekey
   */
  id: string;

  /**
   * The key pair of one-time prekey.
   * [0]: Private key
   * [1]: Public key
   */
  keyPair: [Buffer, Buffer];
};

/**
 * Signed PreKey bundle generated from a PreKey factory.
 */
export type SignedPreKeyBundle = {
  /**
   * Public key pair of the generated signed PreKey
   * - [0]: Private key
   * - [1]: Public key
   */
  signedPreKey: [Buffer, Buffer];

  /**
   * The signed PreKey signature
   */
  signedPreKeySignature: Buffer;
};

export type PreKeyBundleFactoryParams = {
  onetimePreKey?: [Buffer, Buffer];
};

/**
 * Primitives for a PreKey bundle factory operations.
 */
export interface PreKeyBundleFactoryPrimitives {
  /**
   * Generates a PreKey bundle whose private keys are random Buffers.
   */
  createPreKeyBundle(params?: PreKeyBundleFactoryParams): PreKeyBundle;

  /**
   * Generates a signed PreKey bundle.
   *
   * @param identityKey The private identity key used to sign the public part of the signed prekey
   */
  createSignedPreKeyBundle(identityKey: Buffer): SignedPreKeyBundle;

  /**
   * Generates `@param count` random one-time PreKeys.
   *
   * @param count The count of one-time PreKeys to generate
   */
  createManyOneTimePreKeys(count: number): OneTimePreKey[];
}

/**
 * Primitives for X3DH operations for an E2EE participant.
 */
export interface X3DHPrimitives {
  /**
   * The implemented object should expose the participant's private PreKey bundle.
   */
  preKeyBundle: PreKeyBundle;

  /**
   * The E2EE participant (Initiator) derives a X3DH shared secret with another E2EE participant (Recipient)
   * using the latter's public PreKey bundle.
   *
   * @param ephemeralKey The private ephemeral key of the E2EE participant (Initiator)
   * @param recipientPreKeyBundle The public PreKey bundle of the recipient
   */
  deriveSecretKeyWithRecipient(
    ephemeralKey: Buffer,
    recipientPreKeyBundle: OneSidedPreKeyBundle,
  ): Buffer;

  /**
   * The E2EE participant (Recipient) derives a X3DH shared secret with another E2EE participant (Initiator)
   * using the latter's public identity key and public ephemeral key.
   *
   * @param identityKey The public identity key of the initiator
   * @param ephemeralKey The public ephemeral key of the initiator
   */
  deriveSecretKeyWithInitiator(
    identityKey: Buffer,
    ephemeralKey: Buffer,
  ): Buffer;
}

/**
 * Primitives for the operations related to XEdDSA
 */
export interface XEdDSAPrimitives {
  /**
   * Signs a message using the xEdDSA specification
   *
   * @param message The message to sign
   * @param x25519PrivateKey The raw x25519 private key
   * @return The signature
   */
  sign(message: Buffer, x25519PrivateKey: Buffer): Buffer;

  /**
   * Verifies a XEdDSA signature against the message and a x25519 public key
   *
   * @param signature The signature
   * @param message The message that was signed
   * @param x25519PublicKey The raw x25519 public key
   */
  verify(
    signature: Buffer,
    message: Buffer,
    x25519PublicKey: Buffer,
  ): boolean;
}
