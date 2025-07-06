import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import path from "node:path";

const USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_SALT =
  "some-salt-for-user-based-local-encryption-key-name";

const USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_INFO =
  "some-info-for-user-based-local-encryption-key-name";

const USER_BASED_LOCAL_ENCRYPTION_KEY_DIR = "/keys";

/**
 * Generates a filename for the local encryption key based on user info
 *
 * @param userId User id
 * @param participantId Participant id
 * @returns The filename
 */
export function generateLocalEncryptionKeyPemFilePathForUser(
  userId: string,
): string {
  const ikm = userId;
  const derivedBuffer = crypto.hkdfSync(
    "sha256",
    ikm,
    USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_SALT,
    USER_BASED_LOCAL_ENCRYPTION_KEY_NAME_INFO,
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
