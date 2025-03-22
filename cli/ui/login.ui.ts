import { Confirm, Input } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import type { UserLoginResponseDTO } from "@scope/server/types";
import AuthAPI from "../api/auth.api.ts";
import { cliContext } from "../context.ts";
import { navigate } from "../router/router.ts";
import { bottomActionsUI } from "./common/bottom-action.ui.ts";

export default async function loginUI() {
  console.log("Enter your login credentials:");

  let isSuccess = false;
  while (!isSuccess) {
    const email = await Input.prompt({
      message: "Email?",
    }) as string;
    const password = await Input.prompt({
      message: "Password?",
    }) as string;

    const res = await AuthAPI.login({ email, password });
    if (!res.ok) {
      const body = await res.json() as { message: string };
      console.log(colors.red(`Login failed: ${body.message}`));

      const tryAgain = await Confirm.prompt("Do you want to try again?");
      if (tryAgain) continue;
      else navigate({ name: "Index" });
    }

    isSuccess = true;

    const body = await res.json() as UserLoginResponseDTO;

    console.log("User details:");
    console.table(body.user);
    console.log(`JWT access token: ${colors.green(body.access_token)}`);

    cliContext.isAuthenticated = true;
    cliContext.user = body.user;
    cliContext.e2eeParticipant = body.e2eeParticipant;
    cliContext.jwt = body.access_token;
  }

  await bottomActionsUI();
}
