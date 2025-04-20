import type { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { ulid } from "@std/ulid";
import type {
  FactoryOneTimePreKey,
  FactoryPreKeyBundle as IFactoryPreKeyBundle,
  FactorySignedPreKeyBundle,
  PreKeyBundle,
  PreKeyBundleFactoryPrimitives,
} from "./x3dh.d.ts";
import type { XEdDSAPrimitives } from "./x3dh.d.ts";

class FactoryPreKeyBundle implements IFactoryPreKeyBundle {
  identityKey!: [Buffer, Buffer];
  signedPreKey!: [Buffer, Buffer];
  signedPreKeySignature!: Buffer;

  constructor(
    identityKey: [Buffer, Buffer],
    signedPreKey: [Buffer, Buffer],
    signedPreKeySignature: Buffer,
  ) {
    this.identityKey = identityKey;
    this.signedPreKey = signedPreKey;
    this.signedPreKeySignature = signedPreKeySignature;
  }

  toPreKeyBundle(
    part: "public" | "private",
    onetimePreKey?: Buffer,
  ): PreKeyBundle {
    const i = part === "public" ? 1 : 0;
    const prekeyBundle: PreKeyBundle = {
      identityKey: this.identityKey[i],
      signedPreKey: this.signedPreKey[i],
      signedPreKeySignature: this.signedPreKeySignature,
    };
    if (onetimePreKey) {
      prekeyBundle.onetimePreKey = onetimePreKey;
    }
    return prekeyBundle;
  }
}

export default class PreKeyBundleFactory
  implements PreKeyBundleFactoryPrimitives {
  #xeddsa!: XEdDSAPrimitives;

  constructor(xeddsa: XEdDSAPrimitives) {
    this.#xeddsa = xeddsa;
  }

  createSignedPreKeyBundle(identityKey: Buffer): FactorySignedPreKeyBundle {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519");
    const privateKeyBuffer = privateKey.export({
      type: "pkcs8",
      format: "der",
    });
    const publicKeyBuffer = publicKey.export({ type: "spki", format: "der" });

    // The raw private key buffer is the last 32 bytes of the pkcs8 encoded identity key
    const rawPrivateIdentityKey = identityKey.subarray(-32);

    // Signature of the public key part of the signed prekey with the private part of the identity key
    const signedPreKeySignature = this.#xeddsa.sign(
      publicKeyBuffer,
      rawPrivateIdentityKey,
    );

    return {
      signedPreKey: [privateKeyBuffer, publicKeyBuffer],
      signedPreKeySignature,
    };
  }

  createManyOneTimePreKeys(count = 1): FactoryOneTimePreKey[] {
    const oneTimePreKeys: FactoryOneTimePreKey[] = [];
    for (let i = 0; i < count; i++) {
      const id = ulid();
      const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519");
      oneTimePreKeys.push({
        id,
        keyPair: [
          privateKey.export({ type: "pkcs8", format: "der" }),
          publicKey.export({ type: "spki", format: "der" }),
        ],
      });
    }
    return oneTimePreKeys;
  }

  createPreKeyBundle(): FactoryPreKeyBundle {
    // Identity key pair
    const identityKeyPair = crypto.generateKeyPairSync("x25519");
    const privateIdentityKeyBuffer = identityKeyPair.privateKey.export({
      type: "pkcs8",
      format: "der",
    });
    const publicIdentityKeyBuffer = identityKeyPair.publicKey.export({
      type: "spki",
      format: "der",
    });
    const identityKeyPairBuffers = [
      privateIdentityKeyBuffer,
      publicIdentityKeyBuffer,
    ] satisfies [Buffer, Buffer];

    // Signed PreKey bundle
    const signedPreKeyBundle = this.createSignedPreKeyBundle(
      privateIdentityKeyBuffer,
    );

    return new FactoryPreKeyBundle(
      identityKeyPairBuffers,
      signedPreKeyBundle.signedPreKey,
      signedPreKeyBundle.signedPreKeySignature,
    );
  }
}
