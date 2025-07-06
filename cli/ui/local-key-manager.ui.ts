import { Select } from "@cliffy/prompt/select";
import { colors } from "@cliffy/ansi/colors";
import type { RouteName } from "../router/routes.ts";
import { navigate } from "../router/index.ts";
import { cliContext } from "../context.ts";

export type LocalManagerUIParams = {
  from?: `Chats${string}` | "Auth";
  message?: string;
};

export default async function LocalKeyManagerUI(
  params?: LocalManagerUIParams,
) {
  if (params?.message) {
    console.log(params.message);
    console.log();
  }

  console.log("Local encryption key manager:");
  console.log();
  if (cliContext.localEncryptionKey) {
    const key = colors.green(cliContext.localEncryptionKey.toString("base64"));
    console.log(`Your current encryption key is: ${key}`);
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
