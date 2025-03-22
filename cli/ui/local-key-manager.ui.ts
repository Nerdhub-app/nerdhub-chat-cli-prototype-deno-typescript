import { Select } from "@cliffy/prompt/select";
import type { RouteName } from "../router/routes.ts";
import { navigate } from "../router/index.ts";

type LocalKeyManagerSubRoutes = Extract<
  "LocalKeyManager.Store" | "LocalKeyManager.Retrieve",
  RouteName
>;

export default async function LocalKeyManagerUI(
  params?: Record<string, string>,
) {
  const navigateTo = await Select.prompt<LocalKeyManagerSubRoutes>({
    message: "Local encryption key manager:",
    options: [
      {
        name: "Store a new key",
        value: "LocalKeyManager.Store",
      },
      {
        name: "Retrieve an existing key",
        value: "LocalKeyManager.Retrieve",
      },
    ],
  }) as LocalKeyManagerSubRoutes;
  navigate({
    name: navigateTo,
    params,
  });
}
