import type { Buffer } from "node:buffer";
import type {
  OneSidedPreKeyBundle,
  PreKeyBundle as IPreKeyBundle,
} from "./x3dh.d.ts";

export default class PreKeyBundle implements IPreKeyBundle {
  identityKey!: [Buffer, Buffer];
  signedPreKey!: [Buffer, Buffer];
  signedPreKeySignature!: Buffer;
  onetimePreKey?: [Buffer, Buffer];

  constructor(
    identityKey: [Buffer, Buffer],
    signedPreKey: [Buffer, Buffer],
    signedPreKeySignature: Buffer,
    onetimePreKey?: [Buffer, Buffer],
  ) {
    this.identityKey = identityKey;
    this.signedPreKey = signedPreKey;
    this.signedPreKeySignature = signedPreKeySignature;
    this.onetimePreKey = onetimePreKey;
  }

  toOneSidedPreKeyBundle(part: "private" | "public"): OneSidedPreKeyBundle {
    const i = part === "public" ? 1 : 0;
    const prekeyBundle: OneSidedPreKeyBundle = {
      identityKey: this.identityKey[i],
      signedPreKey: this.signedPreKey[i],
      signedPreKeySignature: this.signedPreKeySignature,
    };
    if (this.onetimePreKey) {
      prekeyBundle.onetimePreKey = this.onetimePreKey[i];
    }
    return prekeyBundle;
  }
}
