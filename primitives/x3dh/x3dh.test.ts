import { assertEquals } from "@std/assert";
import crypto from "node:crypto";
import type { Buffer } from "node:buffer";
import X3DH from "./x3dh.ts";
import XEdDSA from "./lib/xeddsa/xeddsa.ts";
import PreKeyBundleFactory from "./prekey-bundle.factory.ts";

const xEdDSA = new XEdDSA();

const preKeyBundleFactory = new PreKeyBundleFactory(xEdDSA);

Deno.test("Alice & Bob both derive the same shared secret key through X3DH", () => {
  // Alice's PreKey bundle
  const alicePreKeyBundle = preKeyBundleFactory.createPreKeyBundle();
  const alicePrivatePreKeyBundle = alicePreKeyBundle.toPreKeyBundle("private");
  const alicePublicPreKeyBundle = alicePreKeyBundle.toPreKeyBundle("public");
  // Alice's X3DH instance
  const aliceX3DH = new X3DH(alicePrivatePreKeyBundle, xEdDSA);

  // Alice's ephemeral key
  const aliceEphemeralKeyObjects = crypto.generateKeyPairSync("x25519");
  const aliceEphemeralKeyPair = [
    aliceEphemeralKeyObjects.privateKey.export({
      type: "pkcs8",
      format: "der",
    }),
    aliceEphemeralKeyObjects.publicKey.export({ type: "spki", format: "der" }),
  ] satisfies [Buffer, Buffer];

  // Bob's one-time PreKey
  const [bobOneTimePreKey] = preKeyBundleFactory.createManyOneTimePreKeys();
  // Bob's PreKey bundle
  const bobPreKeyBundle = preKeyBundleFactory.createPreKeyBundle();
  const bobPrivatePreKeyBundle = bobPreKeyBundle.toPreKeyBundle(
    "private",
    bobOneTimePreKey.keyPair[0],
  );
  const bobPublicPreKeyBundle = bobPreKeyBundle.toPreKeyBundle(
    "public",
    bobOneTimePreKey.keyPair[1],
  );
  // Bob's X3DH instance
  const bobX3DH = new X3DH(bobPrivatePreKeyBundle, xEdDSA);

  // Deriving both's secret keys
  const aliceSharedSecret = aliceX3DH.deriveSecretKeyWithRecipient(
    aliceEphemeralKeyPair[0],
    bobPublicPreKeyBundle,
  );
  const bobSharedSecret = bobX3DH.deriveSecretKeyWithInitiator(
    alicePublicPreKeyBundle.identityKey,
    aliceEphemeralKeyPair[1],
  );

  // Both's secret keys should be the same
  assertEquals(aliceSharedSecret, bobSharedSecret);
});
