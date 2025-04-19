import type { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { ulid } from "@std/ulid";
import type {
  FactoryOneTimePreKey,
  FactoryPreKeyBundle,
  FactorySignedPreKeyBundle,
  PreKeyBundleFactoryPrimitives,
} from "./x3dh.d.ts";
import type { XEdDSAPrimitives } from "./x3dh.d.ts";

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
    // The raw private key buffer is the last 32 bytes of the export
    const rawPrivateKeyBuffer = privateKeyBuffer.subarray(-32);
    const publicKeyBuffer = publicKey.export({ type: "spki", format: "der" });
    const signedPreKeySignature = this.#xeddsa.sign(
      identityKey,
      rawPrivateKeyBuffer,
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
    const identityKeyPair = crypto.generateKeyPairSync("x25519");
    const identityKeyPublicBuffer = identityKeyPair.publicKey.export({
      type: "spki",
      format: "der",
    });
    const signedPreKeyBundle = this.createSignedPreKeyBundle(
      identityKeyPublicBuffer,
    );
    return {
      identityKey: [
        identityKeyPair.privateKey.export({ type: "pkcs8", format: "der" }),
        identityKeyPublicBuffer,
      ],
      signedPreKey: signedPreKeyBundle.signedPreKey,
      signedPreKeySignature: signedPreKeyBundle.signedPreKeySignature,
    };
  }
}
