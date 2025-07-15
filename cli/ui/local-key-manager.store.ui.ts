import crypto from "node:crypto";
import { Confirm, Input, Select } from "@cliffy/prompt";
import { cliContext } from "../context.ts";
import {
  ENCRYPTION_KEY_LENGTH,
  LocalEncryptionKeyManager,
} from "@scope/primitives/local-encryption";
import { colors } from "@cliffy/ansi/colors";
import { bottomActionsUI } from "./common/bottom-action.ui.ts";
import { generateLocalEncryptionKeyPemFilePathForUser } from "../helpers/local-encryption-key.helper.ts";
import { navigate } from "../router/router.ts";
import type { LocalManagerUIParams } from "./local-key-manager.ui.ts";

type LocalEnryptionKeyGenerationMode = "provided" | "user-based";

const localKeyManager = new LocalEncryptionKeyManager();

export default async function localKeyManagerStoreUI(
  params?: LocalManagerUIParams,
) {
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
  console.log();

  let keyPath: string;
  if (cliContext.isAuthenticated && source === "user-based") {
    keyPath = generateLocalEncryptionKeyPemFilePathForUser(
      cliContext.user.id.toString(),
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
    console.log();
  }

  let keyAlreadyExists = false;
  let reuseExistingKeyPrompt = false;
  try {
    keyAlreadyExists = Deno.statSync(keyPath).isFile;
    if (keyAlreadyExists) {
      console.log(
        colors.yellow(
          "A `.pem` file at the corresponding full path already exists.",
        ),
      );
      reuseExistingKeyPrompt = await Confirm.prompt(
        "Do you want to reuse the existing key?",
      );
      console.log();
      if (!reuseExistingKeyPrompt) {
        const warningText =
          "If you choose to override the existing key, the decryption of your current local data is likely going to fail.";
        console.log(colors.yellow(warningText));
        reuseExistingKeyPrompt = !await Confirm.prompt(
          "Do you still want to procede on overriding the existing key",
        );
        console.log();
      }
    }
  } catch (_) {
    // error
  }
  const reuseExistingKey = keyAlreadyExists && reuseExistingKeyPrompt;

  const key = reuseExistingKey
    ? localKeyManager.retrieveKey(keyPath)
    : crypto.randomBytes(ENCRYPTION_KEY_LENGTH);
  cliContext.localEncryptionKey = key;
  if (!reuseExistingKey) {
    localKeyManager.storeKey(key, keyPath);
  }

  const keyFeedbackText = reuseExistingKey
    ? "The local encryption key retrieved."
    : "The local encryption key has been stored.";
  console.log(keyFeedbackText);
  console.log("Full path: " + colors.blue(keyPath));
  console.log("Key (base64): " + colors.green(key.toString("base64")));
  console.log();

  // Navigate back to Chats UI if the local encryption manager UI was redirected from Chats UI
  if (params?.from && params.from === "Chats") {
    navigate({
      name: params.from,
    });
  }

  await bottomActionsUI();
}
