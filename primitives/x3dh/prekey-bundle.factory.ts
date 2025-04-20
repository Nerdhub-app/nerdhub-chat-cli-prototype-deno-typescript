import type { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { ulid } from "@std/ulid";
import type {
  OneTimePreKey,
  PreKeyBundle as IPreKeyBundle,
  PreKeyBundleFactoryParams,
  PreKeyBundleFactoryPrimitives,
  SignedPreKeyBundle,
  XEdDSAPrimitives,
} from "./x3dh.d.ts";
import PreKeyBundle from "./prekey-bundle.ts";

export default class PreKeyBundleFactory
  implements PreKeyBundleFactoryPrimitives {
  #xeddsa!: XEdDSAPrimitives;

  constructor(xeddsa: XEdDSAPrimitives) {
    this.#xeddsa = xeddsa;
  }

  createSignedPreKeyBundle(identityKey: Buffer): SignedPreKeyBundle {
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

  createManyOneTimePreKeys(count = 1): OneTimePreKey[] {
    const oneTimePreKeys: OneTimePreKey[] = [];
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

  createPreKeyBundle(params?: PreKeyBundleFactoryParams): IPreKeyBundle {
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

    return new PreKeyBundle(
      identityKeyPairBuffers,
      signedPreKeyBundle.signedPreKey,
      signedPreKeyBundle.signedPreKeySignature,
      params?.onetimePreKey ?? undefined,
    );
  }
}
