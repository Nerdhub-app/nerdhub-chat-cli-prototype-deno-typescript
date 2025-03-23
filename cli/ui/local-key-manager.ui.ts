import { Select } from "@cliffy/prompt/select";
import { colors } from "@cliffy/ansi/colors";
import type { RouteName } from "../router/routes.ts";
import { navigate } from "../router/index.ts";
import { cliContext } from "../context.ts";

export default async function LocalKeyManagerUI(
  params?: Record<string, string>,
) {
  console.log("Local encryption key manager:");
  console.log();
  if (cliContext.localEncryptionKey) {
    console.log(
      "Your current encryption key is: " +
        cliContext.localEncryptionKey.toString("base64"),
    );
  }
  const navigateTo = await Select.prompt<RouteName>({
    message: "What do you want do?",
    options: [
      {
        name: colors.blue("Store a new key"),
        value: "LocalKeyManager.Store",
      },
      {
        name: colors.blue("Retrieve an existing key"),
        value: "LocalKeyManager.Retrieve",
      },
      {
        name: "Go back to main menu",
        value: "Index",
      },
      {
        name: "Exit",
        value: "Exit",
      },
    ],
  }) as RouteName;
  navigate({
    name: navigateTo,
    params,
  });
}
