import { Buffer } from "node:buffer";
import type { XEdDSAPrimitives } from "../../x3dh.d.ts";
import init, { sign, verify } from "./wasm/xeddsa.js";

// Loading WASM
await init();

export class XEdDSA implements XEdDSAPrimitives {
  sign(message: Buffer, x25519PrivateKey: Buffer): Buffer {
    return Buffer.from(
      sign(new Uint8Array(x25519PrivateKey), new Uint8Array(message)),
    );
  }

  verify(signature: Buffer, message: Buffer, x25519PublicKey: Buffer): boolean {
    return verify(
      Buffer.from(x25519PublicKey),
      Buffer.from(message),
      Buffer.from(signature),
    );
  }
}
