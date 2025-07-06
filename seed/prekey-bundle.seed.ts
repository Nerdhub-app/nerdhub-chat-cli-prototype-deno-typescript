import { fileURLToPath as fromFileUrl } from "node:url";
import { dirname, join } from "node:path";
import PreKeyBundleFactory from "../primitives/x3dh/prekey-bundle.factory.ts";
import XEdDSA from "../primitives/x3dh/lib/xeddsa/xeddsa.ts";

// 1. Create an instance of PreKeyBundleFactory
const xeddsa = new XEdDSA();
const preKeyBundleFactory = new PreKeyBundleFactory(xeddsa);

// 2. Create a prekey bundle
const preKeyBundle = preKeyBundleFactory.createPreKeyBundle();
const onetimePreKeys = preKeyBundleFactory.createManyOneTimePreKeys(100);

// 3. Extract keys and signature
const { identityKey, signedPreKey, signedPreKeySignature } = preKeyBundle;

// 4. Convert Buffers to base64 strings
const seedData = {
  pubIdentityKey: identityKey[1].toString("base64"),
  pubSignedPreKey: signedPreKey[1].toString("base64"),
  signedPreKeySignature: signedPreKeySignature.toString("base64"),
  onetimePreKeys: onetimePreKeys.map((opk) => ({
    id: opk.id,
    pubKey: opk.keyPair[1].toString("base64"),
  })),
};

// 5. Write to a JSON file
const __dirname = dirname(fromFileUrl(import.meta.url));
const outputPath = join(__dirname, "data", "prekey-bundle.seed.json");

await Deno.writeTextFile(outputPath, JSON.stringify(seedData, null, 2));

console.log(`Pre-key bundle seed created at: ${outputPath}`);
