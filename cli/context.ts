import type { Buffer } from "node:buffer";
import { generateDeviceHash } from "./helpers/device-id.helper.ts";
import type { E2EEParticipant, User } from "./cli.d.ts";

export const DEFAULT_SERVER_PORT = 8000;
export const DEFAULT_SERVER_HOST = "http://localhost";
export const DEFAULT_SERVER_URL =
  `${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}`;

export type CLIContextPreKeyBundle = {
  identityKey: [Buffer, Buffer];
  signedPreKey: [Buffer, Buffer];
  signedPreKeySignature: Buffer;
};

export type CLIContextOnetimePreKey = {
  id: string;
  keyPair: [Buffer, Buffer];
};

export type CLIContext =
  & {
    serverURL: string;
    get apiURL(): string;
    deviceHash: string;
    localEncryptionKey: Buffer | null;
  }
  & (
    | {
      isAuthenticated: true;
      user: User;
      jwt: string;
      e2eeParticipant: E2EEParticipant | null;
      prekeyBundle: CLIContextPreKeyBundle | null;
    }
    | {
      isAuthenticated: false;
      user: null;
      jwt: null;
      e2eeParticipant: null;
      e2eeIsReady: false;
      prekeyBundle: null;
    }
  );

export const cliContext: CLIContext = {
  serverURL: DEFAULT_SERVER_URL,
  get apiURL() {
    return `${this.serverURL}/api`;
  },
  deviceHash: generateDeviceHash(),
  isAuthenticated: false,
  localEncryptionKey: null,
  user: null,
  e2eeParticipant: null,
  jwt: null,
  e2eeIsReady: false,
  prekeyBundle: null,
};
