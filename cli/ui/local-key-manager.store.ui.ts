import { Input, Select } from "@cliffy/prompt";
import { cliContext } from "../context.ts";
import { LocalEncryptionKeyManager } from "@scope/primitives/local-encryption";
import { colors } from "@cliffy/ansi/colors";
import { bottomActionsUI } from "./common/bottom-action.ui.ts";
import { generateLocalEncryptionKeyPemFilePathForUser } from "../helpers/local-encryption-key.helper.ts";

type LocalEnryptionKeyGenerationMode = "provided" | "user-based";

const localKeyManager = new LocalEncryptionKeyManager();

export default async function localKeyManagerStoreUI() {
  const source = await Select.prompt<LocalEnryptionKeyGenerationMode>({
    message:
      "How to name the `.pem` file that stores the local encryption key?",
    options: [
      {
        name: "Let the application decide based on my user info",
        value: "user-based",
        disabled: !cliContext.isAuthenticated,
      },
      { name: "Provide my own custom `.pem` filename", value: "provided" },
    ],
  }) as LocalEnryptionKeyGenerationMode;

  let keyPath: string;
  if (cliContext.isAuthenticated && source === "user-based") {
    keyPath = generateLocalEncryptionKeyPemFilePathForUser(
      cliContext.user.id,
      cliContext.e2eeParticipant.id,
    );
  } else {
    keyPath = await Input.prompt({
      message: "Enter the full path to the `.pem` file:",
      validate(value) {
        if (value.length === 0) {
          return "The `.pem` filename is required.";
        }
        const pemFileExtRegExp = /(\.\w+)$/;
        const matches = value.match(pemFileExtRegExp);
        if (matches) {
          const [fileExt] = matches;
          if (fileExt !== ".pem") {
            return "The filename extension must be `.pem` if provided.";
          }
        }
        return true;
      },
      transform(value) {
        if (!value.endsWith(".pem")) {
          return `${value}.pem`;
        }
      },
    });
  }

  const key = localKeyManager.generateKey();
  localKeyManager.storeKey(key, keyPath);
  cliContext.localEncryptionKey = key;

  console.log("The local encryption key has been stored.");
  console.log("Full path: " + colors.blue(keyPath));
  console.log("Key (base64): " + colors.green(key.toString("base64")));

  await bottomActionsUI();
}
