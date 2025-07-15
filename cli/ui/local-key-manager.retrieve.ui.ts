import path from "node:path";
import { Input, Select, type SelectOption } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import { bottomActionsUI } from "./common/bottom-action.ui.ts";
import { LocalEncryptionKeyManager } from "../../primitives/local-encryption/local-encryption-key.manager.ts";
import { cliContext } from "../context.ts";
import { generateLocalEncryptionKeyPemFilePathForUser } from "../helpers/local-encryption-key.helper.ts";
import { navigate, type RouteName } from "../router/index.ts";
import type { LocalManagerUIParams } from "./local-key-manager.ui.ts";

const localKeyManager = new LocalEncryptionKeyManager();

type LocalEncryptionKeyRetrievalMode = "user-based" | "provided";

type ActionLocalEncryptionKeyNotFound = "retry" | "store" | RouteName;

export default async function localKeyManagerRetrieveUI(
  params?: LocalManagerUIParams,
) {
  const mode = await Select.prompt<LocalEncryptionKeyRetrievalMode>({
    message: "How to retrieve your local encryption key `.pem` file?",
    options: [
      {
        name:
          "Automatically retrieve an existing `.pem` file based on my user info",
        value: "user-based",
        disabled: !cliContext.isAuthenticated,
      },
      { name: "Provide the full path the a `.pem` file", value: "provided" },
    ],
  }) as LocalEncryptionKeyRetrievalMode;
  console.log();

  let keyPath: string = ""; // Assigned an empty string `""` to avoid TS error
  let pemFileExists = false;

  while (!pemFileExists) {
    if (cliContext.isAuthenticated && mode === "user-based") {
      keyPath = generateLocalEncryptionKeyPemFilePathForUser(
        cliContext.user.id.toString(),
      );
    } else {
      keyPath = await Input.prompt({
        message: "Enter the full path to the `.pem` file:",
      });
      keyPath = path.resolve(keyPath);
      console.log();
    }

    try {
      pemFileExists = Deno.statSync(keyPath).isFile;
    } catch (_) {
      // ignore
    }
    if (!pemFileExists) {
      const options: SelectOption<ActionLocalEncryptionKeyNotFound>[] = [
        { name: "Store a new key", value: "store" },
        { name: "Go back to main menu", value: "Index" },
        { name: "Exit", value: "Exit" },
      ];
      if (mode === "provided") {
        options.unshift({ name: "Retry", value: "retry" });
      }
      const action = await Select.prompt<ActionLocalEncryptionKeyNotFound>({
        message: "The `.pem` file is not found. What do you want to?",
        options,
      }) as ActionLocalEncryptionKeyNotFound;
      console.log();
      switch (action) {
        case "store":
          navigate({
            name: "LocalKeyManager.Store",
            params,
          });
          break;
        case "Index":
          navigate({ name: "Index" });
          break;
        case "Exit":
          Deno.exit();
          break;
        default:
          break;
      }
    }
  }

  const key = localKeyManager.retrieveKey(keyPath);
  cliContext.localEncryptionKey = key;

  console.log("The local encryption key retrieved.");
  console.log("Full path: " + colors.blue(keyPath));
  console.log("Key (base64): " + colors.green(key.toString("base64")));
  console.log();

  if (
    params?.from && (params.from.startsWith("Chats") || params.from === "Auth")
  ) {
    const routeName = params.from as RouteName;
    navigate({
      name: routeName,
      params: {
        from: params.from,
      },
    });
  }

  await bottomActionsUI();
}
