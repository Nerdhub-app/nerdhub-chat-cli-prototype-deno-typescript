import { colors } from "@cliffy/ansi/colors";
import { Select } from "@cliffy/prompt/select";
import type { RouteName } from "../router/routes.ts";
import { cliContext } from "../context.ts";
import { navigate } from "../router/router.ts";

export default async function indexUI() {
  if (cliContext.isAuthenticated) {
    const fullName = `${cliContext.user.firstName} ${cliContext.user.lastName}`;
    console.log(`Welcome back ${colors.blue(fullName)}!`);
  }

  const navigateTo = await Select.prompt<RouteName>({
    message: "Main menu:",
    options: [
      {
        name: "Register",
        value: "Register",
        disabled: cliContext.isAuthenticated,
      },
      { name: "Login", value: "Login", disabled: cliContext.isAuthenticated },
      { name: "Local encryption key manager", value: "LocalKeyManager" },
      { name: "Chat", value: "Chat", disabled: !cliContext.isAuthenticated },
      { name: "Exit", value: "Exit" },
    ],
  }) as RouteName;
  navigate({
    name: navigateTo,
  });
}
