import { Select } from "@cliffy/prompt/select";
import { colors } from "@cliffy/ansi/colors";
import type { RouteName } from "../router/routes.ts";
import { navigate } from "../router/index.ts";

export default async function LocalKeyManagerUI(
  params?: Record<string, string>,
) {
  const navigateTo = await Select.prompt<RouteName>({
    message: "Local encryption key manager:",
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
