import type { Buffer } from "node:buffer";
import { generateDeviceHash } from "./helpers/device-id.helper.ts";
import type { E2EEParticipant, User } from "./cli.d.ts";

export const DEFAULT_SERVER_PORT = 8000;
export const DEFAULT_SERVER_HOST = "http://localhost";
export const DEFAULT_SERVER_URL =
  `${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}`;

export type CLIContext =
  & {
    serverURL: string;
    deviceHash: string;
    localEncryptionKey: Buffer | null;
  }
  & ({
    isAuthenticated: true;
    user: User;
    e2eeParticipant: E2EEParticipant;
    jwt: string;
  } | {
    isAuthenticated: false;
    user: null;
    e2eeParticipant: null;
    jwt: null;
  });

export const cliContext: CLIContext = {
  serverURL: DEFAULT_SERVER_URL,
  deviceHash: generateDeviceHash(),
  isAuthenticated: false,
  localEncryptionKey: null,
  user: null,
  e2eeParticipant: null,
  jwt: null,
};
