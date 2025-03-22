import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import path from "node:path";

const USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_SALT =
  "some-salt-for-user-based-local-encryption-key-name";

const USER_BASED_LOCAL_ENCRYPTION_KEY_DIR = "/keys";

export function generateLocalEncryptionKeyPemFilePathForUser(
  userId: string,
  participantId: string,
): string {
  const ikm = userId + "-" + participantId;
  const derivedBuffer = crypto.hkdfSync(
    "sha256",
    ikm,
    USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_SALT,
    "",
    32,
  );
  const filename = Buffer.from(derivedBuffer).toString("hex") + ".pem";
  const fullPath = path.join(
    Deno.cwd(),
    USER_BASED_LOCAL_ENCRYPTION_KEY_DIR,
    filename,
  );
  return fullPath;
}
