import { generateDeviceId } from "./helpers/device-id.helper.ts";
import type { User } from "./cli.d.ts";

export const DEFAULT_SERVER_PORT = 8000;
export const DEFAULT_SERVER_HOST = "http://localhost";
export const DEFAULT_SERVER_URL =
  `${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}`;

export type CLIContext =
  & {
    serverURL: string;
    deviceId: string;
  }
  & ({
    isAuthenticated: true;
    user: User;
    jwt: string;
  } | {
    isAuthenticated: false;
    user: null;
    jwt: null;
  });

export const cliContext: CLIContext = {
  serverURL: DEFAULT_SERVER_URL,
  deviceId: generateDeviceId(),
  isAuthenticated: false,
  user: null,
  jwt: null,
};
